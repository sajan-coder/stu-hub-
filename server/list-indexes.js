require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function list() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    try {
        const res = await pc.listIndexes();
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    }
}
list();
