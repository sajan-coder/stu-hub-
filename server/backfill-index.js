require('dotenv').config();
const fs = require('fs');
const { Pinecone } = require('@pinecone-database/pinecone');
const { AzureOpenAI } = require('openai');
const pdf = require('pdf-parse');

async function backfill() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
    const index = pc.index(indexName);

    const azureClient = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });

    const uploadDir = './uploads/';
    const files = fs.readdirSync(uploadDir);

    console.log(`Found ${files.length} files. Starting backfill...`);

    for (const filename of files) {
        try {
            const dataBuffer = fs.readFileSync(uploadDir + filename);
            const data = await pdf(dataBuffer);
            const text = data.text.trim();

            if (text.length === 0) {
                console.log(`[SKIP] ${filename} is empty.`);
                continue;
            }

            const chunks = text.match(/[\s\S]{1,1000}/g) || [];
            console.log(`[PROCESS] ${filename} - Chunks: ${chunks.length}`);

            const records = [];
            for (let i = 0; i < chunks.length; i++) {
                const embeddingRes = await azureClient.embeddings.create({
                    model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
                    input: chunks[i],
                });

                records.push({
                    id: `bf-${filename}-${i}`,
                    values: embeddingRes.data[0].embedding,
                    metadata: { text: chunks[i], originalName: filename }
                });
            }

            if (records.length > 0) {
                console.log(`[UPSERT] Sending ${records.length} records...`);
                await index.upsert(records);
                console.log(`[SUCCESS] ${filename} indexed.`);
            }
        } catch (err) {
            console.error(`[ERROR] ${filename}: ${err.message}`);
        }
    }
}
backfill();
