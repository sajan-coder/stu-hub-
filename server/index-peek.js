require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function peek() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    try {
        console.log('--- INDEX STATS ---');
        const stats = await index.describeIndexStats();
        console.log(JSON.stringify(stats, null, 2));

        console.log('--- RECENT VECTORS ---');
        // We can't list all, but we can query with a dummy vector
        const res = await index.query({
            vector: new Array(3072).fill(0.1),
            topK: 5,
            includeMetadata: true
        });
        console.log('Matches found:', res.matches.length);
        res.matches.forEach(m => console.log(`- ID: ${m.id}, Score: ${m.score}, Text: ${m.metadata?.text?.substring(0, 50)}...`));
    } catch (err) {
        console.error(err);
    }
}
peek();
