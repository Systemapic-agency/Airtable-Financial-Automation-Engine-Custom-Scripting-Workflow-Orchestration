let inputConfig = input.config();
let recordId = inputConfig.recordId;

if (!recordId) {
    throw new Error("❌ No record ID received from automation.");
}

let table = base.getTable("Project Tracker");
let record = await table.selectRecordAsync(recordId);

let contractValue = record.getCellValue("Contract Value");
let initialValue = record.getCellValue("Initial Contract Value");

if (initialValue === null || initialValue === 0) {
    if (contractValue !== null && !isNaN(contractValue)) {
        await table.updateRecordAsync(recordId, {
            "Initial Contract Value": contractValue
        });
        console.log(`✅ Initial Contract Value set to ${contractValue}`);
    } else {
        console.log("⚠️ Contract Value is empty or invalid.");
    }
} else {
    console.log("⏭️ Initial Contract Value already exists. No update needed.");
}
