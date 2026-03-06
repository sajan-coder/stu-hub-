import React, { useEffect, useMemo, useState } from 'react';
import { Clock, MessageSquare, Trash2, Plus, ChevronRight, Search, History } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const ChatHistory = ({ authToken, activeSessionId, onSelectSession, onNewSession }) => {
    const [sessions, setSessions] = useState([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchSessions = async () => {
        if (!authToken) {
            setSessions([]);
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/history/sessions', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            setSessions(data.data || []);
        } catch (err) {
            console.error('Failed to load session history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        const handleRefresh = () => fetchSessions();
        window.addEventListener('history-refresh', handleRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('history-refresh', handleRefresh);
        };
    }, [authToken]);

    const filteredSessions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sessions;
        return sessions.filter((s) => (s.title || '').toLowerCase().includes(q));
    }, [sessions, query]);

    const clearAllHistory = async () => {
        if (!window.confirm('Clear all historical neural traces?')) return;
        try {
            const res = await fetch('http://localhost:5000/api/history', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                setSessions([]);
                onNewSession?.();
            }
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
    };

    const deleteSession = async (sessionId) => {
        if (!window.confirm('Delete this chat session permanently?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/history?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
                if (activeSessionId === sessionId) {
                    onNewSession?.();
                }
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    return (
        <div className="flex flex-col h-full font-inter">
            <div className="flex items-center justify-between mb-8 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F1F1F0] flex items-center justify-center text-[#1A1A1A]">
                        <History size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-[11px] font-black text-[#1A1A1A] uppercase tracking-[0.2em]">Neural Logs</h3>
                </div>
                <button
                    onClick={clearAllHistory}
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-[#A1A1A0] transition-all"
                    title="Clear All Logs"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <button
                onClick={() => onNewSession?.()}
                className="w-full flex items-center gap-3 p-4 mb-8 rounded-xl bg-black text-white hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
            >
                <Plus size={16} strokeWidth={3} />
                <span className="text-[13px] font-bold uppercase tracking-widest">New Session</span>
            </button>

            <div className="relative mb-8">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1A0]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search past chats..."
                    className="w-full bg-[#FBFBFA] border border-[#F1F1F0] rounded-xl py-3 pl-11 pr-4 text-[13px] font-medium outline-none focus:border-[#DCDCDA] transition-all"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                        <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Logs...</span>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="py-20 text-center px-6">
                        <MessageSquare size={24} className="mx-auto text-[#DCDCDA] mb-4 opacity-40" />
                        <p className="text-[12px] font-medium text-[#A1A1A0] leading-relaxed">
                            No stored conversations found yet.
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredSessions.map((session) => (
                            <div
                                key={session.session_id}
                                className={`group p-4 border rounded-xl cursor-pointer transition-all ${activeSessionId === session.session_id
                                    ? 'bg-[#F9F9F8] border-[#DCDCDA] shadow-sm'
                                    : 'bg-white border-[#F1F1F0] hover:border-[#E8E8E7] hover:shadow-sm'
                                    }`}
                                onClick={() => onSelectSession?.(session.session_id)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-[#A1A1A0] uppercase tracking-widest">
                                        <Clock size={10} /> {new Date(session.timestamp).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteSession(session.session_id);
                                            }}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#D0D0CF] hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete this session"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                        <ChevronRight size={12} className="text-[#DCDCDA] group-hover:text-black transition-colors" />
                                    </div>
                                </div>
                                <p className="text-[13px] font-semibold text-[#1A1A1A] line-clamp-2 leading-snug">
                                    {session.title}
                                </p>
                            </div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default ChatHistory;
