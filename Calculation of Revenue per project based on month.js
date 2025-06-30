let projectTable = base.getTable("Project Tracker");
let keyMetricsTable = base.getTable("Key Metrics");
let capitalTrackerTable = base.getTable("Capital Tracker");

let projectRecords = await projectTable.selectRecordsAsync();
let keyMetricRecords = await keyMetricsTable.selectRecordsAsync();
let capitalTrackerRecords = await capitalTrackerTable.selectRecordsAsync();

// Clear old values
for (let rec of keyMetricRecords.records) {
    await keyMetricsTable.updateRecordAsync(rec.id, {
        "Avg Revenue per Project": null
    });
}
for (let rec of capitalTrackerRecords.records) {
    await capitalTrackerTable.updateRecordAsync(rec.id, {
        "Avg Revenue per Project": null
    });
}

function formatMonth(date) {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
}

let monthData = {}; // { 'April 2025': { revenue: 0, activeProjects: Set() } }

for (let project of projectRecords.records) {
    let start = project.getCellValue("Start Date");
    let end = project.getCellValue("End Date");
    let revenue = project.getCellValue("Contract Value - CHF");

    if (!start || !end || !revenue) continue;

    let startDate = new Date(start);
    let endDate = new Date(end);
    let totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) continue;

    let current = new Date(startDate);

    while (current <= endDate) {
        let monthKey = formatMonth(current);

        if (!monthData[monthKey]) {
            monthData[monthKey] = { revenue: 0, activeProjects: new Set() };
        }

        // Daily contribution
        let dailyRevenue = revenue / totalDays;
        monthData[monthKey].revenue += dailyRevenue;
        monthData[monthKey].activeProjects.add(project.id);

        current.setDate(current.getDate() + 1);
    }
}

// Now compute and update
for (let [month, data] of Object.entries(monthData)) {
    let avg = data.revenue / data.activeProjects.size;
    avg = Math.round(avg * 100) / 100;

    // Update Key Metrics
    let km = keyMetricRecords.records.find(r => r.getCellValue("Month") === month);
    if (km) {
        await keyMetricsTable.updateRecordAsync(km.id, {
            "Avg Revenue per Project": avg
        });
    }

    // Update Capital Tracker
    let ct = capitalTrackerRecords.records.find(r => r.getCellValue("Month") === month);
    if (ct) {
        await capitalTrackerTable.updateRecordAsync(ct.id, {
            "Avg Revenue per Project": avg
        });
    }
}
