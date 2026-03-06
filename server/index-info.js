require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function stats() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    try {
        const indexes = await pc.listIndexes();
        const info = indexes.indexes.find(i => i.name === indexName);
        console.log(`Index: ${indexName}`);
        console.log(`Dimension: ${info?.dimension}`);
        console.log('--- FULL INFO ---');
        console.log(JSON.stringify(info, null, 2));
    } catch (err) {
        console.error(err);
    }
}
stats();
