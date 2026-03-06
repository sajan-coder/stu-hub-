require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testNamespace() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    try {
        const vec = {
            id: 'test-' + Date.now(),
            values: new Array(3072).fill(0.1),
            metadata: { text: 'Hello' }
        };
        console.log('Vec keys:', Object.keys(vec));
        console.log('Values length:', vec.values.length);

        await index.upsert([vec]);
        console.log('Upsert done.');

        const stats = await index.describeIndexStats();
        console.log('Stats:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('ERROR:', err);
    }
}
testNamespace();
