const bcrypt = require('bcryptjs');

async function test() {
    const originalHash = '$2y$12$kMUbbSBmzNo5/satKuK3Yu3g2jKTF1ei6J2m89.2FT0JK4og0oC.i';
    const dbHash = '$2b$12$t8MfEQlaMWiQCpXoZ2J2BubvNLLn5IDB4Ph4JUQxyYU5PFneRs0N6';
    
    console.log('Original hash:', originalHash);
    console.log('DB hash:', dbHash);
    try {
        const match = await bcrypt.compare(originalHash, dbHash);
        console.log(`Is DB hash a hash of the original hash?:`, match);
    } catch (e) {
        console.log(`Check failed:`, e.message);
    }
}

test();
