const fs = require('fs');
const html = fs.readFileSync('gf_response.html', 'utf8');

console.log('HTML Length:', html.length);
const index = html.indexOf('IDR');
if (index !== -1) {
    console.log('Found IDR at index:', index);
    console.log('Surrounding text:', html.substring(index - 200, index + 200));
} else {
    console.log('IDR not found anywhere in the file.');
}
