require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testWrite() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    try {
        console.log('Attempting to write dummy vector...');
        // Create a dummy vector of 3072 zeros
        const dummyVector = new Array(3072).fill(0.1);

        await index.upsert([{
            id: 'dummy-1',
            values: dummyVector,
            metadata: { text: 'This is a test vector' }
        }]);

        console.log('Upsert successful. Waiting for stats update...');
        await new Promise(r => setTimeout(r, 5000));

        const stats = await index.describeIndexStats();
        console.log('New stats:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('Write failed:', err);
    }
}
testWrite();
