const fs = require('fs');
const path = require('path');

const employeesFile = path.join(__dirname, '..', 'backend', 'data', 'employees.json');
const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));

employees.forEach(emp => {
    // 1. Fix "staff" to "Staff"
    if (emp.companies && Array.isArray(emp.companies)) {
        emp.companies.forEach(c => {
            if (c.jobLevel === 'staff') c.jobLevel = 'Staff';
        });
    } else if (emp.jobLevel === 'staff') {
        emp.jobLevel = 'Staff';
    }

    // 2. Assign Role based on IT division
    let isAdmin = false;
    if (emp.companies && Array.isArray(emp.companies)) {
        isAdmin = emp.companies.some(c => c.class === 'IT');
    } else if (emp.class === 'IT') {
        isAdmin = true;
    }
    
    emp.role = isAdmin ? 'administrator' : 'user';
});

fs.writeFileSync(employeesFile, JSON.stringify(employees, null, 2));
console.log('Cleaned up job levels and assigned roles to employees.');
