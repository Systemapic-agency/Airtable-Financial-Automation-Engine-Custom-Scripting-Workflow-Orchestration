let inputConfig = input.config();
let recordId = inputConfig.recordId;

if (!recordId) throw new Error("❌ No record ID received from automation.");

// Tables
let projectTable = base.getTable("Project Tracker");
let expenseTable = base.getTable("Expenses");

// Project record
let projectRecord = await projectTable.selectRecordAsync(recordId);
let projectName = projectRecord.name;
let newCOGS = projectRecord.getCellValue("Project COGS");

if (!newCOGS || isNaN(newCOGS)) {
    console.log("⚠️ Project COGS is missing or invalid.");
    return;
}

let now = new Date();
let currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

let allExpenses = await expenseTable.selectRecordsAsync();

// Filter matching records for the same project
let relatedExpenses = allExpenses.records.filter(r => {
    let project = r.getCellValue("Project")?.[0];
    return project && project.name === projectName;
});

// Check if a record exists for current month
let existingForThisMonth = relatedExpenses.find(r => {
    let date = r.getCellValue("Date");
    if (!date) return false;
    let d = new Date(date);
    let mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return mKey === currentMonthKey;
});

if (existingForThisMonth) {
    // Update existing record for this month
    await expenseTable.updateRecordAsync(existingForThisMonth.id, {
        "Amount": newCOGS
    });
    console.log(`✏️ Updated Expense (same month) for "${projectName}" to ${newCOGS}`);
} else {
    // Find latest past month's amount
    let pastRecords = relatedExpenses
        .filter(r => r.getCellValue("Date"))
        .map(r => ({
            id: r.id,
            date: new Date(r.getCellValue("Date")),
            amount: r.getCellValue("Amount") || 0
        }))
        .sort((a, b) => b.date - a.date);

    let previousAmount = pastRecords.length > 0 ? pastRecords[0].amount : 0;
    let delta = newCOGS - previousAmount;

    if (delta <= 0) {
        console.log("⏭️ No increase detected. Skipping record creation.");
        return;
    }

    // Build new expense record
    let newRecord = {
        "Project": [{ id: projectRecord.id }],
        "Date": now,
        "Amount": delta,
        "Particulars": "Project",
        "Type": { name: "Recurring" }
    };

    // Currency (optional)
    let currency = projectRecord.getCellValue("Select Currency");
    if (currency?.name) {
        newRecord["Currency"] = { name: currency.name };
    }

    // Ex Rates (optional)
    let usdRate = projectRecord.getCellValue("Ex Rate: USD to CHF");
    if (usdRate !== null) newRecord["Ex Rate: USD to CHF"] = usdRate;

    let eurRate = projectRecord.getCellValue("Ex Rate: EUR to CHF");
    if (eurRate !== null) newRecord["Ex Rate: EUR to CHF"] = eurRate;

    await expenseTable.createRecordAsync(newRecord);
    console.log(`✅ Created new Expense for "${projectName}" with amount ${delta}`);
}
