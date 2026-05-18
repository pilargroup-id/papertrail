const fs = require('fs');
const html = fs.readFileSync('gf_response.html', 'utf8');

function extractRate(html, from, to = 'IDR') {
    const pattern = new RegExp(`"${from}\\s*\\/\\s*${to}",\\s*\\d+\\s*,\\s*null\\s*,\\s*\\[\\s*([\\d.]+)`);
    const match = html.match(pattern);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

const rate = extractRate(html, 'USD', 'IDR');
console.log('Extracted USD-IDR rate:', rate);
