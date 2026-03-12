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
        <div className="flex flex-col h-full font-handwritten">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-black border-2 border-gray-300">
                        <History size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-[0.15em]">📝 Chat History</h3>
                </div>
                <button
                    onClick={clearAllHistory}
                    className="p-2 hover:bg-red-100 hover:text-red-500 rounded-lg text-gray-400 transition-all"
                    title="Clear All Logs"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* New Session Button */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onNewSession?.()}
                className="w-full flex items-center gap-3 p-4 mb-6 rounded-xl bg-yellow-200 text-black hover:bg-yellow-300 transition-all shadow-cutout active:scale-[0.98] border-2 border-gray-400 transform rotate-0.5"
            >
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                    <Plus size={16} strokeWidth={3} />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">+ New Chat</span>
            </motion.button>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search past chats..."
                    className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-handwritten outline-none focus:border-yellow-400 focus:bg-yellow-50 transition-all placeholder:text-gray-400"
                />
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar -mr-2 pr-2">
                {isLoading ? (
                    <div className="py-16 flex flex-col items-center gap-3">
                        <Loader size={20} className="animate-spin text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">📡 Syncing...</span>
                    </div>
                ) : Object.keys(groupedSessions).length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <div className="w-14 h-14 rounded-xl bg-yellow-50 flex items-center justify-center mx-auto mb-4 border-2 border-gray-200">
                            <MessageSquare size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-faded leading-relaxed">
                            No conversations yet! ✏️
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Start a new chat to begin.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {Object.entries(groupedSessions).map(([dateLabel, group]) => (
                            <div key={dateLabel} className="mb-4">
                                {/* Date Group Label */}
                                <div className="px-1 mb-3 flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500 bg-yellow-50 px-2 py-0.5 rounded transform rotate-1">
                                        {dateLabel}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200" />
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
