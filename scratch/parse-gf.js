const fs = require('fs');
const html = fs.readFileSync('gf_response.html', 'utf8');

// Let's find any occurrences of numbers in format like "16,000" or similar
// USD-IDR should be around 15,000 - 17,000.
// Let's do a regex search for any 5 digit numbers or formatted numbers like 1X,XXX.XX or similar.
const regex = /\b1[567][.,]\d{3}[.,]\d{2}\b/g;
const matches = html.match(regex);
console.log('Formatted rate matches:', matches);

// Let's also search for any JSON structures or attributes containing quotes around USD-IDR
// e.g. "USD", "IDR"
// Or let's see if we can find any class and the inner HTML around it
// Let's look for YMlKec in the HTML
const ymlkecMatches = [];
const regexYm = /class="[^"]*YMlKec[^"]*"[^>]*>([^<]+)/g;
let my;
while ((my = regexYm.exec(html)) !== null) {
    ymlkecMatches.push(my[1]);
}
console.log('YMlKec matches:', ymlkecMatches.slice(0, 15));

// Let's search for "data-last-price" or similar
const regexAttr = /([\w-]+)="([\d,.]+)"/g;
let ma;
const attrMatches = [];
while ((ma = regexAttr.exec(html)) !== null) {
    if (ma[1].includes('price') || ma[1].includes('rate') || ma[1].includes('value')) {
        attrMatches.push(`${ma[1]}=${ma[2]}`);
    }
}
console.log('Price/rate/value attributes:', attrMatches.slice(0, 15));
