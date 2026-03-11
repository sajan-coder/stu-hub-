import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Clock, MessageSquare, Trash2, Plus, ChevronRight, Search, History, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHistory = ({ authToken, activeSessionId, onSelectSession, onNewSession }) => {
    const [sessions, setSessions] = useState([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        if (!authToken) {
            setSessions([]);
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/history/sessions', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setSessions(data.data || []);
        } catch (err) {
            console.error('Failed to load session history:', err);
        } finally {
            setIsLoading(false);
        }
    }, [authToken]);

    useEffect(() => {
        fetchSessions();
        // Poll every 5 seconds for new chats
        const interval = setInterval(fetchSessions, 5000);
        const handleRefresh = () => fetchSessions();
        window.addEventListener('history-refresh', handleRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('history-refresh', handleRefresh);
        };
    }, [fetchSessions]);

    const filteredSessions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sessions;
        return sessions.filter((s) => (s.title || '').toLowerCase().includes(q));
    }, [sessions, query]);

    // Group sessions by date
    const groupedSessions = useMemo(() => {
        const groups = {};
        for (const s of filteredSessions) {
            const d = new Date(s.timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            let label;
            if (d.toDateString() === today.toDateString()) label = 'Today';
            else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
            else label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

            if (!groups[label]) groups[label] = [];
            groups[label].push(s);
        }
        return groups;
    }, [filteredSessions]);

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

    const deleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!window.confirm('Delete this chat session permanently?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/history?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
                if (activeSessionId === sessionId) onNewSession?.();
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    return (
        <div className="flex flex-col h-full font-inter">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#F1F1F0] flex items-center justify-center text-[#1A1A1A]">
                        <History size={14} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-[11px] font-black text-[#1A1A1A] uppercase tracking-[0.2em]">Neural Logs</h3>
                </div>
                <button
                    onClick={clearAllHistory}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-[#DCDCDA] transition-all"
                    title="Clear All Logs"
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {/* New Session Button */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onNewSession?.()}
                className="w-full flex items-center gap-3 p-3.5 mb-6 rounded-xl bg-[#111111] text-white hover:bg-[#222] transition-all shadow-lg active:scale-[0.98]"
            >
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                    <Plus size={14} strokeWidth={3} />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-widest">New Session</span>
            </motion.button>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BBBBB9]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search past chats..."
                    className="w-full bg-[#F9F9F8] border border-[#F1F1F0] rounded-xl py-2.5 pl-10 pr-4 text-[12px] font-medium outline-none focus:border-[#DCDCDA] focus:bg-white transition-all placeholder:text-[#C0C0BE]"
                />
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar -mr-2 pr-2">
                {isLoading ? (
                    <div className="py-16 flex flex-col items-center gap-3">
                        <Loader size={18} className="animate-spin text-[#DCDCDA]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C0C0BE]">Syncing Logs...</span>
                    </div>
                ) : Object.keys(groupedSessions).length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <div className="w-10 h-10 rounded-xl bg-[#F1F1F0] flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={18} className="text-[#DCDCDA]" />
                        </div>
                        <p className="text-[11px] font-semibold text-[#C0C0BE] leading-relaxed">
                            No stored conversations yet.
                        </p>
                        <p className="text-[10px] text-[#DCDCDA] mt-1">Start a new session to begin.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {Object.entries(groupedSessions).map(([dateLabel, group]) => (
                            <div key={dateLabel} className="mb-4">
                                {/* Date Group Label */}
                                <div className="px-1 mb-2 flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#BBBBB9]">
                                        {dateLabel}
                                    </span>
                                    <div className="flex-1 h-px bg-[#F1F1F0]" />
                                </div>

                                {/* Session Items */}
                                <div className="space-y-1">
                                    {group.map((session) => {
                                        const isActive = activeSessionId === session.session_id;
                                        return (
                                            <motion.div
                                                key={session.session_id}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className={`group flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-200 ${isActive
                                                        ? 'bg-[#111111] text-white shadow-lg'
                                                        : 'text-[#1A1A1A] hover:bg-[#F5F5F4]'
                                                    }`}
                                                onClick={() => onSelectSession?.(session.session_id)}
                                            >
                                                {/* Icon */}
                                                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/10' : 'bg-[#F1F1F0] group-hover:bg-[#E8E8E7]'
                                                    }`}>
                                                    <MessageSquare size={11} className={isActive ? 'text-white' : 'text-[#A1A1A0]'} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[12px] font-semibold line-clamp-2 leading-snug ${isActive ? 'text-white' : 'text-[#1A1A1A]'
                                                        }`}>
                                                        {session.title || 'Untitled chat'}
                                                    </p>
                                                    <span className={`text-[10px] mt-1 block ${isActive ? 'text-white/40' : 'text-[#BBBBB9]'
                                                        }`}>
                                                        {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Delete button */}
                                                <button
                                                    onClick={(e) => deleteSession(e, session.session_id)}
                                                    className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${isActive
                                                            ? 'text-white/50 hover:text-white hover:bg-white/10'
                                                            : 'text-[#DCDCDA] hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                    title="Delete session"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default ChatHistory;
