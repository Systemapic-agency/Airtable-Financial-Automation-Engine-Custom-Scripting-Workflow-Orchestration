let expenseTable = base.getTable("Expenses");
let capitalTable = base.getTable("Capital Tracker");

let expenseRecords = await expenseTable.selectRecordsAsync();
let capitalRecords = await capitalTable.selectRecordsAsync();

// Step 1: Group by month and sum CHF values
let monthlyExpenses = {};

for (let record of expenseRecords.records) {
    let month = record.getCellValue("Month Of Expense");
    let amount = record.getCellValue("Expense Amount - CHF") || 0;

    if (month) {
        if (!monthlyExpenses[month]) {
            monthlyExpenses[month] = 0;
        }
        monthlyExpenses[month] += amount;
    }
}

// Step 2: Update Capital Tracker's Total Expense
for (let capRecord of capitalRecords.records) {
    let capMonth = capRecord.getCellValue("Month");
    if (capMonth && monthlyExpenses[capMonth] !== undefined) {
        await capitalTable.updateRecordAsync(capRecord.id, {
            "Total Expense": monthlyExpenses[capMonth]
        });
    }
}
