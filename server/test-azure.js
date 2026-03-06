require('dotenv').config();
const { AzureOpenAI } = require('openai');

async function testEmbedding() {
    // DON'T pass deployment in constructor if using multi-deployment
    const azureClient = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    try {
        const res = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT || 'text-embedding-3-large',
            input: "test",
        });
        console.log('Azure Embedding success! Dimension:', res.data[0].embedding.length);
    } catch (err) {
        console.error('Azure Embedding test failed error message:', err.message);
        if (err.status) console.error('Status:', err.status);
    }
}

testEmbedding();
