import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    File,
    Plus,
    Trash2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    X,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FlashcardGenerator = ({ authToken }) => {
    const [flashcards, setFlashcards] = useState([]);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showFileSelector, setShowFileSelector] = useState(false);

    // Fetch available files from the vault
    const fetchAvailableFiles = async () => {
        if (!authToken) return;
        try {
            const res = await fetch('http://localhost:5000/api/files', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            setAvailableFiles(data.data || []);
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    };

    useEffect(() => {
        fetchAvailableFiles();
    }, [authToken]);

    // Generate flashcards using RAG
    const generateFlashcards = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select at least one file to generate flashcards from.');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('http://localhost:5000/api/flashcards/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    fileIds: selectedFiles.map(f => f.id),
                    count: 10
                }),
            });

            const data = await res.json();
            if (data.data && Array.isArray(data.data)) {
                setFlashcards(data.data);
                setCurrentCardIndex(0);
                setIsFlipped(false);
            }
        } catch (err) {
            console.error('Failed to generate flashcards:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Toggle file selection
    const toggleFileSelection = (file) => {
        setSelectedFiles(prev => {
            const exists = prev.find(f => f.id === file.id);
            if (exists) {
                return prev.filter(f => f.id !== file.id);
            }
            return [...prev, file];
        });
    };

    // Navigation
    const nextCard = () => {
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    // Delete a flashcard
    const deleteFlashcard = (index) => {
        setFlashcards(prev => prev.filter((_, i) => i !== index));
        if (currentCardIndex >= flashcards.length - 1) {
            setCurrentCardIndex(Math.max(0, flashcards.length - 2));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#B026FF] flex items-center justify-center">
                        <Sparkles size={20} className="text-black" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase text-[#F0F4F8] tracking-wide">Flashcard Deck</h3>
                        <p className="text-xs text-[#F0F4F8]/50">AI-powered from your documents</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowFileSelector(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] hover:bg-[#00F5FF]/20 transition-all text-xs font-bold uppercase"
                >
                    <Plus size={14} />
                    Add Source Files
                </button>
            </div>

            {/* Selected Files Pills */}
            {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#B026FF]/20 border border-[#B026FF]/40 text-[#F0F4F8] text-xs">
                            <File size={12} />
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button onClick={() => toggleFileSelection(file)} className="hover:text-[#FF6B6B]">
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={generateFlashcards}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00F5FF] text-black text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw size={12} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} />
                                Generate Cards
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Flashcard Display */}
            {flashcards.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                    {/* Card Counter */}
                    <div className="text-xs text-[#F0F4F8]/50 font-mono">
                        {currentCardIndex + 1} / {flashcards.length}
                    </div>

                    {/* Flip Card */}
                    <div
                        className="flip-card-content cursor-pointer w-full max-w-[400px] h-[280px]"
                        onClick={() => setIsFlipped(!isFlipped)}
                        style={{ perspective: '1000px' }}
                    >
                        <motion.div
                            className="relative w-full h-full"
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Front - Question */}
                            <div
                                className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                }}
                            >
                                {/* Decorative circles */}
                                <div className="absolute top-0 left-0 w-32 h-32 bg-[#00F5FF]/20 rounded-full filter blur-[40px]" />
                                <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#B026FF]/20 rounded-full filter blur-[40px]" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1 rounded-full bg-[#00F5FF]/20 border border-[#00F5FF]/40 text-[#00F5FF] text-[10px] font-bold uppercase tracking-wider">
                                            Question
                                        </span>
                                    </div>
                                    <p className="text-[#F0F4F8] text-lg font-semibold leading-relaxed">
                                        {flashcards[currentCardIndex]?.question}
                                    </p>
                                </div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <p className="text-[10px] text-[#F0F4F8]/40 uppercase tracking-widest">Hover to reveal answer</p>
                                    <BookOpen size={20} className="text-[#00F5FF]/60" />
                                </div>
                            </div>

                            {/* Back - Answer */}
                            <div
                                className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    background: 'linear-gradient(145deg, rgba(176, 38, 255, 0.15) 0%, rgba(0, 245, 255, 0.08) 100%)',
                                    border: '1px solid rgba(176, 38, 255, 0.3)',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                }}
                            >
                                {/* Decorative circles */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B026FF]/30 rounded-full filter blur-[40px]" />
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#00F5FF]/20 rounded-full filter blur-[40px]" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1 rounded-full bg-[#B026FF]/30 border border-[#B026FF]/50 text-[#B026FF] text-[10px] font-bold uppercase tracking-wider">
                                            Answer
                                        </span>
                                    </div>
                                    <p className="text-[#F0F4F8] text-base font-medium leading-relaxed">
                                        {flashcards[currentCardIndex]?.answer}
                                    </p>
                                </div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <p className="text-[10px] text-[#F0F4F8]/40 uppercase tracking-widest">Click to flip back</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteFlashcard(currentCardIndex); }}
                                        className="p-2 rounded-lg bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 text-[#FF6B6B] hover:bg-[#FF6B6B]/30 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={prevCard}
                            disabled={currentCardIndex === 0}
                            className="p-3 rounded-xl bg-[#F0F4F8]/10 border border-[#F0F4F8]/20 text-[#F0F4F8] hover:bg-[#F0F4F8]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex gap-1">
                            {flashcards.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setCurrentCardIndex(i); setIsFlipped(false); }}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentCardIndex
                                            ? 'bg-[#00F5FF] w-6'
                                            : 'bg-[#F0F4F8]/30 hover:bg-[#F0F4F8]/50'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={nextCard}
                            disabled={currentCardIndex === flashcards.length - 1}
                            className="p-3 rounded-xl bg-[#F0F4F8]/10 border border-[#F0F4F8]/20 text-[#F0F4F8] hover:bg-[#F0F4F8]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#F0F4F8]/5 border border-[#F0F4F8]/10 flex items-center justify-center mb-6">
                        <BookOpen size={40} className="text-[#F0F4F8]/30" />
                    </div>
                    <h4 className="text-xl font-bold text-[#F0F4F8] mb-2">No Flashcards Yet</h4>
                    <p className="text-sm text-[#F0F4F8]/50 max-w-xs mb-6">
                        Select source files from your vault and generate AI-powered flashcards instantly.
                    </p>
                    <button
                        onClick={() => setShowFileSelector(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#B026FF] text-black font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        <Sparkles size={16} />
                        Create Flashcards
                    </button>
                </div>
            )}

            {/* File Selector Modal */}
            <AnimatePresence>
                {showFileSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setShowFileSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0B0E14] border border-[#F0F4F8]/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[#F0F4F8]">Select Source Files</h3>
                                <button
                                    onClick={() => setShowFileSelector(false)}
                                    className="p-2 rounded-lg bg-[#F0F4F8]/10 text-[#F0F4F8] hover:bg-[#F0F4F8]/20 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                                {availableFiles.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-[#F0F4F8]/50 text-sm">No files available. Upload files in the Vault first.</p>
                                    </div>
                                ) : (
                                    availableFiles.map(file => (
                                        <button
                                            key={file.id}
                                            onClick={() => toggleFileSelection(file)}
                                            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedFiles.find(f => f.id === file.id)
                                                    ? 'bg-[#00F5FF]/10 border-[#00F5FF]/40'
                                                    : 'bg-[#F0F4F8]/5 border-[#F0F4F8]/10 hover:border-[#F0F4F8]/20'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedFiles.find(f => f.id === file.id)
                                                    ? 'bg-[#00F5FF] text-black'
                                                    : 'bg-[#F0F4F8]/10 text-[#F0F4F8]/50'
                                                }`}>
                                                {selectedFiles.find(f => f.id === file.id) ? (
                                                    <Check size={16} />
                                                ) : (
                                                    <File size={16} />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-medium text-[#F0F4F8] truncate">{file.name}</p>
                                                <p className="text-xs text-[#F0F4F8]/40">{Math.round(file.size / 1024)} KB</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => { generateFlashcards(); setShowFileSelector(false); }}
                                disabled={selectedFiles.length === 0 || isGenerating}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#B026FF] text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isGenerating ? 'Generating...' : `Generate Flashcards (${selectedFiles.length})`}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FlashcardGenerator;
