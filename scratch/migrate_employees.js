const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'backend', 'data');
const employeesFile = path.join(dataPath, 'employees.json');

const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

const uniqueEmployees = {};

employees.forEach(emp => {
    const name = emp.fullName;
    if (!uniqueEmployees[name]) {
        uniqueEmployees[name] = {
            fullName: name,
            email: emp.email || '',
            employeeId: emp.employeeId || '',
            companies: []
        };
    }
    
    // Add assignment if not already present
    const exists = uniqueEmployees[name].companies.find(c => c.name === emp.company && c.class === emp.class);
    if (!exists) {
        uniqueEmployees[name].companies.push({
            name: emp.company || 'PT PILAR NIAGA MAKMUR',
            class: emp.class || '',
            jobLevel: emp.jobLevel || 'Staff'
        });
    }
});

const result = Object.values(uniqueEmployees);

fs.writeFileSync(employeesFile, JSON.stringify(result, null, 2));
console.log(`Refactored ${employees.length} entries into ${result.length} unique employees.`);
