require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function simpleUpsert() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    try {
        const id = 'manual-test-' + Date.now();
        console.log('Upserting ID with vectors object:', id);

        // Trying the { vectors: [] } format
        await index.upsert({
            vectors: [{
                id: id,
                values: new Array(3072).fill(0.5),
                metadata: { text: 'Testing persistence' }
            }]
        });

        console.log('Upsert confirmed.');

        const stats = await index.describeIndexStats();
        console.log('Stats:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('FAILED AGAIN:', err.message);

        console.log('Trying array format again...');
        try {
            await index.upsert([{
                id: id + '-arr',
                values: new Array(3072).fill(0.5),
                metadata: { text: 'Testing array' }
            }]);
            console.log('Array format worked!');
        } catch (err2) {
            console.error('ARRAY FORMAT FAILED TOO:', err2.message);
        }
    }
}
simpleUpsert();
