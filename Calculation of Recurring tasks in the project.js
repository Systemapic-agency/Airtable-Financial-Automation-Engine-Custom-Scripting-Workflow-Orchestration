let { actualTriggerTime } = input.config(); // Input variable from Automation trigger
let taskTable = base.getTable("Task");
let allTasks = await taskTable.selectRecordsAsync();

let today = new Date(actualTriggerTime);
today.setHours(0, 0, 0, 0); // Strip time for accurate date match

console.log(`🕒 Triggered on ${today.toDateString()}`);
console.log("🔁 Checking tasks for recurrence...");

for (let task of allTasks.records) {
    let isRecurring = task.getCellValue("Recurring");
    let recurringType = task.getCellValue("Recurring Type")?.name;
    let recurringEnd = task.getCellValue("Recurring End Date");
    let taskRecurringFlag = task.getCellValue("Task Recurring");
    let startDate = task.getCellValue("Start Date");

    if (!isRecurring || !recurringType || !recurringEnd || taskRecurringFlag || !startDate) {
        continue; // Skip if any requirement is missing
    }

    let taskName = task.getCellValue("Task Name");
    let project = task.getCellValue("Project")?.[0];
    let assignee = task.getCellValue("Team Member")?.[0];
    let taskDescription = task.getCellValue("Task Description");

    let start = new Date(startDate);
    let nextDueDate = new Date(start);

    if (recurringType === "Weekly") {
        nextDueDate.setDate(start.getDate() + 7);
    } else if (recurringType === "Monthly") {
        nextDueDate.setMonth(start.getMonth() + 1);
    } else {
        console.log(`⚠️ Unsupported recurrence type for "${taskName}"`);
        continue;
    }

    nextDueDate.setHours(0, 0, 0, 0); // Normalize time

    let end = new Date(recurringEnd);
    end.setHours(0, 0, 0, 0);

    // 🔍 Match today & within end date
    if (nextDueDate.getTime() === today.getTime() && today <= end) {
        // Create the recurring task
        await taskTable.createRecordAsync({
            "Task Name": taskName,
            "Project": project ? [{ id: project.id }] : [],
            "Team Member": assignee ? [{ id: assignee.id }] : [],
            "Task Description": taskDescription || "",
            "Start Date": today,
            "Status": { name: "Todo" },
             "Recurring": true,
            "Task Recurring": false,
            "Recurring Type": { name: recurringType },
            "Recurring End Date": recurringEnd,
            "Estimated hours": estimatedHours || null
        });

        // ✅ Mark original task as already processed
        await taskTable.updateRecordAsync(task.id, {
            "Task Recurring": true
        });

        console.log(`✅ Created recurring task: "${taskName}" → ${today.toDateString()}`);
    }
}
