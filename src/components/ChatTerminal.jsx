import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send,
    User,
    Bot,
    Monitor,
    Command,
    Activity,
    Plus,
    Trash2,
    Save,
    Clock,
    Upload,
    File,
    X
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { formatAIResponse } from '../utils/formatAI';
import { useStudyStats } from '../hooks/useStudyStats';

const ChatTerminal = ({ authToken, selectedSessionId, newSessionToken }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [indexedFiles, setIndexedFiles] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const { setFilesIndexed, syncFileSubjects, mergeFileSubjects, removeFileSubject } = useStudyStats();

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadSessionHistory = useCallback(async (sessionId) => {
        if (!sessionId || !authToken) {
            setMessages([]);
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/history?session_id=${encodeURIComponent(sessionId)}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            if (data.data?.length > 0) {
                const historyMsgs = data.data.flatMap(h => [
                    { role: 'user', content: h.user_msg, time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                    { role: 'bot', content: h.bot_reply, time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
                setMessages(historyMsgs);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }, [authToken]);

    const fetchIndexedFiles = useCallback(async () => {
        if (!authToken) {
            setIndexedFiles([]);
            setFilesIndexed(0);
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/files', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            const files = data.data || [];
            setIndexedFiles(files);
            setFilesIndexed(files.length);
            syncFileSubjects(files);
        } catch (err) {
            console.error('Failed to load indexed files:', err);
        }
    }, [authToken, setFilesIndexed, syncFileSubjects]);

    const removeIndexedFile = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/files/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                setIndexedFiles((prev) => {
                    const nextFiles = prev.filter((f) => String(f.id) !== String(id));
                    setFilesIndexed(nextFiles.length);
                    return nextFiles;
                });
                removeFileSubject(id);
            }
        } catch (err) {
            console.error('Failed to delete indexed file:', err);
        }
    };

    useEffect(() => {
        fetchIndexedFiles();
    }, [fetchIndexedFiles]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedSessionId) {
            setCurrentSessionId(selectedSessionId);
            loadSessionHistory(selectedSessionId);
        }
    }, [loadSessionHistory, selectedSessionId]);

    useEffect(() => {
        setCurrentSessionId(null);
        setMessages([]);
        setInput('');
    }, [newSessionToken]);

    const handleSendText = async (text) => {
        if (!text.trim() || isLoading) return;
        const sessionId = currentSessionId || (window.crypto?.randomUUID?.() || `session-${Date.now()}`);
        if (!currentSessionId) {
            setCurrentSessionId(sessionId);
        }
        const userMsg = {
            role: 'user',
            content: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: authToken
                    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, sessionId })
            });
            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'bot',
                content: data.reply,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            window.dispatchEvent(new Event('history-refresh'));
            setTimeout(() => window.dispatchEvent(new Event('history-refresh')), 1500);
        } catch {
            setMessages(prev => [...prev, {
                role: 'bot',
                content: "SYSTEM_OFFLINE: Connection reset by peer.",
                time: 'ERR'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('files', file);

        try {
            const res = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                body: formData
            });
            const payload = await res.json();
            if (res.ok && payload.indexedFiles?.length) {
                mergeFileSubjects(payload.indexedFiles);
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: `**DOCUMENT INDEXING COMPLETE**: I've processed unit "${file.name}". Context is now available for RAG processing.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);

                window.dispatchEvent(new Event('vault-refresh'));
                fetchIndexedFiles();
            } else {
                const reason = payload?.skippedFiles?.[0]?.reason || payload?.error || 'Upload accepted but indexing failed.';
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: `**UPLOAD FAILED**: "${file.name}" could not be indexed. Reason: ${reason}`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            }

        } catch (err) {
            console.error('Upload failed:', err);
            setMessages(prev => [...prev, {
                role: 'bot',
                content: `**UPLOAD FAILED**: "${file.name}" could not be indexed due to a network/server error.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsUploading(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const handleNewChat = () => {
        if (window.confirm('Start a new conversation? 🆕')) {
            setMessages([]);
            setInput('');
            setCurrentSessionId(null);
        }
    };

    const handleDeleteHistory = async () => {
        if (!currentSessionId) {
            setMessages([]);
            return;
        }
        if (window.confirm('🗑️ Delete this chat history?')) {
            try {
                const res = await fetch(`http://localhost:5000/api/history?session_id=${encodeURIComponent(currentSessionId)}`, {
                    method: 'DELETE',
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                });
                if (res.ok) {
                    setMessages([]);
                    setCurrentSessionId(null);
                    window.dispatchEvent(new Event('history-refresh'));
                }
            } catch (err) {
                console.error('Failed to delete history:', err);
            }
        }
    };

    const createNoteFromMsg = async (content) => {
        try {
            const res = await fetch('http://localhost:5000/api/notes', {
                method: 'POST',
                headers: authToken
                    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, title: 'AI Chat Note' })
            });
            if (res.ok) {
                alert('📝 Note saved!');
            }
        } catch (err) {
            console.error('Failed to save note:', err);
        }
    };

    const handleSend = () => handleSendText(input);

    return (
        <div className="h-full flex flex-col bg-yellow-50 border-l-2 border-gray-300 font-handwritten">
            {/* ── HEADER ── */}
            <div className="px-8 py-5 border-b-2 border-gray-200 flex items-center justify-between shrink-0 bg-yellow-100">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border-2 border-gray-300 rounded-xl flex items-center justify-center text-gray-700 bg-white shadow-sm">
                        <Command size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800 leading-tight flex items-center gap-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            📚 Study Buddy
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded">v1.0</span>
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">History</span>
                            <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5">
                                <Clock size={12} className="text-blue-400" /> ✓ Synced
                            </span>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase">
                                <Activity size={12} className="text-green-400" /> Ready!
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CHAT SPACE ── */}
            <div className="px-8 py-3 border-b-2 border-gray-200 bg-yellow-100 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">📁 Indexed Files</span>
                        <span className="text-xs font-bold text-gray-500">{indexedFiles.length} files</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {indexedFiles.length === 0 && (
                            <div className="text-sm text-gray-400 py-1">No files yet... 📭</div>
                        )}
                        {indexedFiles.map((file) => (
                            <div key={file.id} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-200 bg-white">
                                <File size={12} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-700 max-w-[200px] truncate">{file.name}</span>
                                <button
                                    onClick={() => removeIndexedFile(file.id)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Remove"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-12 py-10 space-y-10 bg-white relative" style={{
                backgroundImage: 'linear-gradient(rgba(200, 200, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '100% 24px'
            }}>
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-20 animate-fade-in relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-yellow-50 border-2 border-gray-200 flex items-center justify-center shadow-sm mb-8 group hover:rotate-6 transition-all duration-300">
                            <Monitor size={28} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-bold text-gray-700 mb-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>👋 Hey there!</h4>
                            <p className="text-base text-gray-500 leading-relaxed font-handwritten">Ask me anything about your study materials! 📚<br />I can help you learn, summarize, and remember.</p>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex gap-6 max-w-4xl mx-auto items-start font-handwritten ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${msg.role === 'user' ? 'bg-yellow-300 text-gray-800 border-gray-300 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-yellow-300'
                                }`}>
                                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                            </div>
                            <div className={`flex flex-col gap-2 flex-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
                                <div className={`${msg.role === 'user' ? 'text-gray-800 font-bold' : ''}`}>
                                    {msg.role === 'user' ? (
                                        <p className="text-base leading-relaxed">{msg.content}</p>
                                    ) : (
                                        <div
                                            className="ai-response ai-content text-base leading-relaxed text-gray-700 bg-yellow-50 p-4 rounded-xl border-2 border-gray-200"
                                            dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }}
                                        />
                                    )}
                                </div>
                                <div className={`flex items-center gap-3 mt-1 transition-opacity ${msg.role === 'bot' ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{msg.time}</span>
                                    {msg.role === 'bot' && (
                                        <button
                                            onClick={() => createNoteFromMsg(msg.content)}
                                            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-yellow-500 transition-colors"
                                        >
                                            <Save size={12} /> Save 📝
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-6 max-w-4xl mx-auto">
                            <div className="w-10 h-10 rounded-xl bg-yellow-300 flex items-center justify-center text-gray-800 border-2 border-gray-300 shadow-md">
                                <Bot size={18} className="animate-pulse" />
                            </div>
                            <div className="flex gap-2 items-center pl-2 pt-2">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </div>

            {/* ── INTERFACE INPUT ── */}
            <div className="px-12 py-6 bg-yellow-50 border-t-2 border-gray-200 z-50">
                <div className="relative max-w-4xl mx-auto flex flex-col gap-3">
                    {/* Control Bar */}
                    <div className="flex items-center gap-2 px-1">
                        <button
                            onClick={handleNewChat}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800 hover:bg-yellow-100 transition-all"
                        >
                            <Plus size={14} strokeWidth={3} /> 🆕 New Chat
                        </button>
                        <div className="w-px h-4 bg-gray-200" />
                        <button
                            onClick={handleDeleteHistory}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <Trash2 size={14} /> Clear
                        </button>
                    </div>

                    <div className="flex items-end gap-2 bg-white shadow-md border-2 border-gray-200 rounded-2xl p-2 focus-within:border-yellow-300 transition-all">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload files"
                                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${isUploading ? 'bg-yellow-300 text-gray-800 animate-pulse' : 'bg-yellow-50 text-gray-500 hover:text-gray-800 hover:bg-yellow-100 border-2 border-gray-200'}`}
                            >
                                <Upload size={18} />
                            </button>
                        </div>

                        <input
                            type="file"
                            accept=".pdf,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your question here... ✏️"
                            rows={1}
                            className="flex-1 bg-transparent px-3 py-3 text-base font-handwritten text-gray-800 placeholder-gray-400 outline-none resize-none min-h-[48px]"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="w-11 h-11 bg-yellow-300 text-gray-800 rounded-xl flex items-center justify-center shadow-md hover:bg-yellow-400 hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-30 border-2 border-gray-300"
                        >
                            <Send size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatTerminal;
