import React, { useState, useEffect } from 'react';
import { Sparkles, File, BookOpen, Brain, Map, HelpCircle, X, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SmartNotes = ({ authToken }) => {
    const [selectedOption, setSelectedOption] = useState(null); // 1=Notes, 2=Flashcards, 3=MindMap, 4=MCQ
    const [generatedContent, setGeneratedContent] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [questionCount, setQuestionCount] = useState(5);

    const fetchAvailableFiles = async () => {
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
    };

    useEffect(() => { fetchAvailableFiles(); }, [authToken]);

    const toggleFileSelection = (file) => {
        setSelectedFiles(prev => prev.some(f => f.id === file.id) ? prev.filter(f => f.id !== file.id) : [...prev, file]);
    };

    const handleGenerate = async () => {
        if (selectedFiles.length === 0) { alert('Please select at least one file!'); return; }
        setIsGenerating(true);

        try {
            let endpoint = '';
            let body = {};

            switch (selectedOption) {
                case 1: // Study Notes
                    endpoint = 'http://localhost:5000/api/notes/generate';
                    body = { fileIds: selectedFiles.map(f => f.id) };
                    break;
                case 2: // Flashcards
                    endpoint = 'http://localhost:5000/api/flashcards/generate';
                    body = { fileIds: selectedFiles.map(f => f.id), numCards: questionCount };
                    break;
                case 3: // Mind Map
                    endpoint = 'http://localhost:5000/api/mindmap/generate';
                    body = { fileIds: selectedFiles.map(f => f.id) };
                    break;
                case 4: // MCQ
                    endpoint = 'http://localhost:5000/api/mcq/generate';
                    body = { fileIds: selectedFiles.map(f => f.id), numQuestions: questionCount };
                    break;
                default:
                    setIsGenerating(false);
                    return;
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedContent(data.data || []);
            }
        } catch (err) {
            console.error(err);
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

    // Show generated content
    if (generatedContent) {
        return (
            <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface overflow-auto">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => { setGeneratedContent(null); setSelectedOption(null); }}
                        className="mb-6 px-4 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                        ← Back to Options
                    </button>

                    <div className="bg-white rounded-2xl p-8 cutout shadow-lg border-2 border-gray-300">
                        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            {selectedOption === 1 && '📝 Generated Study Notes'}
                            {selectedOption === 2 && '🃏 Your Flashcards'}
                            {selectedOption === 3 && '🧠 Mind Map'}
                            {selectedOption === 4 && '❓ MCQ Quiz'}
                        </h2>

                        {selectedOption === 2 && Array.isArray(generatedContent) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <style>{`
                                    .flip-card-container { width: 100%; height: 280px; perspective: 1000px; cursor: pointer; }
                                    .flip-card-content { width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s; position: relative; }
                                    .flip-card-container:hover .flip-card-content { transform: rotateY(180deg); }
                                    .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                                    .flip-card-front { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg); }
                                `}</style>
                                {generatedContent.map((card, idx) => (
                                    <div key={idx} className="flip-card-container">
                                        <div className="flip-card-content cutout shadow-md">
                                            {/* Question Side (visible initially) */}
                                            <div className="flip-card-back bg-yellow-50 border-2 border-gray-300 p-6 flex flex-col" style={{ boxShadow: '3px 5px 3px rgba(0,0,0,0.15)' }}>
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
                                            <div className="flip-card-front bg-green-50 border-2 border-gray-300 p-6 flex flex-col" style={{ boxShadow: '3px 5px 3px rgba(0,0,0,0.15)' }}>
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
                                {generatedContent.map((q, idx) => (
                                    <div key={idx} className="p-4 bg-blue-50 border-2 border-gray-200 rounded-xl">
                                        <p className="font-bold text-gray-800 mb-3">Q{idx + 1}: {q.question}</p>
                                        <div className="space-y-2 ml-4">
                                            {q.options?.map((opt, oidx) => (
                                                <div key={oidx} className={`p-2 rounded-lg ${opt === q.correctAnswer ? 'bg-green-200 font-bold' : 'bg-gray-100'}`}>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(selectedOption === 1 || selectedOption === 3) && (
                            <pre className="whitespace-pre-wrap text-gray-700 font-handwritten">{JSON.stringify(generatedContent, null, 2)}</pre>
                        )}
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
                        onClick={() => setSelectedOption(null)}
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
                        <motion.div
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
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SmartNotes;
