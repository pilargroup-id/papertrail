const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../data');

/**
 * Reads and parses a JSON file from the data directory.
 * Strips BOM characters if present.
 */
function readJson(file) {
    return JSON.parse(
        fs.readFileSync(path.join(dataPath, file), 'utf8').replace(/^\uFEFF/, '')
    );
}

/**
 * Writes data as formatted JSON to the data directory.
 */
function writeJson(file, data) {
    fs.writeFileSync(path.join(dataPath, file), JSON.stringify(data, null, 2));
}

module.exports = { readJson, writeJson };
