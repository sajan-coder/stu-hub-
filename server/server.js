require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { Pinecone } = require('@pinecone-database/pinecone');
const { AzureOpenAI } = require('openai');
const supabase = require('./supabaseClient');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize Azure OpenAI
console.log('[CONFIG] Azure Key present:', !!process.env.AZURE_OPENAI_API_KEY);
console.log('[CONFIG] Pinecone Key present:', !!process.env.PINECONE_API_KEY);

const azureClient = process.env.AZURE_OPENAI_API_KEY ? new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
}) : null;

// Initialize Pinecone
const pc = process.env.PINECONE_API_KEY ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY }) : null;

// Storage config
const upload = multer({ dest: 'uploads/' });
const localFilesStorePath = path.join(__dirname, 'files.local.json');

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const isFilesTableMissing = (error) =>
    error?.code === 'PGRST205' && typeof error?.message === 'string' && error.message.includes('public.files');
const isChatsTableMissing = (error) =>
    error?.code === 'PGRST205' && typeof error?.message === 'string' && error.message.includes('public.chats');
const isSessionIdColumnMissing = (error) =>
    typeof error?.message === 'string' && error.message.toLowerCase().includes('session_id');

app.get('/api/health/supabase', async (_req, res) => {
    if (!supabase) {
        return res.status(500).json({ ok: false, error: 'Supabase client not configured.' });
    }
    try {
        const [chats, files, notes] = await Promise.all([
            supabase.from('chats').select('id').limit(1),
            supabase.from('files').select('id').limit(1),
            supabase.from('notes').select('id').limit(1),
        ]);

        const errors = [chats.error, files.error, notes.error].filter(Boolean);
        if (errors.length) {
            return res.status(500).json({
                ok: false,
                errors: errors.map((e) => ({ code: e.code, message: e.message })),
            });
        }

        return res.json({
            ok: true,
            tables: {
                chats: 'ok',
                files: 'ok',
                notes: 'ok',
            },
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message || 'Supabase health check failed.' });
    }
});

const readLocalFilesStore = () => {
    try {
        if (!fs.existsSync(localFilesStorePath)) return [];
        const raw = fs.readFileSync(localFilesStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalFilesStore = (files) => {
    fs.writeFileSync(localFilesStorePath, JSON.stringify(files, null, 2), 'utf8');
};

const getLocalFilesForUser = (userId) =>
    readLocalFilesStore().filter((row) => String(row.user_id) === String(userId));

const insertIntoLocalFilesStore = (file, userId) => {
    const current = readLocalFilesStore();
    const row = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        user_id: userId,
        timestamp: new Date().toISOString(),
        local: true,
    };
    current.unshift(row);
    writeLocalFilesStore(current);
    return row;
};

const getAuthenticatedUser = async (req) => {
    if (!supabase) return null;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
};

const ensureAuthenticated = async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        res.status(401).json({ error: 'Unauthorized. Please sign in.' });
        return null;
    }
    return user;
};

// ── ENDPOINTS ──────────────────────────────────────────────────────────────

// 1. Ingestion Endpoint
app.post('/api/upload', upload.array('files'), async (req, res) => {
    console.log(`[API/UPLOAD] Processing ${req.files?.length} files...`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) {
        return res.status(500).json({ error: 'Configurations missing.' });
    }
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files received.' });
    }

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const indexedFiles = [];
        const skippedFiles = [];

        for (const file of req.files) {
            console.log(`[API/UPLOAD] Processing file: ${file.originalname} (${file.size} bytes)`);
            let text = '';
            try {

                // 1. Extraction (PDF + plain text only; OCR/images disabled)
                try {
                    if (file.mimetype === 'application/pdf') {
                        const dataBuffer = fs.readFileSync(file.path);
                        const pdfData = await pdf(dataBuffer);
                        text = pdfData.text || '';
                    } else {
                        const textLikeTypes = [
                            'text/plain',
                            'text/markdown',
                            'text/csv',
                            'application/json',
                        ];
                        const ext = path.extname(file.originalname).toLowerCase();
                        const textLikeExts = ['.txt', '.md', '.csv', '.json'];

                        if (textLikeTypes.includes(file.mimetype) || textLikeExts.includes(ext)) {
                            text = fs.readFileSync(file.path, 'utf8');
                        } else {
                            skippedFiles.push({
                                file: file.originalname,
                                reason: 'Unsupported file type. Upload PDF/TXT/MD/CSV/JSON only.',
                            });
                            continue;
                        }
                    }

                    console.log(`[API/UPLOAD] Extracted text length for ${file.originalname}: ${text?.length || 0}`);

                    if (!text || text.trim().length === 0) {
                        console.warn(`[API/UPLOAD] No text extracted from ${file.originalname}. Is it a scanned PDF?`);
                        skippedFiles.push({ file: file.originalname, reason: 'No extractable content found' });
                        continue;
                    }
                } catch (err) {
                    console.error(`[API/UPLOAD] Extraction failed for ${file.originalname}: ${err.message}`);
                    skippedFiles.push({ file: file.originalname, reason: `Extraction failed: ${err.message}` });
                    continue;
                }

                // 2. Chunking & Embedding
                const chunks = text.match(/[\s\S]{1,1500}/g) || [];
                console.log(`[API/UPLOAD] Chunked into ${chunks.length} parts. Generating embeddings...`);

                const vectors = [];
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        const embeddingRes = await azureClient.embeddings.create({
                            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
                            input: chunks[i],
                        });

                        vectors.push({
                            id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                            values: embeddingRes.data[0].embedding,
                            metadata: {
                                text: chunks[i],
                                originalName: file.originalname,
                                type: 'document'
                            }
                        });
                    } catch (innerErr) {
                        console.error('[API/UPLOAD] Embedding failed:', innerErr.message);
                    }
                }

                // 3. Upsert via REST (for reliability)
                if (vectors.length > 0) {
                    const desc = await pc.describeIndex(indexName);
                    const host = desc.host;
                    const upsertUrl = `https://${host}/vectors/upsert`;

                    const upRes = await fetch(upsertUrl, {
                        method: 'POST',
                        headers: {
                            'Api-Key': process.env.PINECONE_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ vectors })
                    });

                    if (upRes.ok) {
                        console.log(`[API/UPLOAD] Successfully indexed ${vectors.length} vectors for ${file.originalname}`);
                    } else {
                        const upErr = await upRes.text();
                        console.error(`[API/UPLOAD] Pinecone REST failed: ${upErr}`);
                        skippedFiles.push({ file: file.originalname, reason: 'Pinecone upsert failed' });
                        continue;
                    }
                } else {
                    skippedFiles.push({ file: file.originalname, reason: 'No vectors created from extracted content' });
                    continue;
                }

                // 4. Record in Supabase
                if (supabase) {
                    console.log(`[SUPABASE] Logging file: ${file.originalname}`);
                    const { data: inserted, error: insertError } = await supabase
                        .from('files')
                        .insert([
                            { user_id: user.id, name: file.originalname, type: file.mimetype, size: file.size, timestamp: new Date() }
                        ])
                        .select('*')
                        .single();

                    if (insertError) {
                        if (isFilesTableMissing(insertError)) {
                            console.warn('[SUPABASE] files table missing, using local file index store fallback.');
                            const fallbackRow = insertIntoLocalFilesStore(file, user.id);
                            indexedFiles.push(fallbackRow);
                        } else {
                            console.error('[SUPABASE] File log insert failed:', insertError.message);
                            skippedFiles.push({ file: file.originalname, reason: `Supabase insert failed: ${insertError.message}` });
                            continue;
                        }
                    } else {
                        indexedFiles.push(inserted);
                    }
                } else {
                    indexedFiles.push(insertIntoLocalFilesStore(file, user.id));
                }

            } finally {
                // Always clean temp upload files, including early-continue paths.
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        const anySuccess = indexedFiles.length > 0;
        res.status(anySuccess ? 200 : 400).json({
            message: anySuccess ? 'UPLOAD SUCCESSFUL. INDEXED.' : 'UPLOAD FAILED. NO FILES INDEXED.',
            indexedFiles,
            skippedFiles,
        });
    } catch (err) {
        console.error('[API/UPLOAD] Fatal Error:', err);
        res.status(500).json({ error: 'Processing failed.' });
    }
});

// 2. RAG Chat Endpoint (Store in History)
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    console.log(`[API/CHAT] New query: "${message.substring(0, 50)}..."`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) return res.json({ reply: "CONFIG ERROR." });

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);

        // 1. Get embedding for the query
        const queryEmbedding = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
            input: message,
        });

        // 2. Query Pinecone
        const queryResponse = await index.query({
            vector: queryEmbedding.data[0].embedding,
            topK: 3,
            includeMetadata: true,
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join("\n---\n");

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: "You are an academic assistant for students. Provide clear, well-structured, and professional responses based solely on the provided CONTEXT from uploaded files. Avoid emojis, maintain formal tone, and focus on educational accuracy."
                },
                { role: "user", content: `CONTEXT:\n${context || "EMPTY"}\n\nQUESTION: ${message}` }
            ],
        });

        const reply = completion.choices[0].message.content;

        // 3. PERSIST IN SUPABASE (HISTORY)
        if (supabase) {
            console.log('[SUPABASE] Storing chat history...');
            const chatRow = {
                user_msg: message,
                bot_reply: reply,
                session_id: sessionId || 'default',
                user_id: user.id,
                timestamp: new Date()
            };
            let { error: chatInsertError } = await supabase.from('chats').insert([
                chatRow
            ]);
            if (chatInsertError && isSessionIdColumnMissing(chatInsertError)) {
                const legacyRow = { ...chatRow };
                delete legacyRow.session_id;
                const legacyInsert = await supabase.from('chats').insert([legacyRow]);
                chatInsertError = legacyInsert.error;
            }
            if (chatInsertError) {
                if (isChatsTableMissing(chatInsertError)) {
                    console.warn('[SUPABASE] chats table missing; chat history persistence is disabled until schema is applied.');
                } else {
                    console.error('[SUPABASE] Failed to store chat history:', chatInsertError.message);
                }
            }
        }

        res.json({ reply });
    } catch (err) {
        console.error('[API/CHAT] ERROR:', err);
        res.status(500).json({ reply: "ERROR IN BRAIN PROCESSING." });
    }
});

// Flashcard Generation Endpoint
app.post('/api/flashcards/generate', async (req, res) => {
    const { fileIds, numCards = 5, count = 5 } = req.body;
    const actualCount = numCards || count || 5;
    console.log(`[API/FLASHCARDS] Generating ${actualCount} flashcards from files: ${fileIds?.join(', ')}`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) {
        return res.status(500).json({ error: "CONFIG ERROR. Azure or Pinecone not configured." });
    }

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);

        // Get all vectors from the index for context
        // Since we can't easily filter by fileIds without storing file metadata,
        // we'll query for diverse content
        const queryEmbedding = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
            input: "study notes summary concepts definitions key points",
        });

        // Query Pinecone for relevant content
        const queryResponse = await index.query({
            vector: queryEmbedding.data[0].embedding,
            topK: actualCount * 3, // Get more content to generate multiple cards
            includeMetadata: true,
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join("\n---\n");

        if (!context || context.trim().length === 0) {
            return res.json({ data: [] });
        }

        // Generate flashcards using Azure OpenAI
        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `You are an expert educator specializing in creating study flashcards. 

TASK: Generate ${actualCount} high-quality flashcards from the provided study material.

IMPORTANT REQUIREMENTS:
1. Each flashcard MUST have a DIFFERENT question and a DIFFERENT answer
2. The answer must provide ACTUAL information from the material, NOT just restate or invert the question
3. Answers should be informative, substantive, and different from the question
4. Each flashcard must have:
   - "question": A clear, specific question testing understanding
   - "answer": A concise, accurate answer with real information
5. Cover DIFFERENT topics from the material (not just one topic)
6. Questions should test comprehension, definition, application, or analysis
7. Answers should be brief but complete (1-3 sentences max)
8. Use diverse question types: definitions, true/false, fill-in-blank, concept explanations
9. Format as JSON array with question/answer pairs

EXAMPLE OUTPUT FORMAT:
[
  { "question": "What is photosynthesis?", "answer": "Photosynthesis is the process by which plants convert light energy into chemical energy, producing glucose and oxygen from carbon dioxide and water." },
  { "question": "Define cell membrane.", "answer": "The cell membrane is a phospholipid bilayer that surrounds the cell, controlling the passage of substances in and out of the cell." }
]

BAD EXAMPLE (DO NOT USE):
[
  { "question": "What is photosynthesis?", "answer": "What photosynthesis is." }  // BAD - just inverts the question
]

CONTEXT FROM STUDY MATERIAL:
${context.substring(0, 8000)}

Generate exactly ${actualCount} flashcards covering different topics with real, informative answers. Return ONLY valid JSON array.`
                },
                {
                    role: "user",
                    content: "Generate study flashcards from the provided material."
                }
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;

        // Parse the JSON response
        let flashcards = [];
        try {
            // Try to extract JSON from the response (it might have markdown code blocks)
            const jsonMatch = reply.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                flashcards = JSON.parse(jsonMatch[0]);
            } else {
                flashcards = JSON.parse(reply);
            }

            // Validate and sanitize
            flashcards = flashcards.slice(0, actualCount).map(card => ({
                question: card.question || card.q || "",
                answer: card.answer || card.a || ""
            })).filter(card => card.question && card.answer);

        } catch (parseErr) {
            console.error('[API/FLASHCARDS] Parse error:', parseErr.message);
            console.log('[API/FLASHCARDS] Raw response:', reply);
            // Return fallback flashcards
            flashcards = [
                { question: "What is the main topic covered in these materials?", answer: "Review the uploaded documents to find the key concepts." },
                { question: "Define the key term from your study material.", answer: "Refer to the documents for definitions." },
                { question: "What are the main concepts?", answer: "Check the uploaded files for detailed explanations." }
            ];
        }

        console.log(`[API/FLASHCARDS] Generated ${flashcards.length} flashcards`);
        res.json({ data: flashcards });

    } catch (err) {
        console.error('[API/FLASHCARDS] ERROR:', err);
        res.status(500).json({ error: 'Failed to generate flashcards.' });
    }
});

// Study Notes Generation Endpoint
app.post('/api/notes/generate', async (req, res) => {
    const { fileIds } = req.body;
    console.log(`[API/NOTES] Generating study notes from files: ${fileIds?.join(', ')}`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) {
        return res.status(500).json({ error: "CONFIG ERROR. Azure or Pinecone not configured." });
    }

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);

        const queryEmbedding = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
            input: "main topics concepts summary detailed explanation",
        });

        const queryResponse = await index.query({
            vector: queryEmbedding.data[0].embedding,
            topK: 20,
            includeMetadata: true,
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join("\n---\n");

        if (!context || context.trim().length === 0) {
            return res.json({ data: [{ title: "No Content", content: "No study material found. Please upload files first." }] });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `You are an expert tutor. Create comprehensive study notes from the provided material. Generate detailed, well-structured study notes with clear sections. Include key definitions, explanations, and examples. Cover all main topics from the material. Use markdown formatting for headings and lists. Make it easy to review and understand.

CONTEXT FROM STUDY MATERIAL:
${context.substring(0, 10000)}`
                },
                {
                    role: "user",
                    content: "Create study notes from this material."
                }
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        console.log(`[API/NOTES] Generated study notes`);
        res.json({ data: [{ title: "Study Notes", content: reply }] });

    } catch (err) {
        console.error('[API/NOTES] ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mind Map Generation Endpoint
app.post('/api/mindmap/generate', async (req, res) => {
    const { fileIds } = req.body;
    console.log(`[API/MINDMAP] Generating mind map from files: ${fileIds?.join(', ')}`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) {
        return res.status(500).json({ error: "CONFIG ERROR. Azure or Pinecone not configured." });
    }

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);

        const queryEmbedding = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
            input: "main concepts topics relationships ideas",
        });

        const queryResponse = await index.query({
            vector: queryEmbedding.data[0].embedding,
            topK: 15,
            includeMetadata: true,
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join("\n---\n");

        if (!context || context.trim().length === 0) {
            return res.json({ data: [{ centralTopic: "No Content", nodes: [], connections: [] }] });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `Create a mind map structure from the study material. Output as JSON with: centralTopic (string), nodes (array with id, text, level, parent), connections (array with from, to). Include central topic and 5-8 major branches with 2-4 subtopics each.

CONTEXT FROM STUDY MATERIAL:
${context.substring(0, 8000)}`
                },
                {
                    role: "user",
                    content: "Create a mind map from this material."
                }
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        let mindmap = { centralTopic: "Study Topic", nodes: [], connections: [] };

        try {
            const jsonMatch = reply.match(/\{[\s\S]*\}/);
            if (jsonMatch) mindmap = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.error('[API/MINDMAP] Parse error:', parseErr.message);
        }

        console.log(`[API/MINDMAP] Generated mind map`);
        res.json({ data: [mindmap] });

    } catch (err) {
        console.error('[API/MINDMAP] ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// MCQ Generation Endpoint
app.post('/api/mcq/generate', async (req, res) => {
    const { fileIds, numQuestions = 5 } = req.body;
    console.log(`[API/MCQ] Generating ${numQuestions} MCQs from files: ${fileIds?.join(', ')}`);

    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    if (!azureClient || !pc) {
        return res.status(500).json({ error: "CONFIG ERROR. Azure or Pinecone not configured." });
    }

    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);

        const queryEmbedding = await azureClient.embeddings.create({
            model: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT.trim(),
            input: "concepts definitions facts key points quiz questions",
        });

        const queryResponse = await index.query({
            vector: queryEmbedding.data[0].embedding,
            topK: numQuestions * 3,
            includeMetadata: true,
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join("\n---\n");

        if (!context || context.trim().length === 0) {
            return res.json({ data: [] });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `Generate ${numQuestions} MCQs from the study material. Each question has: question, options (array of 4), correctAnswer (one of the options). Cover different topics. Make options plausible.

OUTPUT FORMAT (JSON array):
[
  { "question": "What is...?", "options": ["A)", "B)", "C)", "D)"], "correctAnswer": "A)" }
]

CONTEXT:
${context.substring(0, 8000)}`
                },
                {
                    role: "user",
                    content: "Generate MCQ quiz."
                }
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        let mcqs = [];
        try {
            const jsonMatch = reply.match(/\[[\s\S]*\]/);
            if (jsonMatch) mcqs = JSON.parse(jsonMatch[0]);
            mcqs = mcqs.slice(0, numQuestions).map(mcq => ({
                question: mcq.question || "",
                options: mcq.options || ["A", "B", "C", "D"],
                correctAnswer: mcq.correctAnswer || mcq.correct || mcq.options?.[0] || ""
            })).filter(mcq => mcq.question && mcq.options?.length >= 2);
        } catch (parseErr) {
            console.error('[API/MCQ] Parse error:', parseErr.message);
            mcqs = [{ question: "Sample question?", options: ["A", "B", "C", "D"], correctAnswer: "A" }];
        }

        console.log(`[API/MCQ] Generated ${mcqs.length} MCQs`);
        res.json({ data: mcqs });

    } catch (err) {
        console.error('[API/MCQ] ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Chat History Endpoints
app.get('/api/history', async (req, res) => {
    if (!supabase) return res.json({ data: [] });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    const sessionId = req.query.session_id;
    try {
        let query = supabase.from('chats').select('*').eq('user_id', user.id);

        if (sessionId) {
            query = query.eq('session_id', sessionId).order('timestamp', { ascending: true });
        } else {
            query = query.order('timestamp', { ascending: false }).limit(100);
        }

        let { data, error } = await query;
        if (error && sessionId && isSessionIdColumnMissing(error)) {
            if (String(sessionId).startsWith('legacy-')) {
                const id = Number(String(sessionId).replace('legacy-', ''));
                if (!Number.isNaN(id)) {
                    const legacy = await supabase.from('chats').select('*').eq('id', id).single();
                    if (legacy.error) throw legacy.error;
                    data = legacy.data ? [legacy.data] : [];
                    error = null;
                }
            } else {
                data = [];
                error = null;
            }
        }

        if (error && isChatsTableMissing(error)) {
            return res.json({ data: [], warning: 'Supabase chats table missing.' });
        }
        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        console.error('[API/HISTORY] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

app.get('/api/history/sessions', async (req, res) => {
    if (!supabase) return res.json({ data: [] });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    try {
        let { data, error } = await supabase
            .from('chats')
            .select('session_id, user_msg, timestamp')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false })
            .limit(500);

        if (error && isSessionIdColumnMissing(error)) {
            const legacy = await supabase
                .from('chats')
                .select('id, user_msg, timestamp')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: false })
                .limit(500);
            if (legacy.error) throw legacy.error;
            const legacySessions = (legacy.data || []).map((row) => ({
                session_id: `legacy-${row.id}`,
                title: row.user_msg || 'Untitled chat',
                timestamp: row.timestamp,
            }));
            return res.json({ data: legacySessions });
        }
        if (error && isChatsTableMissing(error)) {
            return res.json({ data: [], warning: 'Supabase chats table missing.' });
        }
        if (error) throw error;

        const seen = new Set();
        const sessions = [];
        for (const row of data || []) {
            const sid = row.session_id || 'default';
            if (seen.has(sid)) continue;
            seen.add(sid);
            sessions.push({
                session_id: sid,
                title: row.user_msg || 'Untitled chat',
                timestamp: row.timestamp,
            });
        }

        res.json({ data: sessions });
    } catch (err) {
        console.error('[API/HISTORY/SESSIONS] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch sessions.' });
    }
});

app.delete('/api/history', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase offline.' });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    const sessionId = req.query.session_id;
    try {
        let error = null;
        if (sessionId) {
            const result = await supabase.from('chats').delete().eq('session_id', sessionId).eq('user_id', user.id);
            error = result.error;
            if (error && isSessionIdColumnMissing(error) && String(sessionId).startsWith('legacy-')) {
                const id = Number(String(sessionId).replace('legacy-', ''));
                if (!Number.isNaN(id)) {
                    const legacyResult = await supabase.from('chats').delete().eq('id', id).eq('user_id', user.id);
                    error = legacyResult.error;
                }
            }
        } else {
            const result = await supabase.from('chats').delete().eq('user_id', user.id);
            error = result.error; // Delete all rows
        }

        if (error && isChatsTableMissing(error)) {
            return res.json({ message: 'Chats table missing; nothing to delete.' });
        }
        if (error) throw error;
        res.json({ message: sessionId ? 'Session history purged.' : 'History purged.' });
    } catch (err) {
        console.error('[API/HISTORY/DELETE] Error:', err.message);
        res.status(500).json({ error: 'Failed to purge history.' });
    }
});

// 4. Create Note Endpoint
app.post('/api/notes', async (req, res) => {
    const { content, title, subject } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Supabase offline.' });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('notes')
            .insert([{ user_id: user.id, content, title: title || 'Brain Dump', subject: subject || 'General', timestamp: new Date() }]);

        if (error) throw error;
        res.json({ message: 'Neural Note Created.', data });
    } catch (err) {
        console.error('[API/NOTES] Error:', err.message);
        res.status(500).json({ error: 'Sync failed.' });
    }
});

// 5. Indexed Files Endpoints
app.get('/api/files', async (req, res) => {
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    if (!supabase) return res.json({ data: getLocalFilesForUser(user.id) });
    try {
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (error) {
            if (isFilesTableMissing(error)) {
                return res.json({ data: getLocalFilesForUser(user.id) });
            }
            throw error;
        }
        res.json({ data: data || [] });
    } catch (err) {
        console.error('[API/FILES/GET] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch files.' });
    }
});

app.delete('/api/files/:id', async (req, res) => {
    if (!pc) return res.status(500).json({ error: 'Services offline.' });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    const { id } = req.params;

    try {
        let fileData = null;
        let useLocalStore = !supabase;

        if (supabase) {
            const { data, error: fetchErr } = await supabase
                .from('files')
                .select('name')
                .eq('id', id).eq('user_id', user.id)
                .single();

            if (fetchErr) {
                if (isFilesTableMissing(fetchErr)) {
                    useLocalStore = true;
                } else {
                    throw fetchErr;
                }
            } else {
                fileData = data;
            }
        }

        if (useLocalStore) {
            const localFiles = readLocalFilesStore();
            const found = localFiles.find((row) => String(row.id) === String(id) && String(row.user_id) === String(user.id));
            if (!found) {
                return res.status(404).json({ error: 'File not found.' });
            }
            fileData = { name: found.name };
        }

        if (!fileData?.name) {
            return res.status(404).json({ error: 'File not found.' });
        }

        // 2. Delete from Pinecone
        const indexName = process.env.PINECONE_INDEX_NAME || 'student-hub-index';
        const index = pc.index(indexName);
        console.log(`[PINECONE] Deleting vectors for: ${fileData.name}`);

        // Pinecone deletion by metadata filter
        await index.deleteMany({ filter: { originalName: { '$eq': fileData.name } } });

        if (useLocalStore) {
            const localFiles = readLocalFilesStore().filter((row) => !(String(row.id) === String(id) && String(row.user_id) === String(user.id)));
            writeLocalFilesStore(localFiles);
            return res.json({ message: 'File and vectors purged.' });
        }

        // 3. Delete from Supabase
        const { error: delErr } = await supabase
            .from('files')
            .delete()
            .eq('id', id).eq('user_id', user.id);

        if (delErr) throw delErr;

        res.json({ message: 'File and vectors purged.' });
    } catch (err) {
        console.error('[API/FILES/DELETE] Error:', err.message);
        res.status(500).json({ error: 'Purge failed.' });
    }
});

// 6. Fetch Notes Endpoint
app.get('/api/notes', async (req, res) => {
    if (!supabase) return res.json({ data: [] });
    const user = await ensureAuthenticated(req, res);
    if (!user) return;
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        res.json({ data: data || [] });
    } catch (err) {
        console.error('[API/NOTES/GET] Error:', err.message);
        res.status(500).json({ error: 'Sync failed.' });
    }
});

app.listen(PORT, () => {
    console.log(`RAG Server fully active on http://localhost:${PORT}`);
});
