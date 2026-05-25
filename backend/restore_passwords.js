const mysql = require('mysql2/promise');

async function main() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'frp_db'
    });

    const fatihHash = '$2y$12$kMUbbSBmzNo5/satKuK3Yu3g2jKTF1ei6J2m89.2FT0JK4og0oC.i';
    const testHash = '$2y$12$WNFeSW2R/nL/LVVw00MP9uUmaI/dUYQUoSzZdCydcQxqFouVsb9e.';

    const [r1] = await db.query('UPDATE central_users SET password = ?, updated_at = NOW() WHERE username = "fatih"', [fatihHash]);
    console.log('Restored fatih password:', r1.affectedRows);

    const [r2] = await db.query('UPDATE central_users SET password = ?, updated_at = NOW() WHERE username = "test"', [testHash]);
    console.log('Restored test password:', r2.affectedRows);

    await db.end();
}

main().catch(console.error);
