// ✅ Get input values from Automation
let inputConfig = input.config();
let rawService = inputConfig.serviceId;  // linked field from Service Type
let projectId = inputConfig.projectId;   // triggered project ID

// 📦 Fetch the Project Name from Project Tracker table
let projectName = "(Unknown Project)";
if (projectId) {
    let projectTable = base.getTable("Project Tracker");
    let projectRecord = await projectTable.selectRecordAsync(projectId);
    if (projectRecord) {
        projectName = projectRecord.name || "(Untitled Project)";
    }
}

// 🧼 Extract service name (from linked record array)
let serviceName = null;

if (Array.isArray(rawService) && rawService.length > 0) {
    serviceName = typeof rawService[0] === 'string'
        ? rawService[0].trim()
        : rawService[0]?.name?.trim();
} else if (typeof rawService === 'string') {
    serviceName = rawService.trim();
}

// ❌ Stop if serviceName is missing
if (!serviceName) {
    throw new Error(`❌ Invalid or missing service name from input. Got: ${JSON.stringify(rawService)}`);
}

// 🖨 Context info
console.log(`📌 Triggered for Project: "${projectName}"`);
console.log(`🔍 Triggered for Service: "${serviceName}"`);

// 📦 Load task template records
let taskTemplateTable = base.getTable("Service Task Templates");
let taskRecords = await taskTemplateTable.selectRecordsAsync();

// 🔍 Filter tasks matching this service
let matchingTasks = taskRecords.records.filter(record => {
    let linkedService = record.getCellValue("Service");

    if (Array.isArray(linkedService)) {
        return linkedService.some(s => s.name?.trim() === serviceName);
    } else if (linkedService?.name) {
        return linkedService.name.trim() === serviceName;
    }

    return false;
});

// 🧩 Load the Task table
let taskTable = base.getTable("Task");

// ✅ Create new tasks in Task table
if (matchingTasks.length === 0) {
    console.log(`⚠️ No tasks found linked to service "${serviceName}"`);
} else {
    console.log(`✅ Found ${matchingTasks.length} task(s) for service "${serviceName}":\n`);

    for (let task of matchingTasks) {
        let taskName = task.getCellValue("Task Name") || "(Untitled)";
        let hours = task.getCellValue("Hours") || null;
        let notes = task.getCellValue("Notes") || "";

        // Log what we’re about to create
        console.log(`🧩 Creating Task: ${taskName}`);
        console.log(`   ⏱ Estimated Hours: ${hours}`);
        console.log(`   🗒 Notes: ${notes}`);

        await taskTable.createRecordAsync({
            "Task Name": taskName,
            "Project": [{ id: projectId }],
            "Status": { name: "Todo" }, // dropdown value must match exactly
            "Task Description": notes,
            "Estimated hours": hours
        });
    }

    console.log(`✅ Created ${matchingTasks.length} new task(s) in the Task table for project "${projectName}".`);
}
