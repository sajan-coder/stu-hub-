require('dotenv').config();
const { AzureOpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testChat() {
    const azureClient = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    });
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('student-hub-index');

    const message = "Tell me about the uploaded notes.";
    console.log(`Query: ${message}`);

    const emb = await azureClient.embeddings.create({
        model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
        input: message
    });

    const res = await index.query({
        vector: emb.data[0].embedding,
        topK: 3,
        includeMetadata: true
    });

    console.log(`Matches: ${res.matches.length}`);
    res.matches.forEach(m => console.log(`- Score: ${m.score}, Text snippet: ${m.metadata?.text?.substring(0, 100)}`));

    if (res.matches.length > 0) {
        const context = res.matches.map(m => m.metadata.text).join('\n\n');
        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                { role: "system", content: "You are a smart student assistant." },
                { role: "user", content: `Context: ${context}\n\nQuestion: ${message}` }
            ]
        });
        console.log('AI Reply:', completion.choices[0].message.content);
    } else {
        console.log('No context found.');
    }
}
testChat();
