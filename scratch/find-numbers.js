const fs = require('fs');
const html = fs.readFileSync('gf_response.html', 'utf8');

// Let's find any standalone numbers between 14000 and 17000
const regex = /\b1[4567]\d{3}(?:\.\d+)?\b/g;
let match;
const matches = [];
while ((match = regex.exec(html)) !== null) {
    matches.push(match[0]);
}
console.log('Numbers between 14000 and 17000:', [...new Set(matches)]);

// Let's search for "USD" and "IDR" in the same line or nearby
const idx = html.indexOf('USD-IDR');
if (idx !== -1) {
    console.log('USD-IDR found! Surrounding 500 chars:');
    console.log(html.substring(idx - 250, idx + 250));
}
