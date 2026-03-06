require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function fixIndex() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';

    try {
        const indexes = await pc.listIndexes();
        const info = (indexes.indexes || []).find(i => i.name === indexName);
        console.log(`Current index: ${indexName}, dimension: ${info?.dimension}`);

        if (info && info.dimension !== 3072) {
            console.log('!!! Dimension Mismatch detected. Index is', info.dimension, 'but Azure model returns 3072.');
            console.log('--- DELETING OLD INDEX ---');
            await pc.deleteIndex(indexName);

            // Wait a few seconds for deletion to register
            console.log('Waiting for index deletion to propagation...');
            await new Promise(r => setTimeout(r, 10000));

            console.log('--- RECREATING INDEX ---');
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
            console.log('Index recreation initiated. Go to your dashboard and re-upload files in 30 seconds.');
        } else if (!info) {
            console.log('Index not found. Creating it.');
            await pc.createIndex({
                name: indexName,
                dimension: 3072,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
        } else {
            console.log('Index dimension is correct (3072). No changes needed.');
        }
    } catch (err) {
        console.error('Fix failed:', err);
    }
}
fixIndex();
