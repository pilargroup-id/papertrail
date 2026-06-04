const mysql = require('mysql2/promise');

const commonConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
};

const frpDb = mysql.createPool({
    ...commonConfig,
    database: process.env.FRP_DB_NAME || process.env.DB_NAME || 'papertrail',
});

const centralDb = mysql.createPool({
    ...commonConfig,
    database: process.env.CENTRAL_DB_NAME || 'pilargroup',
});

// default export: biar kode lama tetap jalan
module.exports = frpDb;

// named export
module.exports.frpDb = frpDb;
module.exports.centralDb = centralDb;