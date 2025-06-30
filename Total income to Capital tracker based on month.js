// Tables
let incomeTable = base.getTable("Income");
let capitalTable = base.getTable("Capital Tracker");

// Get all records
let incomeRecords = await incomeTable.selectRecordsAsync();
let capitalRecords = await capitalTable.selectRecordsAsync();

// Step 1: Group income by month and sum values
let monthlySums = {};

for (let record of incomeRecords.records) {
    let month = record.getCellValue("Income Month");
    let value = record.getCellValue("Contact Value - CHF") || 0;

    if (month) {
        if (!monthlySums[month]) {
            monthlySums[month] = 0;
        }
        monthlySums[month] += value;
    }
}

// Step 2: For each Capital Tracker month, update Total Income
for (let capRecord of capitalRecords.records) {
    let month = capRecord.getCellValue("Month");

    if (month && monthlySums[month] !== undefined) {
        await capitalTable.updateRecordAsync(capRecord.id, {
            "Total Income": monthlySums[month]
        });
    }
}
