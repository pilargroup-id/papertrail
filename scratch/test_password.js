const bcrypt = require('bcryptjs');

async function test() {
    const hash = '$2y$12$WNFeSW2R/nL/LVVw00MP9uUmaI/dUYQUoSzZdCydcQxqFouVsb9e.';
    const normalizedHash = hash.replace(/^\$2y\$/, '$2a$');
    
    // Let's test a few common passwords
    const commonPasswords = ['test', 'admin', 'password', '123456', '12345678', 'testing', 'testing123'];
    
    console.log('Testing hash:', hash);
    console.log('Normalized hash:', normalizedHash);
    
    for (const pw of commonPasswords) {
        try {
            const matchRaw = await bcrypt.compare(pw, hash);
            console.log(`Raw hash - Password "${pw}":`, matchRaw);
        } catch (e) {
            console.log(`Raw hash - Password "${pw}" failed:`, e.message);
        }
        
        try {
            const matchNorm = await bcrypt.compare(pw, normalizedHash);
            console.log(`Normalized hash - Password "${pw}":`, matchNorm);
        } catch (e) {
            console.log(`Normalized hash - Password "${pw}" failed:`, e.message);
        }
    }
}

test();
