let projectTable = base.getTable("Project Tracker");
let serviceTypeTable = base.getTable("Service Types");

let projectRecords = await projectTable.selectRecordsAsync();
let serviceRecords = await serviceTypeTable.selectRecordsAsync();

for (let project of projectRecords.records) {
    let linkedServices = project.getCellValue("Service Type");
    if (!linkedServices || linkedServices.length === 0) continue;

    let serviceId = linkedServices[0].id;
    let service = serviceRecords.records.find(s => s.id === serviceId);
    if (!service) continue;

    // Get values from service
    let description = service.getCellValue("Description");
    let contractValueCHF = service.getCellValue("Contract Value - CHF");
    let serviceTypeSelect = service.getCellValue("Service Type");

    // Determine if service is recurring
    let isRecurring = serviceTypeSelect?.name === "Recurring";

    // Log for debugging
    console.log(`🔄 Updating: ${project.name}`);
    console.log(`→ Desc: ${description}`);
    console.log(`→ Contract: ${contractValueCHF}`);
    console.log(`→ Recurring: ${isRecurring}`);

    // Update the project record
    await projectTable.updateRecordAsync(project.id, {
        "Description": description,
        "Contract Value": contractValueCHF,
        "Recurring": isRecurring
    });
}
