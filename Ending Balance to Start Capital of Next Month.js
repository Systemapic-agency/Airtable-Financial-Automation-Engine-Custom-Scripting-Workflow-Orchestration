let table = base.getTable("Capital Tracker");
let records = await table.selectRecordsAsync();

// Sort records by month
let sorted = [...records.records].sort((a, b) => {
    let dateA = new Date(a.getCellValue("Month"));
    let dateB = new Date(b.getCellValue("Month"));
    return dateA - dateB;
});

// Loop and propagate ending → next starting only if next row is valid
for (let i = 0; i < sorted.length - 1; i++) {
    let current = sorted[i];
    let next = sorted[i + 1];

    let endingBalance = current.getCellValue("Ending Balance");
    if (!endingBalance) continue;

    let nextIncome = next.getCellValue("Total Income") || 0;
    let nextExpense = next.getCellValue("Total Expense") || 0;
    let nextStart = next.getCellValue("Starting Capital");

    // ✅ Copy ending → next starting if next row hasn't been filled yet
    if (!nextStart || nextStart === 0) {
        await table.updateRecordAsync(next.id, {
            "Starting Capital": endingBalance
        });
    }

    // ❌ Stop if next row has both income and expense empty
    if (nextIncome === 0 && nextExpense === 0) {
        break;
    }
}
