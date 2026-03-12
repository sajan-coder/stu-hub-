import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Search, Plus, Calendar, ChevronRight, Hash, Trash2 } from 'lucide-react';

const NotesView = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchNotes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/notes');
            const data = await res.json();
            setNotes(data.data || []);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const filteredNotes = notes.filter(n =>
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 ml-[72px] min-h-screen notebook-surface py-20 px-24 font-handwritten">
            <header className="flex justify-between items-end mb-16 max-w-6xl mx-auto">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-3 bg-yellow-500 rounded-full" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">📝 My Notes</span>
                    </div>
                    <h1 className="text-5xl font-title text-gray-800 leading-tight" style={{ fontFamily: 'Changa One, cursive' }}>
                        📓 My Notebook
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 pl-11 pr-6 bg-yellow-50 border-2 border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-yellow-400 transition-all w-64 cutout shadow-sm"
                        />
                    </div>
                    <button className="h-11 px-6 bg-yellow-300 text-gray-800 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-yellow-400 transition-all cutout shadow-md border-2 border-gray-400">
                        <Plus size={14} strokeWidth={2.5} /> 📝 New Note
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                    {filteredNotes.map((note, i) => (
                        <motion.div
                            key={note.id || i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-yellow-50 border-2 border-gray-300 rounded-2xl p-6 hover:shadow-lg hover:border-yellow-300 transition-all group flex flex-col h-[280px] cutout"
                            style={{ transform: `rotate(${Math.random() * 4 - 2}deg)` }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-pink-200 border-2 border-gray-400 rounded-lg text-gray-700">
                                    <StickyNote size={18} />
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(note.timestamp).toLocaleDateString()}</span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-black transition-colors" style={{ fontFamily: 'Patrick Hand, cursive' }}>{note.title}</h3>
                            <p className="text-sm leading-relaxed text-gray-600 font-handwritten line-clamp-5 mb-auto">
                                {note.content}
                            </p>

                            <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 flex items-center justify-between">
                                <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-100 border-2 border-gray-300">
                                    <Hash size={10} className="text-gray-500" />
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{note.subject || 'General'}</span>
                                </div>
                                <button className="text-gray-400 hover:text-gray-700 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredNotes.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center">
                        <div className="w-16 h-16 bg-yellow-50 border-2 border-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6 cutout shadow-sm">
                            <Hash size={24} className="text-gray-400" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-700 mb-2 uppercase tracking-widest" style={{ fontFamily: 'Changa One, cursive' }}>No Notes Yet! 📝</h4>
                        <p className="text-sm font-handwritten text-gray-500">Start doodling your thoughts...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesView;
