const fs = require('fs');
const pdf = require('pdf-parse');

async function testParse() {
    const filename = '054264d199f39c93f839789948c0a061';
    const filepath = './uploads/' + filename;
    try {
        console.log('Testing pdf-parse@1.1.1...');
        const dataBuffer = fs.readFileSync(filepath);
        const data = await pdf(dataBuffer);

        console.log('Text Length:', data.text.length);
        if (data.text.length > 0) {
            console.log('--- FIRST 200 CHARS ---');
            console.log(data.text.substring(0, 200));
        } else {
            console.log('PDF is EMPTY or SCANNED (IMAGE-ONLY).');
        }
    } catch (err) {
        console.error('Parse failed:', err);
    }
}
testParse();
