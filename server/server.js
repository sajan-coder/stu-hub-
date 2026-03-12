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

const normalizeFlashcardText = (value = '') =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getWordSet = (value = '') =>
    new Set(normalizeFlashcardText(value).split(' ').filter(Boolean));

const isWeakFlashcardAnswer = (question = '', answer = '') => {
    const normalizedQuestion = normalizeFlashcardText(question);
    const normalizedAnswer = normalizeFlashcardText(answer);

    if (!normalizedQuestion || !normalizedAnswer) return true;
    if (normalizedQuestion === normalizedAnswer) return true;
    if ([...normalizedQuestion].reverse().join('') === normalizedAnswer) return true;
    if (normalizedAnswer.endsWith('?')) return true;

    const questionWords = getWordSet(question);
    const answerWords = getWordSet(answer);
    const sharedWords = [...answerWords].filter((word) => questionWords.has(word)).length;
    const overlapRatio = answerWords.size ? sharedWords / answerWords.size : 1;

    return overlapRatio >= 0.8 && normalizedAnswer.length <= normalizedQuestion.length + 20;
};

const sanitizeFlashcards = (cards, requestedCount) =>
    (Array.isArray(cards) ? cards : [])
        .slice(0, requestedCount)
        .map((card) => ({
            question: String(card?.question || card?.q || '').trim(),
            answer: String(card?.answer || card?.a || '').trim(),
        }))
        .filter((card) => card.question && card.answer);

const parseJsonPayload = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        const objectMatch = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch { }
        }
        const arrayMatch = typeof raw === 'string' ? raw.match(/\[[\s\S]*\]/) : null;
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch { }
        }
        return fallback;
    }
};

const sanitizeMcqOption = (option, index) => {
    const labels = ['A', 'B', 'C', 'D'];
    const value = String(option || '').replace(/^[A-D][.)\-\s:]*/i, '').trim();
    return `${labels[index]}. ${value || `Option ${labels[index]}`}`;
};

const sanitizeMcqs = (mcqs, requestedCount) =>
    (Array.isArray(mcqs) ? mcqs : [])
        .slice(0, requestedCount)
        .map((mcq) => {
            const rawOptions = Array.isArray(mcq?.options) ? mcq.options.slice(0, 4) : [];
            while (rawOptions.length < 4) {
                rawOptions.push(`Option ${String.fromCharCode(65 + rawOptions.length)}`);
            }
            const options = rawOptions.map((option, index) => sanitizeMcqOption(option, index));
            const rawCorrect = String(mcq?.correctAnswer || mcq?.correct || '').trim();
            const correctIndex = options.findIndex((option) => option === rawCorrect || option.endsWith(rawCorrect.replace(/^[A-D][.)\-\s:]*/i, '').trim()));

            return {
                question: String(mcq?.question || '').trim(),
                options,
                correctAnswer: correctIndex >= 0 ? options[correctIndex] : options[0],
                explanation: String(mcq?.explanation || mcq?.reason || '').trim(),
            };
        })
        .filter((mcq) => mcq.question && mcq.options.length === 4);

const sanitizeNotesPayload = (payload) => {
    const notes = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const sections = Array.isArray(notes.sections) ? notes.sections : [];

    return {
        title: String(notes.title || 'Study Notes').trim(),
        overview: String(notes.overview || notes.summary || notes.content || 'No overview generated.').trim(),
        sections: sections
            .map((section) => ({
                heading: String(section?.heading || section?.title || 'Topic').trim(),
                summary: String(section?.summary || section?.content || '').trim(),
                keyPoints: Array.isArray(section?.keyPoints) ? section.keyPoints.map((item) => String(item).trim()).filter(Boolean) : [],
                examTips: Array.isArray(section?.examTips) ? section.examTips.map((item) => String(item).trim()).filter(Boolean) : [],
                likelyQuestions: Array.isArray(section?.likelyQuestions) ? section.likelyQuestions.map((item) => String(item).trim()).filter(Boolean) : [],
            }))
            .filter((section) => section.heading || section.summary || section.keyPoints.length || section.examTips.length || section.likelyQuestions.length),
        mustRemember: Array.isArray(notes.mustRemember)
            ? notes.mustRemember.map((item) => String(item).trim()).filter(Boolean)
            : [],
    };
};

const sanitizeMindMapPayload = (payload) => {
    const mindmap = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const branches = Array.isArray(mindmap.branches)
        ? mindmap.branches
        : Array.isArray(mindmap.nodes)
            ? mindmap.nodes
                .filter((node) => Number(node?.level) === 1 || !node?.parent)
                .map((node) => ({
                    title: String(node?.text || node?.title || 'Branch').trim(),
                    examAngle: '',
                    children: Array.isArray(mindmap.nodes)
                        ? mindmap.nodes
                            .filter((child) => String(child?.parent || '') === String(node?.id || ''))
                            .map((child) => String(child?.text || '').trim())
                            .filter(Boolean)
                        : [],
                }))
            : [];

    return {
        centralTopic: String(mindmap.centralTopic || mindmap.topic || 'Study Topic').trim(),
        quickSummary: String(mindmap.quickSummary || mindmap.summary || 'No summary generated.').trim(),
        branches: branches
            .map((branch) => ({
                title: String(branch?.title || branch?.text || 'Branch').trim(),
                examAngle: String(branch?.examAngle || branch?.summary || '').trim(),
                children: Array.isArray(branch?.children)
                    ? branch.children.map((child) => String(child).trim()).filter(Boolean)
                    : [],
            }))
            .filter((branch) => branch.title || branch.children.length),
    };
};

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
    const { fileIds, numCards, count } = req.body;
    const requestedCount = Number.parseInt(numCards ?? count, 10);
    const actualCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 5;
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

            flashcards = sanitizeFlashcards(flashcards, actualCount);

            const invalidCards = flashcards.filter((card) => isWeakFlashcardAnswer(card.question, card.answer));
            if (invalidCards.length > 0) {
                const repairCompletion = await azureClient.chat.completions.create({
                    model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
                    messages: [
                        {
                            role: "system",
                            content: `You repair flashcard answers.

Rules:
1. Keep each original question exactly as written.
2. Write a factual answer from the provided context.
3. Do not restate, invert, or paraphrase the question as the answer.
4. Each answer must be 1-3 sentences and directly informative.
5. Return ONLY a JSON array of objects with "question" and "answer".`
                        },
                        {
                            role: "user",
                            content: `CONTEXT:
${context.substring(0, 8000)}

FLASHCARDS TO REPAIR:
${JSON.stringify(invalidCards)}

Return repaired answers for these same questions only.`
                        }
                    ],
                });

                const repairReply = repairCompletion.choices[0].message.content;
                const repairedMatch = repairReply.match(/\[[\s\S]*\]/);
                const repairedCards = sanitizeFlashcards(
                    repairedMatch ? JSON.parse(repairedMatch[0]) : JSON.parse(repairReply),
                    invalidCards.length
                );
                const repairedByQuestion = new Map(
                    repairedCards.map((card) => [normalizeFlashcardText(card.question), card.answer])
                );

                flashcards = flashcards.map((card) => {
                    const repairedAnswer = repairedByQuestion.get(normalizeFlashcardText(card.question));
                    return repairedAnswer ? { ...card, answer: repairedAnswer } : card;
                });
            }

            flashcards = flashcards.filter((card) => !isWeakFlashcardAnswer(card.question, card.answer));

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
            return res.json({
                data: [sanitizeNotesPayload({
                    title: "No Content",
                    overview: "No study material found. Please upload files first.",
                    sections: [],
                    mustRemember: ["Upload at least one readable study file before generating notes."],
                })]
            });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `You are an exam-prep tutor. Convert the study material into high-value revision notes.

Return ONLY valid JSON in this exact shape:
{
  "title": "string",
  "overview": "2-4 sentence summary",
  "sections": [
    {
      "heading": "string",
      "summary": "1-2 sentence explanation",
      "keyPoints": ["point 1", "point 2"],
      "examTips": ["tip 1", "tip 2"],
      "likelyQuestions": ["question 1", "question 2"]
    }
  ],
  "mustRemember": ["fact 1", "fact 2"]
}

Rules:
1. Focus on exam revision, not generic summarization.
2. Cover major topics only.
3. Keep points concise and factual.
4. Include likely exam questions students can practice.
5. Do not include markdown fences or commentary.

CONTEXT FROM STUDY MATERIAL:
${context.substring(0, 10000)}`
                },
                {
                    role: "user",
                    content: "Create exam-focused study notes from this material."
                }
            ],
        });

        const reply = completion.choices[0].message.content;
        const fallbackNotes = {
            title: "Study Notes",
            overview: "Key revision notes could not be structured from the material.",
            sections: [],
            mustRemember: ["Review the uploaded material directly for important facts."],
        };
        const structuredNotes = sanitizeNotesPayload(parseJsonPayload(reply, fallbackNotes));

        console.log(`[API/NOTES] Generated study notes`);
        res.json({ data: [structuredNotes] });

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
            return res.json({
                data: [sanitizeMindMapPayload({
                    centralTopic: "No Content",
                    quickSummary: "No study material found. Please upload files first.",
                    branches: [],
                })]
            });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `Create an exam-oriented mind map from the study material.

Return ONLY valid JSON in this exact shape:
{
  "centralTopic": "string",
  "quickSummary": "1-2 sentence overview",
  "branches": [
    {
      "title": "string",
      "examAngle": "why this branch matters in exams",
      "children": ["subtopic 1", "subtopic 2", "subtopic 3"]
    }
  ]
}

Rules:
1. Include 4-7 major branches.
2. Each branch must have 2-5 children.
3. Keep branch titles concise and memorable.
4. Make the map useful for fast revision.
5. Do not include markdown fences or extra commentary.

CONTEXT FROM STUDY MATERIAL:
${context.substring(0, 8000)}`
                },
                {
                    role: "user",
                    content: "Create a revision mind map from this material."
                }
            ],
        });

        const reply = completion.choices[0].message.content;
        const mindmap = sanitizeMindMapPayload(parseJsonPayload(reply, {
            centralTopic: "Study Topic",
            quickSummary: "No structured mind map could be generated.",
            branches: [],
        }));

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
            return res.json({
                data: [{
                    question: "No study material found. What should you do first?",
                    options: [
                        "A. Upload at least one readable file",
                        "B. Refresh the page only",
                        "C. Delete the workspace",
                        "D. Change browser zoom"
                    ],
                    correctAnswer: "A. Upload at least one readable file",
                    explanation: "MCQs need uploaded study material before they can be generated.",
                }]
            });
        }

        const completion = await azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim(),
            messages: [
                {
                    role: "system",
                    content: `Generate exactly ${numQuestions} exam-style MCQs from the study material.

Return ONLY a valid JSON array in this shape:
[
  {
    "question": "string",
    "options": ["A. option", "B. option", "C. option", "D. option"],
    "correctAnswer": "A. option",
    "explanation": "short reason why the correct option is right"
  }
]

Rules:
1. Every question must have exactly 4 options.
2. Only one option can be correct.
3. Wrong options must be plausible.
4. Cover different topics from the material.
5. Do not include markdown fences or extra commentary.

CONTEXT:
${context.substring(0, 8000)}`
                },
                {
                    role: "user",
                    content: "Generate an exam practice MCQ quiz."
                }
            ],
        });

        const reply = completion.choices[0].message.content;
        let mcqs = sanitizeMcqs(parseJsonPayload(reply, []), numQuestions);
        if (mcqs.length === 0) {
            mcqs = [{
                question: "Sample question?",
                options: ["A. Option A", "B. Option B", "C. Option C", "D. Option D"],
                correctAnswer: "A. Option A",
                explanation: "Fallback example because quiz generation failed."
            }];
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
