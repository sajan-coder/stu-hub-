require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkHost() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    try {
        const desc = await pc.describeIndex(indexName);
        console.log('Index Host:', desc.host);

        const index = pc.index(indexName);
        console.log('Index object created.');

        const stats = await index.describeIndexStats();
        console.log('Stats:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error(err);
    }
}
checkHost();
