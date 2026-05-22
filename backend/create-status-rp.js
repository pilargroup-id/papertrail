const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/frp/StatusFRP.jsx', 'utf8');

// Replace FRP references with RP
code = code.replace(/StatusFRP/g, 'StatusRP');
code = code.replace(/FRP/g, 'RP');
code = code.replace(/frp/g, 'rp');
code = code.replace(/Frp/g, 'Rp');
code = code.replace(/\/api\/data\/approval\?view=all/g, '/api/data/rp-approval?view=all');

// Status config
const newConfig = `const STATUS_CONFIG = {
  waiting_manager: { label: 'Menunggu Manager', bg: '#fef9c3', color: '#92400e', icon: 'schedule' },
  division_review: { label: 'Diproses', bg: '#dbeafe', color: '#1e40af', icon: 'autorenew' },
  final_approved:  { label: 'Menunggu Persetujuan', bg: '#e0e7ff', color: '#3730a3', icon: 'gavel' },
  approved:        { label: 'Approved', bg: '#bbf7d0', color: '#166534', icon: 'check_circle' },
  REJECTED:        { label: 'Rejected', bg: '#fecaca', color: '#991b1b', icon: 'cancel' },
  CREATED_FRP:     { label: 'FRP Dibuat', bg: '#d1fae5', color: '#065f46', icon: 'receipt_long' },
}`;

code = code.replace(/const STATUS_CONFIG = \{[\s\S]*?\}/, newConfig);

// Fix total amount parsing for RP items (using estimatedValue and qty)
const rpTotalFunc = `function getRpTotal(rp) {
  if (!rp || !Array.isArray(rp.items)) return 0;
  return rp.items.reduce((s, it) => s + (parseAmount(it.qty) || 1) * parseAmount(it.estimatedValue), 0);
}`;

code = code.replace(/function parseAmount[\s\S]*?\}/, `function parseAmount(amount) {
  return parseInt(String(amount || '0').replace(/\\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}
${rpTotalFunc}`);

code = code.replace(/r\.totalAmount/g, 'getRpTotal(r)');
code = code.replace(/req\.totalAmount/g, 'getRpTotal(req)');
code = code.replace(/item\.totalAmount/g, 'getRpTotal(item)');

// Replace requestedBy (dimintaOleh vs dibuatOleh)
code = code.replace(/dimintaOleh/g, 'dibuatOleh');

// Change rp.vendor to rp.vendorSuggestion since RP doesn't have vendor, only vendorSuggestion
code = code.replace(/r\.vendor/g, 'r.vendorSuggestion');
code = code.replace(/req\.vendor/g, 'req.vendorSuggestion');
code = code.replace(/item\.vendor/g, 'item.vendorSuggestion');

// Remove attachLink logic
code = code.replace(/<div style=\{\{\s*fontSize:\s*'11px',\s*color:\s*'#64748b'\s*\}\}>Attach Link<\/div>[\s\S]*?<\/div>/g, '');

fs.writeFileSync('frontend/src/pages/rp/StatusRP.jsx', code);
