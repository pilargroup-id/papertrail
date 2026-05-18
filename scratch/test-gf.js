const https = require('https');

function getExchangeRate(from, to = 'IDR', maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        let url = `https://www.google.com/finance/quote/${from}-${to}`;
        
        function fetchUrl(currentUrl, depth) {
            if (depth > maxRedirects) {
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
                    console.log(`Redirecting to: ${nextUrl}`);
                    return fetchUrl(nextUrl, depth + 1);
                }

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Let's check for the new class or price pattern
                        // In Google Finance, the main exchange rate is inside <div class="YMlKec fxfa3d">16,215.50</div> or data-last-price="..."
                        const regexLastPrice = /data-last-price="([\d.]+)"/;
                        const matchLast = data.match(regexLastPrice);
                        if (matchLast) {
                            return resolve(parseFloat(matchLast[1]));
                        }
                        
                        const regexClass = /class="YMlKec fxfa3d"[^>]*>([\d,.]+)</;
                        const matchClass = data.match(regexClass);
                        if (matchClass) {
                            const val = parseFloat(matchClass[1].replace(/,/g, ''));
                            return resolve(val);
                        }

                        // Let's also look for a generic exchange rate format in scripts or JSON-LD
                        // For example: "currentPrice" or similar
                        const regexPrice2 = /"currentPrice":\s*\{\s*"amount":\s*"([\d.]+)"/;
                        const matchPrice2 = data.match(regexPrice2);
                        if (matchPrice2) {
                            return resolve(parseFloat(matchPrice2[1]));
                        }

                        // Let's also look for YMlKec class without fxfa3d
                        const regexClassGeneric = /class="[^"]*YMlKec[^"]*"[^>]*>([\d,.]+)</g;
                        let matchGen;
                        while ((matchGen = regexClassGeneric.exec(data)) !== null) {
                            // The first one is usually the rate
                            const val = parseFloat(matchGen[1].replace(/,/g, ''));
                            if (!isNaN(val) && val > 0) {
                                return resolve(val);
                            }
                        }

                        require('fs').writeFileSync('gf_response.html', data);
                        reject(new Error('Rate not found in HTML'));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        }

        fetchUrl(url, 0);
    });
}

getExchangeRate('USD').then(rate => {
    console.log('USD rate:', rate);
}).catch(err => {
    console.error('Error:', err);
});
