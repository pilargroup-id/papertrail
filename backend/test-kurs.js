const https = require('https');

function getExchangeRateFromGoogle(from, to = 'IDR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.google.com/finance/quote/${from}-${to}`;
        
        function fetchUrl(currentUrl, depth) {
            if (depth > 5) {
                return reject(new Error('Too many redirects'));
            }
            https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        nextUrl = new URL(nextUrl, currentUrl).href;
                    }
                    return fetchUrl(nextUrl, depth + 1);
                }

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const pattern = new RegExp(`"${from}\\s*\\/\\s*${to}",\\s*\\d+\\s*,\\s*null\\s*,\\s*\\[\\s*([\\d.]+)`);
                        const match = data.match(pattern);
                        if (match) {
                            return resolve(parseFloat(match[1]));
                        }
                        
                        const regexClass = /class="YMlKec fxfa3d"[^>]*>([\d,.]+)</;
                        const matchClass = data.match(regexClass);
                        if (matchClass) {
                            const val = parseFloat(matchClass[1].replace(/,/g, ''));
                            return resolve(val);
                        }

                        reject(new Error(`Nilai kurs ${from}/${to} tidak ditemukan di Google Finance`));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        }

        fetchUrl(url, 0);
    });
}

getExchangeRateFromGoogle('USD', 'IDR').then(console.log).catch(console.error);
