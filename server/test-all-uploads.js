const fs = require('fs');
const pdf = require('pdf-parse');

async function testAll() {
    const files = fs.readdirSync('./uploads/');
    for (const f of files) {
        console.log(`Checking ${f}...`);
        try {
            const dataBuffer = fs.readFileSync('./uploads/' + f);
            const data = await pdf(dataBuffer);
            console.log(`- Text Length: ${data.text.trim().length}`);
        } catch (e) {
            console.log(`- Failed: ${e.message}`);
        }
    }
}
testAll();
