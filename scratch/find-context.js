const fs = require('fs');
const html = fs.readFileSync('gf_response.html', 'utf8');

const target = '17657';
const idx = html.indexOf(target);
if (idx !== -1) {
    console.log('Found target at index:', idx);
    console.log('Surrounding 200 chars:');
    console.log(html.substring(idx - 100, idx + 100));
} else {
    console.log('Target not found');
}
