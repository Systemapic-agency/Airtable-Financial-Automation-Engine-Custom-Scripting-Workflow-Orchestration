let inputConfig = input.config();
let recordId = inputConfig.recordId;

if (!recordId) {
    throw new Error("❌ No record ID received from automation.");
}

let projectTable = base.getTable("Project Tracker");
let incomeTable = base.getTable("Income");

let projectRecord = await projectTable.selectRecordAsync(recordId);

let projectName = projectRecord.name;
let contractValue = projectRecord.getCellValue("Contract Value");
let initialContractValue = projectRecord.getCellValue("Initial Contract Value");

if (contractValue == null || isNaN(contractValue)) {
    console.log("⚠️ Contract Value is missing or invalid.");
    return;
}

if (initialContractValue == null || isNaN(initialContractValue)) {
    console.log("⚠️ Initial Contract Value is missing or invalid.");
    return;
}

if (contractValue <= initialContractValue) {
    console.log("⏭️ No update needed. Contract value hasn’t increased.");
    return;
}

let now = new Date();
let thisMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

let incomeRecords = await incomeTable.selectRecordsAsync();

let existingIncome = incomeRecords.records.find(rec => {
    let linkedProject = rec.getCellValue("Project Name")?.[0];
    let incomeDate = rec.getCellValue("Date");
    if (!linkedProject || !incomeDate) return false;

    let incomeMonth = new Date(incomeDate);
    let incomeMonthKey = `${incomeMonth.getFullYear()}-${(incomeMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    return linkedProject.name === projectName && incomeMonthKey === thisMonth;
});

if (existingIncome) {
    await incomeTable.updateRecordAsync(existingIncome.id, {
        "Contract Value": contractValue
    });
    console.log(`✏️ Updated income record for "${projectName}" in current month with full value ${contractValue}`);
} else {
    let newRecord = {
        "Project Name": [{ id: projectRecord.id }],
        "Contract Value": contractValue,
        "Date": now,
        "Particulars": "Project",
        "Type": { name: "Recurring" }
    };

    let client = projectRecord.getCellValue("Client Name");
    if (client && client.length > 0) {
        newRecord["Client Name"] = [{ id: client[0].id }];
    }

    let currency = projectRecord.getCellValue("Select Currency");
    if (currency && currency.name) {
        newRecord["Currency"] = { name: currency.name };
    }

    let usdRate = projectRecord.getCellValue("Ex Rate: USD to CHF");
    if (usdRate !== null) {
        newRecord["Ex Rate: USD to CHF"] = usdRate;
    }

    let eurRate = projectRecord.getCellValue("Ex Rate: EUR to CHF");
    if (eurRate !== null) {
        newRecord["Ex Rate: EUR to CHF"] = eurRate;
    }

    await incomeTable.createRecordAsync(newRecord);
    console.log(`✅ Created new income record for "${projectName}" with value ${contractValue}`);
}
