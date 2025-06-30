let taskTable = base.getTable("Task");
let capacityTable = base.getTable("Team Capacity View");

let tasks = await taskTable.selectRecordsAsync();
let capacities = await capacityTable.selectRecordsAsync();

function getMonday(date) {
    let d = new Date(date);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getSunday(monday) {
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
}

function isSameDate(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

let weekMap = {}; // { [assigneeId_weekStart]: { record, taskIds: Set } }

for (let task of tasks.records) {
    let start = task.getCellValue("Start Date");
    let end = task.getCellValue("End Date");
    let estHours = task.getCellValue("Estimated hours");
    let assignee = task.getCellValue("Team Member");
    let taskId = task.id;
    let taskName = task.name;

    if (!start || !end || !estHours || !Array.isArray(assignee) || assignee.length === 0) continue;

    let assigneeId = assignee[0].id;
    let assigneeName = assignee[0].name;

    let startDate = new Date(start);
    let endDate = new Date(end);

    // Count total working days (Mon–Fri)
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        let day = d.getDay();
        if (day !== 0 && day !== 6) workingDays++;
    }

    // Loop through weeks from start to end
    let currentMonday = getMonday(startDate);
    while (currentMonday <= endDate) {
        let currentSunday = getSunday(currentMonday);
        let weekDays = 0;

        for (let d = new Date(currentMonday); d <= currentSunday; d.setDate(d.getDate() + 1)) {
            if (d >= startDate && d <= endDate && d.getDay() !== 0 && d.getDay() !== 6) {
                weekDays++;
            }
        }

        if (weekDays === 0) {
            currentMonday.setDate(currentMonday.getDate() + 7);
            continue;
        }

        let weekHours = (weekDays / workingDays) * estHours;
        weekHours = Math.round(weekHours * 100) / 100;

        let key = `${assigneeId}_${currentMonday.toISOString().split("T")[0]}`;
        let existingWeek = weekMap[key]?.record;
        let taskIdsSet = weekMap[key]?.taskIds || new Set();

        // If existing record found in memory
        if (existingWeek) {
            let alreadyLinked = taskIdsSet.has(taskId);
            if (alreadyLinked) {
                console.log(`⏭️ Skipping duplicate task "${taskName}" for ${assigneeName} on ${currentMonday.toDateString()}`);
            } else {
                console.log(`🔄 Updating existing week for ${assigneeName} - ${currentMonday.toDateString()} with task "${taskName}"`);

                let prevHours = existingWeek.getCellValue("Assigned Hours") || 0;
                let prevTasksRaw = existingWeek.getCellValue("Task Name");
                let prevTasks = Array.isArray(prevTasksRaw) ? prevTasksRaw : [];

                await capacityTable.updateRecordAsync(existingWeek.id, {
                    "Assigned Hours": prevHours + weekHours,
                    "Task Name": [...prevTasks, { id: taskId }]
                });

                // Update memory
                taskIdsSet.add(taskId);
                weekMap[key].taskIds = taskIdsSet;
            }
        }

        // If no in-memory week record, look it up from Airtable
        else {
            let existing = capacities.records.find(cap =>
                cap.getCellValue("Team Member")?.[0]?.id === assigneeId &&
                isSameDate(new Date(cap.getCellValue("Week Start")), currentMonday)
            );

            if (existing) {
                let prevHours = existing.getCellValue("Assigned Hours") || 0;
                let prevTasksRaw = existing.getCellValue("Task Name");
                let prevTasks = Array.isArray(prevTasksRaw) ? prevTasksRaw : [];

                let alreadyLinked = prevTasks.some(t => t.id === taskId);
                if (alreadyLinked) {
                    console.log(`⏭️ Skipping existing task "${taskName}" for ${assigneeName} on ${currentMonday.toDateString()}`);
                } else {
                    console.log(`🧩 Adding new task "${taskName}" to existing ${assigneeName} - ${currentMonday.toDateString()}`);

                    await capacityTable.updateRecordAsync(existing.id, {
                        "Assigned Hours": prevHours + weekHours,
                        "Task Name": [...prevTasks, { id: taskId }]
                    });
                }

                weekMap[key] = {
                    record: existing,
                    taskIds: new Set(prevTasks.map(t => t.id).concat(alreadyLinked ? [] : [taskId]))
                };
            }

            // No existing record found — create new
            else {
                console.log(`🆕 Creating new record for ${assigneeName} – ${currentMonday.toDateString()} with task "${taskName}"`);

                let newRecordId = await capacityTable.createRecordAsync({
                    "Team Member": [{ id: assigneeId }],
                    "Task Name": [{ id: taskId }],
                    "Week Start": currentMonday,
                    "Week End": getSunday(currentMonday),
                    "Assigned Hours": weekHours,
                    "Name": assigneeName
                });

                weekMap[key] = {
                    record: { id: newRecordId, getCellValue: fieldName => {
                        if (fieldName === "Assigned Hours") return weekHours;
                        if (fieldName === "Task Name") return [{ id: taskId }];
                        return null;
                    }},
                    taskIds: new Set([taskId])
                };
            }
        }

        currentMonday.setDate(currentMonday.getDate() + 7);
    }
}
