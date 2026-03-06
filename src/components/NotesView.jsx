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
        <div className="flex-1 ml-[72px] bg-[#F8F8F7] min-h-screen py-20 px-24 font-inter">
            <header className="flex justify-between items-end mb-16 max-w-6xl mx-auto">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-3 bg-[#111111] rounded-full" />
                        <span className="text-[10px] font-bold text-[#A1A1A0] uppercase tracking-[0.2em]">Repository / Neural_Synthesis</span>
                    </div>
                    <h1 className="text-[40px] font-semibold tracking-tight text-[#1A1A1A] leading-tight">
                        Knowledge Vault.
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1A0] group-focus-within:text-black transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter partitions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 pl-11 pr-6 bg-white border border-[#E8E8E7] rounded-xl text-[13px] font-medium outline-none focus:border-[#111111] transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button className="h-11 px-6 bg-black text-white rounded-xl font-semibold text-[13px] flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-xl">
                        <Plus size={14} strokeWidth={2.5} /> New Note
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
                            className="bg-white border border-[#E8E8E7] rounded-2xl p-8 hover:shadow-xl hover:border-[#DCDCDA] transition-all group flex flex-col h-[320px]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-2.5 bg-[#FBFBFA] border border-[#F1F1F0] rounded-lg text-[#1A1A1A]">
                                    <StickyNote size={18} />
                                </div>
                                <span className="text-[10px] font-black text-[#DCDCDA] uppercase tracking-widest">{new Date(note.timestamp).toLocaleDateString()}</span>
                            </div>

                            <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-3 group-hover:text-black transition-colors">{note.title}</h3>
                            <p className="text-[14px] leading-relaxed text-[#A1A1A0] font-medium line-clamp-5 mb-auto">
                                {note.content}
                            </p>

                            <div className="mt-8 pt-6 border-t border-[#F1F1F0] flex items-center justify-between">
                                <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#FBFBFA] border border-[#F1F1F0]">
                                    <Hash size={10} className="text-[#A1A1A0]" />
                                    <span className="text-[9px] font-bold text-[#5F5F5E] uppercase tracking-widest">{note.subject || 'Research'}</span>
                                </div>
                                <button className="text-[#DCDCDA] hover:text-[#1A1A1A] transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredNotes.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center">
                        <div className="w-16 h-16 bg-white border border-[#E8E8E7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Hash size={24} className="text-[#DCDCDA]" />
                        </div>
                        <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-2 uppercase tracking-widest">No matching nodes</h4>
                        <p className="text-[13px] font-medium text-[#A1A1A0]">Your filter query did not return any serialized notes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesView;
