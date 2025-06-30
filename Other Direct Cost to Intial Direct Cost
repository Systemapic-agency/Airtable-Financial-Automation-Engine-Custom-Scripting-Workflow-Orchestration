let inputConfig = input.config();
let recordId = inputConfig.recordId;

if (!recordId) {
    throw new Error("❌ No record ID received from automation.");
}

let table = base.getTable("Project Tracker");
let record = await table.selectRecordAsync(recordId);

let otherDirectCost = record.getCellValue("Other Direct Cost - CHF");
let initialOtherDirectCost = record.getCellValue("Initial Other Direct Cost");

if (initialOtherDirectCost === null || initialOtherDirectCost === 0) {
    if (otherDirectCost !== null && !isNaN(otherDirectCost)) {
        await table.updateRecordAsync(recordId, {
            "Initial Other Direct Cost": otherDirectCost
        });
        console.log(`✅ Initial Other Direct Cost set to ${otherDirectCost}`);
    } else {
        console.log("⚠️ Other Direct Cost - CHF is empty or invalid.");
    }
} else {
    console.log("⏭️ Initial Other Direct Cost already exists. No update needed.");
}
