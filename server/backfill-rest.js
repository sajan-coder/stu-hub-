require('dotenv').config();
const fs = require('fs');
const pdf = require('pdf-parse');
const { AzureOpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

async function backfillRest() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';

    console.log('Fetching index host...');
    const desc = await pc.describeIndex(indexName);
    const host = desc.host;
    const url = `https://${host}/vectors/upsert`;
    console.log('Target URL:', url);

    const azureClient = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const files = fs.readdirSync('./uploads/');
    for (const filename of files) {
        try {
            const dataBuffer = fs.readFileSync('./uploads/' + filename);
            const data = await pdf(dataBuffer);
            const text = data.text.trim();
            if (text.length < 10) continue;

            const chunks = text.match(/[\s\S]{1,1000}/g) || [];
            console.log(`Processing ${filename}, chunks: ${chunks.length}`);

            const vectors = [];
            for (let i = 0; i < chunks.length; i++) {
                const emb = await azureClient.embeddings.create({
                    model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
                    input: chunks[i]
                });
                vectors.push({
                    id: `rest-${filename}-${i}`,
                    values: emb.data[0].embedding,
                    metadata: { text: chunks[i], originalName: filename }
                });
            }

            console.log(`- Sending ${vectors.length} vectors via fetch...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Api-Key': process.env.PINECONE_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vectors })
            });

            if (response.ok) {
                console.log(`- SUCCESS: ${filename}`);
            } else {
                const errText = await response.text();
                console.error(`- FAILED ${filename}: ${response.status} ${errText}`);
            }
        } catch (e) {
            console.error(`- ERROR ${filename}: ${e.message}`);
        }
    }
}
backfillRest();
