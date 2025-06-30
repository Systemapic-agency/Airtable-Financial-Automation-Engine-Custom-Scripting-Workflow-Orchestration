let table = base.getTable("Project Tracker");
let records = await table.selectRecordsAsync();

// Step 1: Parse input trigger time
let inputConfig = input.config();
let rawTrigger = inputConfig.actualtriggertime;
let triggerDate = new Date(rawTrigger);

if (isNaN(triggerDate)) {
    console.log("❌ Triggered on Invalid Date");
    return;
}

// Remove time from date
let today = new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
console.log(`🕓 Running Recurring Cost Check on ${today.toDateString()}`);

// Step 2: Loop through project records
for (let rec of records.records) {
    let projectName = rec.getCellValue("Project Name") || "Unnamed Project";

    let type = rec.getCellValue("Type")?.name;
    let recurringType = rec.getCellValue("Other Direct Cost Recurring Type")?.name;
    let recurringEnd = rec.getCellValue("Other DC Recurring End Date");
    let startDate = rec.getCellValue("Start Date");
    let initialCost = rec.getCellValue("Initial Other Direct Cost");
    let runningCost = rec.getCellValue("Other Direct Cost - CHF");

    if (
        type !== "Recurring" ||
        !recurringType ||
        !startDate ||
        !recurringEnd ||
        typeof initialCost !== 'number'
    ) {
        console.log(`⚠️ Skipping "${projectName}" → Missing required fields.`);
        continue;
    }

    let start = new Date(startDate);
    let end = new Date(recurringEnd);
    let currentCost = typeof runningCost === 'number' ? runningCost : 0;

    // Step 3: Calculate next recurrence date
    let nextDate = new Date(start);
    let incrementDays = recurringType === "Weekly" ? 7 : 30;

    // Keep adding until nextDate >= today
    while (nextDate < today) {
        nextDate.setDate(nextDate.getDate() + incrementDays);
    }

    console.log(`📁 "${projectName}" → Next due date: ${nextDate.toDateString()} | Today: ${today.toDateString()}`);

    // Step 4: If it's the scheduled day and still within end date
    if (
        nextDate.toDateString() === today.toDateString() &&
        today <= end
    ) {
        let newCost = currentCost + initialCost;
        await table.updateRecordAsync(rec.id, {
            "Other Direct Cost - CHF": newCost
        });

        console.log(`✅ Updated "${projectName}": ${currentCost} + ${initialCost} = ${newCost}`);
    } else {
        console.log(`⏭️ "${projectName}" → Not due today or past end date.`);
    }
}
