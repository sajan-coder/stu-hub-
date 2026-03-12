import { useState, useEffect } from 'react';
import { File, BookOpen, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const SimpleFlipCard = ({ card, onDelete, cardIndex, totalCards }) => {
    return (
        <div className="flip-card-container cutout mx-auto">
            <div className="flip-card-content">
                {/* Back Side - QUESTION */}
                <div className="flip-card-back" style={{
                    backgroundColor: '#fff9c4',
                    borderRadius: '12px',
                    border: '2px solid #ccc',
                    boxShadow: '3px 5px 3px rgba(0,0,0,0.15)',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Yellow notebook lines */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '12px',
                        backgroundImage: 'linear-gradient(rgba(255, 200, 0, 0.2) 1px, transparent 1px)',
                        backgroundSize: '100% 20px',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', zIndex: 10, color: '#2c3e50' }}>
                        <div className="absolute top-3 left-3 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-yellow-200 border-2 border-gray-400 transform rotate-2" style={{ color: '#333' }}>
                            ❓ Question
                        </div>
                        <div className="absolute top-3 right-3 text-xs font-mono text-gray-500">
                            {cardIndex + 1} / {totalCards}
                        </div>
                        <div className="flex-1 flex flex-col justify-center w-full text-center mt-6">
                            <p className="text-xl font-handwritten font-bold leading-relaxed" style={{ color: '#2c3e50', fontFamily: 'Patrick Hand, cursive' }}>
                                {card?.question}
                            </p>
                        </div>
                        <p className="text-sm font-handwritten text-gray-500">✏️ Hover to reveal answer</p>
                    </div>
                </div>

                {/* Front Side - ANSWER */}
                <div className="flip-card-front" style={{
                    backgroundColor: '#c8e6c9',
                    borderRadius: '12px',
                    border: '2px solid #ccc',
                    boxShadow: '3px 5px 3px rgba(0,0,0,0.15)',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Green notebook lines */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '12px',
                        backgroundImage: 'linear-gradient(rgba(149, 225, 163, 0.3) 1px, transparent 1px)',
                        backgroundSize: '100% 20px',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem', zIndex: 10, color: '#2c3e50' }}>
                        <div className="absolute top-3 left-3 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-green-200 border-2 border-gray-400 transform -rotate-1" style={{ color: '#333' }}>
                            ✅ Answer
                        </div>
                        <div className="flex-1 flex flex-col justify-center text-center mt-6">
                            <p className="text-xl font-handwritten font-bold leading-relaxed" style={{ color: '#2c3e50', fontFamily: 'Patrick Hand, cursive' }}>
                                {card?.answer}
                            </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm font-handwritten" style={{ color: '#666' }}>← Hover to see question</p>
                            <button onClick={(e) => { e.stopPropagation(); onDelete?.(card.id); }} className="p-2 rounded-lg hover:bg-red-100 transition-colors">
                                <Trash2 size={14} className="text-red-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FlashcardGenerator = ({ authToken }) => {
    const [flashcards, setFlashcards] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [cardCount, setCardCount] = useState(5);

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

    const generateFlashcards = async () => {
        if (selectedFiles.length === 0) { alert('Please select at least one file'); return; }
        setIsGenerating(true);
        try {
            const res = await fetch('http://localhost:5000/api/flashcards/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ fileIds: selectedFiles.map(f => f.id), numCards: cardCount }),
            });
            if (res.ok) {
                const data = await res.json();
                setFlashcards(data.data || []);
                setCurrentCardIndex(0);
            }
        } catch (err) { console.error(err); }
        finally { setIsGenerating(false); }
    };

    const toggleFileSelection = (file) => {
        setSelectedFiles(prev => prev.some(f => f.id === file.id) ? prev.filter(f => f.id !== file.id) : [...prev, file]);
    };

    const nextCard = () => { if (currentCardIndex < flashcards.length - 1) setCurrentCardIndex(prev => prev + 1); };
    const prevCard = () => { if (currentCardIndex > 0) setCurrentCardIndex(prev => prev - 1); };
    const deleteCard = (cardId) => { setFlashcards(prev => prev.filter(c => c.id !== cardId)); };

    return (
        <div className="w-full">
            <style>{`
                .flip-card-container { width: 320px; height: 380px; perspective: 1000px; cursor: pointer; }
                .flip-card-content { width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s; position: relative; }
                .flip-card-container:hover .flip-card-content { transform: rotateY(180deg); }
                .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                .flip-card-front { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg); }
            `}</style>
            {!authToken ? <div className="text-center py-16 text-gray-600">Please sign in</div> :
                flashcards.length === 0 ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-800">📝 Generate Flashcards</h2>
                            <select value={cardCount} onChange={(e) => setCardCount(Number(e.target.value))} className="bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-handwritten">
                                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        {availableFiles.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-gray-600 text-sm">Select files:</p>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {availableFiles.map(file => (
                                        <div key={file.id} onClick={() => toggleFileSelection(file)} className={`p-3 rounded-lg border-2 cursor-pointer flex items-center gap-3 transition-all ${selectedFiles.some(f => f.id === file.id) ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-gray-200'}`}>
                                            <File size={16} className="text-gray-500" />
                                            <span className="text-gray-700 text-sm truncate">{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={generateFlashcards} disabled={isGenerating || selectedFiles.length === 0} className="w-full py-3 px-6 rounded-xl bg-yellow-300 text-gray-800 font-bold disabled:opacity-50 flex items-center justify-center gap-2 cutout shadow-md border-2 border-gray-300">
                                    {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />} Generate {cardCount} Cards
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">No files available</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        <div className="flex items-center gap-4">
                            <button onClick={prevCard} disabled={currentCardIndex === 0} className="p-2 rounded-lg bg-gray-200 disabled:opacity-30">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-gray-600">{currentCardIndex + 1} / {flashcards.length}</span>
                            <button onClick={nextCard} disabled={currentCardIndex === flashcards.length - 1} className="p-2 rounded-lg bg-gray-200 disabled:opacity-30">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <SimpleFlipCard card={flashcards[currentCardIndex]} onDelete={deleteCard} cardIndex={currentCardIndex} totalCards={flashcards.length} />
                        <button onClick={() => { setFlashcards([]); setCurrentCardIndex(0); }} className="text-gray-600 hover:text-gray-800 text-sm">+ Generate More</button>
                    </div>
                )}
        </div>
    );
};

export default FlashcardGenerator;
