let table = base.getTable("Project Tracker");
let records = await table.selectRecordsAsync();

let today = new Date();
console.log(`🕓 Running script on: ${today.toDateString()}`);
console.log("🔍 Checking only recurring projects...\n");

for (let rec of records.records) {
    let name = rec.name;
    let isRecurring = rec.getCellValue("Recurring");
    if (!isRecurring) continue;

    console.log(`📁 Project: "${name}"`);

    // Get required fields
    let recurringType = rec.getCellValueAsString("Recurring Type");
    let endDate = rec.getCellValue("Recurring Income End Date");
    let start = rec.getCellValue("Start Date");
    let initialValue = rec.getCellValue("Initial Contract Value");

    // Validate inputs
    let missingFields = [];
    if (!recurringType) missingFields.push("Recurring Type");
    if (!start) missingFields.push("Start Date");
    if (initialValue === null || isNaN(initialValue)) missingFields.push("Initial Contract Value");

    if (missingFields.length > 0) {
        console.log(`⚠️ Missing field(s): ${missingFields.join(", ")}. Skipping this project.`);
        console.log("-----------------------------------------------------");
        continue;
    }

    let startDate = new Date(start);
    let end = endDate ? new Date(endDate) : null;

    if (end && today > end) {
        console.log(`📆 Recurring End Date (${end.toDateString()}) passed. No further updates.`);
        console.log("-----------------------------------------------------");
        continue;
    }

    // Determine how many intervals (weeks or months) have passed
    let intervalsPassed = 0;
    if (recurringType === "Weekly") {
        let diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        intervalsPassed = Math.floor(diffDays / 7) + 1;
    } else if (recurringType === "Monthly") {
        intervalsPassed = (today.getFullYear() - startDate.getFullYear()) * 12 +
                          (today.getMonth() - startDate.getMonth()) + 1;
    } else {
        console.log(`⚠️ Unsupported Recurring Type: "${recurringType}"`);
        console.log("-----------------------------------------------------");
        continue;
    }

    // Calculate expected contract value
    let newContractValue = initialValue * intervalsPassed;
    let currentValue = rec.getCellValue("Contract Value") || 0;

    if (newContractValue > currentValue) {
        await table.updateRecordAsync(rec.id, {
            "Contract Value": newContractValue
        });
        console.log(`✅ Updated contract value to ${newContractValue} (${intervalsPassed} interval(s))`);
    } else {
        // Determine next expected run
        let nextRunDate = null;
        if (recurringType === "Weekly") {
            nextRunDate = new Date(startDate);
            nextRunDate.setDate(startDate.getDate() + (intervalsPassed * 7));
        } else {
            nextRunDate = new Date(startDate);
            nextRunDate.setMonth(startDate.getMonth() + intervalsPassed);
        }

        console.log(`⏸ No update needed. Next expected run: ${nextRunDate.toDateString()}`);
    }

    console.log("-----------------------------------------------------");
}
