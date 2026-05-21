const fs = require('fs');
const path = require('path');

const companies = {
  'PT PILAR KARGO PERKASA': 'comp-pkp-0001',
  'PT PILAR KARANG SAMUDRA': 'comp-pks-0001',
  'PT PILAR KARANG SAMUDERA': 'comp-pks-0001',
  'PT PILAR NIAGA MAKMUR': 'comp-pnm-0001'
};

const departments = [
  { id: 1, name: 'HCGA', class: 'HCGA' },
  { id: 2, name: 'Legal', class: 'Legal' },
  { id: 3, name: 'GOTO E-Commerce', class: 'GOTO E-Commerce' },
  { id: 4, name: 'Gosave GT', class: 'Gosave GT' },
  { id: 5, name: 'Warehouse GOTO', class: 'Warehouse GOTO' },
  { id: 6, name: 'Warehouse Gosave', class: 'Warehouse Gosave' },
  { id: 7, name: 'Finance', class: 'Finance' },
  { id: 8, name: 'IT', class: 'IT' },
  { id: 9, name: 'Board Of Director', class: 'Board Of Director' },
  { id: 13, name: 'Product', class: 'Product' },
  { id: 14, name: 'Marketing', class: 'Marketing' },
  { id: 15, name: 'GOTO Store', class: 'GOTO Store' },
  { id: 16, name: 'Gosave B2B', class: 'Gosave B2B' },
  { id: 18, name: 'Gosave E-Commerce', class: 'Gosave E-Commerce' },
  { id: 19, name: 'GOTO GT', class: 'GOTO GT' },
  { id: 20, name: 'Pilkada', class: 'Pilkada' },
  { id: 21, name: 'Pikasa', class: 'Pikasa' }
];

function getCompanyId(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  return companies[upper] || null;
}

function getDepartmentId(name) {
  if (!name) return null;
  const found = departments.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  // Try to find if it includes 'Store'
  if (name.toLowerCase().includes('store')) return 15;
  return null;
}

function getClassId(className) {
  if (!className) return null;
  const found = departments.find(d => d.class && d.class.toLowerCase() === className.toLowerCase());
  return found ? found.id : null;
}

// 1. Convert budgets.json
const budgetsPath = path.join(__dirname, '../data/budgets.json');
let budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

budgets = budgets.map(b => {
  const newBudget = { ...b };
  if (b.company) {
    newBudget.companyId = getCompanyId(b.company) || b.company;
    delete newBudget.company;
  }
  if (b.department) {
    newBudget.departmentId = getDepartmentId(b.department) || b.department;
    delete newBudget.department;
  }
  if (b.class) {
    newBudget.classId = getClassId(b.class) || b.class;
    delete newBudget.class;
  }
  return newBudget;
});

fs.writeFileSync(budgetsPath, JSON.stringify(budgets, null, 2));
console.log('Updated budgets.json');
