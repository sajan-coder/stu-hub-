require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkIndex() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    try {
        const indexes = await pc.listIndexes();
        console.log('Existing indexes:', JSON.stringify(indexes, null, 2));

        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const exists = (indexes.indexes || []).some(idx => idx.name === indexName);

        if (!exists) {
            console.log(`Index "${indexName}" not found. Creating it...`);
            await pc.createIndex({
                name: indexName,
                dimension: 3072, // for text-embedding-3-large
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            console.log('Index creation initiated.');
        } else {
            console.log(`Index "${indexName}" found.`);
        }
    } catch (err) {
        console.error('Error checking/creating index:', err);
    }
}

checkIndex();
