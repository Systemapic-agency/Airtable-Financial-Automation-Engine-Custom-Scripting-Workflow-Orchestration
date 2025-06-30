let incomeTable = base.getTable("Income");
let incomeRecords = await incomeTable.selectRecordsAsync();
let triggerDate = new Date(input.config().triggerDate);
let triggerMonth = triggerDate.getMonth();
let triggerYear = triggerDate.getFullYear();

console.log(`🟢 Recurring Income Automation started: ${triggerDate.toDateString()}`);

// Helper functions
function addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(date, months) {
    let result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

for (let record of incomeRecords.records) {
    let id = record.id;

    let project = record.getCellValue("Project Name");
    let type = record.getCellValue("Type")?.name;
    let contractValue = record.getCellValue("Contract Value");
    let recurringType = record.getCellValue("Recurring Type")?.name;
    let recurringStart = record.getCellValue("Recurring Start Date");
    let recurringEnd = record.getCellValue("Recurring End Date");
    let initialRecurring = record.getCellValue("Initial Recurring Income");
    let ricChecked = record.getCellValue("RIC");

    if (project !== null || type !== "Recurring" || !recurringType || !recurringStart || !recurringEnd || !contractValue || !initialRecurring || ricChecked) {
        console.log(`❌ "${id}" skipped — project exists or missing fields.`);
        continue;
    }

    console.log(`✅ "${id}" passed validation.`);

    // Calculate next due date based on type
    let startDate = new Date(recurringStart);
    let nextDue = new Date(startDate);

    if (recurringType === "Weekly") {
        nextDue = addDays(startDate, 7);
    } else if (recurringType === "Monthly") {
        nextDue = addMonths(startDate, 1);
    } else {
        console.log(`⚠️ "${id}" skipped — unknown Recurring Type.`);
        continue;
    }

    // Check if due today
    if (nextDue.toDateString() !== triggerDate.toDateString()) {
        console.log(`⏭️ "${id}" not due today. Next due: ${nextDue.toDateString()}`);
        continue;
    }

    // Check if past end date
    let endDate = new Date(recurringEnd);
    if (triggerDate > endDate) {
        console.log(`⛔ "${id}" skipped — past end date.`);
        continue;
    }

    console.log(`📅 "${id}" due today.`);

    // Same or new month check
    let sameMonth = (startDate.getMonth() === triggerMonth && startDate.getFullYear() === triggerYear);

    if (sameMonth) {
        // ✅ Update existing row
        let newValue = (contractValue || 0) + initialRecurring;
        await incomeTable.updateRecordAsync(id, {
            "Contract Value": newValue,
            "Recurring Start Date": triggerDate
        });
        console.log(`✏️ Updated existing row "${id}" → Contract Value: ${newValue}, Start Date: ${triggerDate.toDateString()}`);
    } else {
        // ✅ Mark previous row as completed
        await incomeTable.updateRecordAsync(id, {
            "RIC": true
        });

        // 🆕 Create new row
        let newFields = {
            "Particulars": record.getCellValue("Particulars") || " ",
            "Contract Value": initialRecurring,
            "Type": { name: "Recurring" },
            "Date": triggerDate,
            "Recurring Type": { name: recurringType },
            "Recurring Start Date": triggerDate,
            "Recurring End Date": endDate,
            "Initial Recurring Income": initialRecurring,
            "Currency": record.getCellValue("Currency") || null,
            "Ex Rate: USD to CHF": record.getCellValue("Ex Rate: USD to CHF") || null,
            "Ex Rate: EUR to CHF": record.getCellValue("Ex Rate: EUR to CHF") || null,
            "Client Name": record.getCellValue("Client Name") ? [{ id: record.getCellValue("Client Name")[0].id }] : [],
            "Service": record.getCellValue("Service") ? [{ id: record.getCellValue("Service")[0].id }] : []
        };

        await incomeTable.createRecordAsync(newFields);
        console.log(`➕ Created new income row from "${id}" for new month.`);
    }
}

console.log("✅ Recurring Income Automation completed.");
