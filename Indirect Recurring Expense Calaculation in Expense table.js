let expenseTable = base.getTable("Expenses");
let expenses = await expenseTable.selectRecordsAsync();
let triggerDate = new Date(input.config().triggerDate); // automation input

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

for (let record of expenses.records) {
    let recordId = record.id;
    let project = record.getCellValue("Project");
    let type = record.getCellValue("Type");
    let amount = record.getCellValue("Amount");
    let recurringType = record.getCellValue("Recurring Type");
    let recurringStartDate = record.getCellValue("Recurring Start Date");
    let recurringEndDate = record.getCellValue("Recurring End Date");
    let initialRecurringAmount = record.getCellValue("Initial Recurring Expense Amount");
    let particulars = record.getCellValue("Particulars");

    let isValid =
        !project &&
        type?.name === "Recurring" &&
        typeof amount === "number" &&
        recurringType?.name &&
        recurringStartDate &&
        recurringEndDate &&
        typeof initialRecurringAmount === "number";

    if (!isValid) continue;

    console.log(`✅ Record ${recordId} is valid for recurrence check`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Recurring Type: ${recurringType.name}`);
    console.log(`  Start Date: ${recurringStartDate}`);
    console.log(`  End Date: ${recurringEndDate}`);
    console.log(`  Initial Increment: ${initialRecurringAmount}`);

    let nextDate = recurringType.name === "Weekly"
        ? addDays(new Date(recurringStartDate), 7)
        : addMonths(new Date(recurringStartDate), 1);

    let sameDay = (
        nextDate.getFullYear() === triggerDate.getFullYear() &&
        nextDate.getMonth() === triggerDate.getMonth() &&
        nextDate.getDate() === triggerDate.getDate()
    );

    let endDateObj = new Date(recurringEndDate);
    let beforeEnd = triggerDate <= endDateObj;

    console.log(`  → Next Date: ${nextDate.toDateString()}`);
    console.log(`  → Today Match? ${sameDay}`);
    console.log(`  → Before End? ${beforeEnd}`);

    if (sameDay && beforeEnd) {
        let newAmount = amount + initialRecurringAmount;

        let newMonthKey = `${triggerDate.getFullYear()}-${(triggerDate.getMonth() + 1).toString().padStart(2, '0')}`;
        let oldMonth = new Date(recurringStartDate);
        let oldMonthKey = `${oldMonth.getFullYear()}-${(oldMonth.getMonth() + 1).toString().padStart(2, '0')}`;

        if (newMonthKey === oldMonthKey) {
            await expenseTable.updateRecordAsync(recordId, {
                "Amount": newAmount,
                "Recurring Start Date": nextDate
            });
            console.log(`✏️ Updated record ${recordId} to amount ${newAmount}`);
        } else {
            // Check for duplicate (same Particulars + Date)
            let duplicateExists = expenses.records.some(r => {
                let rDate = r.getCellValue("Date");
                let rParticulars = r.getCellValue("Particulars");

                return rDate &&
                    new Date(rDate).toDateString() === triggerDate.toDateString() &&
                    rParticulars === particulars;
            });

            if (duplicateExists) {
                console.log(`⚠️ Duplicate found — skipping record creation for ${recordId}`);
                continue;
            }

            // Mark old record RIC = true
            await expenseTable.updateRecordAsync(recordId, {
                "RIC": true
            });

            // Create new record
            await expenseTable.createRecordAsync({
                "Particulars": particulars || "Recurring Entry",
                "Amount": initialRecurringAmount,
                "Currency": record.getCellValue("Currency") || null,
                "Type": { name: "Recurring" },
                "Recurring Type": recurringType,
                "Recurring Start Date": triggerDate,
                "Recurring End Date": recurringEndDate,
                "Initial Recurring Expense Amount": initialRecurringAmount,
                "Date": triggerDate,
                "RIC": false
            });

            console.log(`➕ Created new record for ${initialRecurringAmount} from ${recordId}`);
        }
    } else {
        console.log(`⏭️ Skipping recurrence - not today's due or past end.`);
    }
}
