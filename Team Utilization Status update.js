let table = base.getTable("Team Capacity View");
let records = await table.selectRecordsAsync();

for (let record of records.records) {
    let recordId = record.id;
    let utilization = record.getCellValue("Utilization");
    let currentStatus = record.getCellValue("Status")?.name;

    if (utilization === null || isNaN(utilization)) {
        console.log(`⚠️ Skipping ${record.name} — Utilization not set or invalid.`);
        continue;
    }

    // 🔁 Convert decimal to actual percentage
    let percent = utilization * 100;
    let newStatus = null;

    // 🧠 Match your defined dropdown options exactly
    if (percent < 30) {
        newStatus = "Less then 30%";
    } else if (percent > 100) {
        newStatus = "More than 100%";
    } else if (percent >= 40 && percent <= 60) {
        newStatus = "between 40-60%";
    } else if (percent > 60 && percent <= 99.99) {
        newStatus = "Between 60 - 99%";
    }

    // ✅ Only update if the new status differs
    if (newStatus && newStatus !== currentStatus) {
        await table.updateRecordAsync(recordId, {
            "Status": { name: newStatus }
        });
        console.log(`🔄 Updated "${record.name}" → ${percent.toFixed(2)}% → ${newStatus}`);
    } else {
        console.log(`ℹ️ No update needed for "${record.name}" → ${percent.toFixed(2)}%`);
    }
}
