const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
    keyFilename: path.resolve(__dirname, '../../credentials/even-gearbox-255203-10881c36321f.json'),
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME || 'papertrail-files-active');

module.exports = { storage, bucket };