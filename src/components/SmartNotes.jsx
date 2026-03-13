import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, File, BookOpen, Brain, Map, HelpCircle, X, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div;

const SmartNotes = ({ authToken }) => {
    const [selectedOption, setSelectedOption] = useState(null); // 1=Notes, 2=Flashcards, 3=MindMap, 4=MCQ
    const [generatedContent, setGeneratedContent] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState('');
    const [showMcqAnswers, setShowMcqAnswers] = useState(false);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [questionCount, setQuestionCount] = useState(5);

    const fetchAvailableFiles = useCallback(async () => {
        if (!authToken) return;
        try {
            const res = await fetch('http://localhost:5000/api/files', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableFiles(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    }, [authToken]);

    useEffect(() => { fetchAvailableFiles(); }, [fetchAvailableFiles]);

    const toggleFileSelection = (file) => {
        setSelectedFiles(prev => prev.some(f => f.id === file.id) ? prev.filter(f => f.id !== file.id) : [...prev, file]);
    };

    const getFallbackContent = (option) => {
        switch (option) {
            case 1:
                return [{
                    title: 'Study Notes',
                    overview: 'No study notes were generated for the selected files.',
                    sections: [],
                    mustRemember: [],
                }];
            case 3:
                return [{
                    centralTopic: 'Mind Map',
                    quickSummary: 'No mind map could be generated for the selected files.',
                    branches: [],
                }];
            case 4:
                return [{
                    question: 'No MCQ was generated from the selected files.',
                    options: [
                        'A. Re-upload readable notes',
                        'B. Keep the same broken file only',
                        'C. Ignore the error',
                        'D. Close the app'
                    ],
                    correctAnswer: 'A. Re-upload readable notes',
                    explanation: 'The selected files may not contain enough extractable study content.',
                }];
            default:
                return [];
        }
    };

    const handleGenerate = async () => {
        if (selectedFiles.length === 0) { alert('Please select at least one file!'); return; }
        setIsGenerating(true);
        setGenerationError('');
        setShowMcqAnswers(false);

        try {
            let endpoint = '';
            let body = {};
            const requestedCount = Math.max(1, Number(questionCount) || 5);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);

            switch (selectedOption) {
                case 1: // Study Notes
                    endpoint = 'http://localhost:5000/api/notes/generate';
                    body = { fileIds: selectedFiles.map(f => f.id) };
                    break;
                case 2: // Flashcards
                    endpoint = 'http://localhost:5000/api/flashcards/generate';
                    body = { fileIds: selectedFiles.map(f => f.id), numCards: requestedCount };
                    break;
                case 3: // Mind Map
                    endpoint = 'http://localhost:5000/api/mindmap/generate';
                    body = { fileIds: selectedFiles.map(f => f.id) };
                    break;
                case 4: // MCQ
                    endpoint = 'http://localhost:5000/api/mcq/generate';
                    body = { fileIds: selectedFiles.map(f => f.id), numQuestions: requestedCount };
                    break;
                default:
                    setIsGenerating(false);
                    return;
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message = data?.error || `Generation failed with status ${res.status}.`;
                setGenerationError(message);
                setGeneratedContent(getFallbackContent(selectedOption));
                return;
            }

            const content = Array.isArray(data.data) ? data.data : getFallbackContent(selectedOption);
            const nextContent = selectedOption === 2 || selectedOption === 4
                ? content.slice(0, requestedCount)
                : content;

            if (!nextContent.length) {
                setGenerationError('The server returned no generated content for the selected files.');
                setGeneratedContent(getFallbackContent(selectedOption));
                return;
            }

            setGeneratedContent(nextContent);
        } catch (err) {
            console.error(err);
            setGenerationError(
                err?.name === 'AbortError'
                    ? 'Generation timed out. Try again with smaller files or fewer questions.'
                    : (err?.message || 'Generation failed.')
            );
            setGeneratedContent(getFallbackContent(selectedOption));
        } finally {
            setIsGenerating(false);
        }
    };

    const menuOptions = [
        {
            id: 1,
            title: '📝 Study Notes',
            desc: 'Generate summary notes from your files',
            icon: File,
            color: 'bg-yellow-100',
            borderColor: 'border-yellow-300'
        },
        {
            id: 2,
            title: '🃏 Flashcards',
            desc: 'Create Q&A cards for revision',
            icon: BookOpen,
            color: 'bg-green-100',
            borderColor: 'border-green-300'
        },
        {
            id: 3,
            title: '🧠 Mind Map',
            desc: 'Visual concept maps from notes',
            icon: Map,
            color: 'bg-purple-100',
            borderColor: 'border-purple-300'
        },
        {
            id: 4,
            title: '❓ MCQ Quiz',
            desc: 'Multiple choice questions with 4 options',
            icon: HelpCircle,
            color: 'bg-blue-100',
            borderColor: 'border-blue-300'
        },
    ];

    const notesData = Array.isArray(generatedContent) ? generatedContent[0] : null;
    const mindMapData = Array.isArray(generatedContent) ? generatedContent[0] : null;

    const renderStudyNotes = () => {
        if (!notesData) {
            return (
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-gray-600">
                    No study notes were generated.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-6">
                    <p className="text-sm font-bold uppercase tracking-wide text-yellow-700">Exam Overview</p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-800" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                        {notesData.title || 'Study Notes'}
                    </h3>
                    <p className="mt-3 text-gray-700 leading-relaxed">{notesData.overview || 'No overview generated.'}</p>
                </div>

                {Array.isArray(notesData.sections) && notesData.sections.map((section, idx) => (
                    <div key={idx} className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                        <h4 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            {section.heading || `Topic ${idx + 1}`}
                        </h4>
                        <p className="mt-2 text-gray-700">{section.summary || 'No summary available.'}</p>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                                <p className="font-bold text-blue-700 mb-2">Key Points</p>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {(section.keyPoints || []).map((point, pointIdx) => <li key={pointIdx}>• {point}</li>)}
                                </ul>
                            </div>
                            <div className="rounded-xl bg-green-50 p-4 border border-green-100">
                                <p className="font-bold text-green-700 mb-2">Exam Tips</p>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {(section.examTips || []).map((tip, tipIdx) => <li key={tipIdx}>• {tip}</li>)}
                                </ul>
                            </div>
                            <div className="rounded-xl bg-purple-50 p-4 border border-purple-100">
                                <p className="font-bold text-purple-700 mb-2">Likely Questions</p>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    {(section.likelyQuestions || []).map((question, questionIdx) => <li key={questionIdx}>• {question}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}

                {Array.isArray(notesData.mustRemember) && notesData.mustRemember.length > 0 && (
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                        <p className="font-bold text-red-700 mb-3">Must Remember Before Exam</p>
                        <ul className="space-y-2 text-gray-700">
                            {notesData.mustRemember.map((item, idx) => <li key={idx}>• {item}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const renderMindMap = () => {
        if (!mindMapData) {
            return (
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-gray-600">
                    No mind map was generated.
                </div>
            );
        }

        const branches = (mindMapData.branches || []).slice(0, 6);
        const branchColors = [
            { bubble: '#fde68a', border: '#d97706', line: '#f59e0b', chip: '#fff7d6' },
            { bubble: '#bfdbfe', border: '#2563eb', line: '#3b82f6', chip: '#eaf2ff' },
            { bubble: '#fecaca', border: '#dc2626', line: '#ef4444', chip: '#fff0f0' },
            { bubble: '#bbf7d0', border: '#059669', line: '#10b981', chip: '#ecfff3' },
            { bubble: '#ddd6fe', border: '#7c3aed', line: '#8b5cf6', chip: '#f2ebff' },
            { bubble: '#fed7aa', border: '#ea580c', line: '#f97316', chip: '#fff3e8' },
        ];
        const leftBranches = branches.filter((_, idx) => idx % 2 === 0);
        const rightBranches = branches.filter((_, idx) => idx % 2 === 1);
        return (
            <div className="space-y-6">
                <div
                    className="relative overflow-hidden rounded-[32px] border-2 border-gray-200 p-6 md:p-10"
                    style={{
                        background: 'radial-gradient(circle at top, rgba(255,255,255,0.98), rgba(250,248,240,0.98) 56%, rgba(245,241,232,0.98) 100%)',
                        boxShadow: 'var(--shadow-cutout)',
                    }}
                >
                    <div className="pointer-events-none absolute inset-0 opacity-70" style={{
                        backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(162,155,254,0.16) 0 2px, transparent 2px), radial-gradient(circle at 84% 16%, rgba(255,107,107,0.14) 0 2px, transparent 2px), radial-gradient(circle at 78% 80%, rgba(76,205,196,0.16) 0 2px, transparent 2px), radial-gradient(circle at 18% 76%, rgba(248,183,57,0.18) 0 2px, transparent 2px)',
                        backgroundSize: '180px 180px',
                    }} />

                    <div className="relative grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="rounded-[24px] border-2 border-gray-200 bg-white/90 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500">Organic Mind Mapping</p>
                            <h3 className="mt-3 text-2xl font-bold text-gray-800" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                {mindMapData.centralTopic || 'Mind Map'}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-gray-600">
                                {mindMapData.quickSummary || 'No summary generated.'}
                            </p>
                            <div className="mt-6 space-y-4">
                                {branches.map((branch, idx) => {
                                    const color = branchColors[idx % branchColors.length];
                                    return (
                                        <div key={`${branch.title}-${idx}`} className="border-l-4 pl-3" style={{ borderColor: color.border }}>
                                            <p className="font-bold text-gray-800">{branch.title || `Branch ${idx + 1}`}</p>
                                            <ul className="mt-1 space-y-1 text-sm text-gray-600">
                                                {(branch.children || []).slice(0, 3).map((child, childIdx) => <li key={childIdx}>• {child}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>

                        <div className="relative rounded-[28px] border-2 border-gray-200 bg-white/70 p-6 md:p-8 xl:p-10">
                            <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)]">
                                <div className="space-y-10 pt-4">
                                    {leftBranches.map((branch, laneIdx) => {
                                        const idx = laneIdx * 2;
                                        const color = branchColors[idx % branchColors.length];
                                        return (
                                            <div key={`${branch.title}-${idx}`} className="flex items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex justify-end">
                                                        <div
                                                            className="max-w-full rounded-[999px] border-[3px] px-6 py-4 text-right"
                                                            style={{ background: color.bubble, borderColor: color.border, boxShadow: `0 10px 24px ${color.line}22` }}
                                                        >
                                                            <p className="text-2xl font-bold text-gray-800 break-words" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                                                {branch.title || `Branch ${idx + 1}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mr-2 ml-auto h-10 w-24 rounded-t-full border-l-[4px] border-t-[4px]" style={{ borderColor: color.line }} />
                                                    {branch.examAngle && (
                                                        <p className="mb-3 text-right text-sm font-semibold italic text-gray-600">{branch.examAngle}</p>
                                                    )}
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        {(branch.children || []).map((child, childIdx) => (
                                                            <div
                                                                key={childIdx}
                                                                className="rounded-full border px-4 py-2 text-sm text-gray-700"
                                                                style={{ background: color.chip, borderColor: `${color.border}66` }}
                                                            >
                                                                {child}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-center py-10 xl:min-h-[760px]">
                                    <div
                                        className="z-20 flex h-[260px] w-[260px] flex-col items-center justify-center rounded-[999px] border-[4px] px-8 text-center"
                                        style={{ background: '#fde68a', borderColor: '#ca8a04', boxShadow: '0 18px 36px rgba(202, 138, 4, 0.24)' }}
                                    >
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Core Topic</p>
                                        <h4 className="mt-3 text-4xl font-bold leading-tight text-amber-900 break-words" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                            {mindMapData.centralTopic || 'Mind Map'}
                                        </h4>
                                        {mindMapData.quickSummary && (
                                            <p className="mt-4 text-sm leading-5 text-amber-900/80">{mindMapData.quickSummary}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-10 pt-4">
                                    {rightBranches.map((branch, laneIdx) => {
                                        const idx = laneIdx * 2 + 1;
                                        const color = branchColors[idx % branchColors.length];
                                        return (
                                            <div key={`${branch.title}-${idx}`} className="flex items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex justify-start">
                                                        <div
                                                            className="max-w-full rounded-[999px] border-[3px] px-6 py-4 text-left"
                                                            style={{ background: color.bubble, borderColor: color.border, boxShadow: `0 10px 24px ${color.line}22` }}
                                                        >
                                                            <p className="text-2xl font-bold text-gray-800 break-words" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                                                {branch.title || `Branch ${idx + 1}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="ml-2 h-10 w-24 rounded-t-full border-r-[4px] border-t-[4px]" style={{ borderColor: color.line }} />
                                                    {branch.examAngle && (
                                                        <p className="mb-3 text-sm font-semibold italic text-gray-600">{branch.examAngle}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {(branch.children || []).map((child, childIdx) => (
                                                            <div
                                                                key={childIdx}
                                                                className="rounded-full border px-4 py-2 text-sm text-gray-700"
                                                                style={{ background: color.chip, borderColor: `${color.border}66` }}
                                                            >
                                                                {child}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Show generated content
    if (generatedContent) {
        return (
            <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface overflow-auto">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => { setGeneratedContent(null); setSelectedOption(null); setGenerationError(''); setShowMcqAnswers(false); }}
                        className="mb-6 px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                        ← Back to Options
                    </button>

                    <div className="bg-white rounded-2xl p-8 cutout shadow-lg border-2 border-gray-300">
                        {generationError && (
                            <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {generationError}
                            </div>
                        )}
                        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            {selectedOption === 1 && '📝 Generated Study Notes'}
                            {selectedOption === 2 && '🃏 Your Flashcards'}
                            {selectedOption === 3 && '🧠 Mind Map'}
                            {selectedOption === 4 && '❓ MCQ Quiz'}
                        </h2>

                        {selectedOption === 2 && Array.isArray(generatedContent) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <style>{`
                                    .flip-card-container { width: 100%; height: 280px; cursor: pointer; }
                                    .flip-card-content { width: 100%; height: 100%; position: relative; }
                                    .flip-card-front,
                                    .flip-card-back {
                                        position: absolute;
                                        inset: 0;
                                        transition: opacity 0.25s ease, transform 0.25s ease;
                                    }
                                    .flip-card-front { opacity: 1; transform: translateY(0); }
                                    .flip-card-back { opacity: 0; transform: translateY(8px); pointer-events: none; }
                                    .flip-card-container:hover .flip-card-front { opacity: 0; transform: translateY(-8px); }
                                    .flip-card-container:hover .flip-card-back { opacity: 1; transform: translateY(0); }
                                `}</style>
                                {generatedContent.map((card, idx) => (
                                    <div key={idx} className="flip-card-container">
                                        <div className="flip-card-content cutout shadow-md">
                                            {/* Question Side (visible initially) */}
                                            <div className="flip-card-front bg-yellow-50 border-2 border-gray-300 p-6 flex flex-col" style={{ boxShadow: '3px 5px 3px rgba(0,0,0,0.15)' }}>
                                                <div className="absolute top-3 left-3 px-3 py-1 rounded bg-yellow-200 border-2 border-gray-400 text-xs font-bold" style={{ color: '#333' }}>❓ Question</div>
                                                <div className="absolute top-3 right-3 text-xs text-gray-400">{idx + 1}/{generatedContent.length}</div>
                                                <div className="flex-1 flex items-center justify-center mt-4">
                                                    <p className="text-lg font-handwritten text-center text-gray-800" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                                        {card.question}
                                                    </p>
                                                </div>
                                                <p className="text-center text-sm text-gray-500">✏️ Hover to see answer</p>
                                            </div>
                                            {/* Answer Side (visible on hover) */}
                                            <div className="flip-card-back bg-green-50 border-2 border-gray-300 p-6 flex flex-col" style={{ boxShadow: '3px 5px 3px rgba(0,0,0,0.15)' }}>
                                                <div className="absolute top-3 left-3 px-3 py-1 rounded bg-green-200 border-2 border-gray-400 text-xs font-bold" style={{ color: '#333' }}>✅ Answer</div>
                                                <div className="flex-1 flex items-center justify-center mt-4">
                                                    <p className="text-lg font-handwritten text-center text-gray-800" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                                        {card.answer}
                                                    </p>
                                                </div>
                                                <p className="text-center text-sm text-gray-500">← Hover for question</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedOption === 4 && Array.isArray(generatedContent) && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 bg-white/80 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Answer Visibility</p>
                                        <p className="text-xs text-gray-500">Toggle correct answers and explanations for self-testing.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowMcqAnswers((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-full border-2 border-gray-300 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
                                    >
                                        {showMcqAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
                                        {showMcqAnswers ? 'Hide Answers' : 'Show Answers'}
                                    </button>
                                </div>
                                {generatedContent.length === 0 && (
                                    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-gray-600">
                                        No MCQ questions were generated.
                                    </div>
                                )}
                                {generatedContent.map((q, idx) => (
                                    <div key={idx} className="p-5 bg-blue-50 border-2 border-gray-200 rounded-xl">
                                        <p className="font-bold text-gray-800 mb-3">Q{idx + 1}: {q.question}</p>
                                        <div className="space-y-2 ml-4">
                                            {q.options?.map((opt, oidx) => (
                                                <div key={oidx} className={`p-3 rounded-lg ${showMcqAnswers && opt === q.correctAnswer ? 'bg-green-200 font-bold border border-green-300' : 'bg-gray-100 border border-gray-200'}`}>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                        {showMcqAnswers && q.explanation && (
                                            <div className="mt-4 rounded-lg bg-white/70 border border-blue-100 p-3 text-sm text-gray-700">
                                                <span className="font-bold text-blue-700">Why:</span> {q.explanation}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedOption === 1 && renderStudyNotes()}

                        {selectedOption === 3 && renderMindMap()}
                    </div>
                </div>
            </div>
        );
    }

    // Show file selection if option selected
    if (selectedOption) {
        return (
            <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => { setSelectedOption(null); setGenerationError(''); setShowMcqAnswers(false); }}
                        className="mb-6 px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                        ← Back
                    </button>

                    <div className="bg-white rounded-2xl p-8 cutout shadow-lg border-2 border-gray-300">
                        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            {menuOptions.find(o => o.id === selectedOption)?.title}
                        </h2>
                        <p className="text-gray-600 mb-6 font-handwritten">
                            {menuOptions.find(o => o.id === selectedOption)?.desc}
                        </p>
                        {generationError && (
                            <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {generationError}
                            </div>
                        )}

                        {/* Question count input for Flashcards and MCQ */}
                        {(selectedOption === 2 || selectedOption === 4) && (
                            <div className="mb-6">
                                <label className="block text-gray-700 font-bold mb-2">
                                    How many {selectedOption === 2 ? 'cards' : 'questions'}?
                                </label>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl bg-white font-handwritten"
                                >
                                    {[5, 10, 15, 20, 25, 30].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* File selection */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">
                                Select files to generate from:
                            </label>
                            {availableFiles.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {availableFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => toggleFileSelection(file)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${selectedFiles.some(f => f.id === file.id)
                                                ? 'bg-yellow-200 border-yellow-400'
                                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <File size={16} className="text-gray-500" />
                                            <span className="text-gray-700 truncate">{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No files available. Upload files first! 📁</p>
                            )}
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || selectedFiles.length === 0}
                            className="w-full py-4 bg-yellow-300 text-gray-800 font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 cutout shadow-md border-2 border-gray-300 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>Generating... ⏳</>
                            ) : (
                                <>✨ Generate {selectedOption === 2 ? `${questionCount} Cards` : selectedOption === 4 ? `${questionCount} Questions` : ''}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show main menu
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface overflow-auto">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-title text-gray-800 mb-2" style={{ fontFamily: 'Changa One, cursive' }}>
                    📓 Smart Notes
                </h1>
                <p className="text-gray-600 mb-8 font-handwritten text-lg">
                    Choose what you want to create from your study materials! ✏️
                </p>

                <div className="grid grid-cols-2 gap-6">
                    {menuOptions.map(option => (
                        <MotionDiv
                            key={option.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedOption(option.id)}
                            className={`p-6 rounded-2xl border-2 ${option.borderColor} ${option.color} cursor-pointer hover:shadow-lg transition-all cutout`}
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <option.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                                    {option.title}
                                </h3>
                            </div>
                            <p className="text-gray-600 font-handwritten">{option.desc}</p>
                            <div className="mt-4 flex items-center text-sm font-bold text-gray-500">
                                Click to start <ChevronRight size={16} />
                            </div>
                        </MotionDiv>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SmartNotes;
