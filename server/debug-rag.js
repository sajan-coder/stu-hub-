require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { AzureOpenAI } = require('openai');

async function debugRAG() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    try {
        console.log('--- PINECONE STATS ---');
        const stats = await index.describeIndexStats();
        console.log(JSON.stringify(stats, null, 2));

        if (stats.totalRecordCount === 0) {
            console.log('!!! WARNING: Index is empty. Uploads are failing or not committing.');
        } else {
            console.log('Index has data. Testing retrieval logic...');

            const azureClient = new AzureOpenAI({
                apiKey: process.env.AZURE_OPENAI_API_KEY,
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiVersion: process.env.AZURE_OPENAI_API_VERSION,
            });

            const testQuery = "What is this file about?";
            const emb = await azureClient.embeddings.create({
                model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
                input: testQuery
            });

            console.log('Query embedding dimension:', emb.data[0].embedding.length);

            const result = await index.query({
                vector: emb.data[0].embedding,
                topK: 1,
                includeMetadata: true
            });

            console.log('--- TEST QUERY RESULT ---');
            console.log(JSON.stringify(result, null, 2));
        }
    } catch (err) {
        console.error('Debug failed:', err);
    }
}

debugRAG();
