import React, { useState, useRef, useEffect } from 'react';
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

const ChatTerminal = ({ authToken, selectedSessionId, newSessionToken }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [indexedFiles, setIndexedFiles] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadSessionHistory = async (sessionId) => {
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
    };

    const fetchIndexedFiles = async () => {
        if (!authToken) {
            setIndexedFiles([]);
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/files', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            setIndexedFiles(data.data || []);
        } catch (err) {
            console.error('Failed to load indexed files:', err);
        }
    };

    const removeIndexedFile = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/files/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                setIndexedFiles((prev) => prev.filter((f) => String(f.id) !== String(id)));
            }
        } catch (err) {
            console.error('Failed to delete indexed file:', err);
        }
    };

    useEffect(() => {
        fetchIndexedFiles();
    }, [authToken]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedSessionId) {
            setCurrentSessionId(selectedSessionId);
            loadSessionHistory(selectedSessionId);
        }
    }, [selectedSessionId]);

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
            // Second refresh after 1.5s to catch DB write latency
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
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: `**DOCUMENT INDEXING COMPLETE**: I've processed unit "${file.name}". Context is now available for RAG processing.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);

                // Refresh the Vault component in the sidebar
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
        if (window.confirm('Initialize new session? Current active buffers will be cleared.')) {
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
        if (window.confirm('Delete this current chat session from history?')) {
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
                body: JSON.stringify({ content, title: 'AI Synthesis' })
            });
            if (res.ok) {
                alert('Note saved to Neural Vault.');
            }
        } catch (err) {
            console.error('Failed to save note:', err);
        }
    };

    const handleSend = () => handleSendText(input);

    return (
        <div className="h-full flex flex-col bg-white border-l border-[#E8E8E7] font-inter">
            {/* ── HEADER ── */}
            <div className="px-10 py-6 border-b border-[#F1F1F0] flex items-center justify-between shrink-0 glass z-40">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 border border-[#E8E8E7] rounded-xl flex items-center justify-center text-[#1A1A1A] bg-[#FBFBFA] shadow-sm">
                        <Command size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-[#1A1A1A] leading-tight flex items-center gap-2">
                            Study_Core
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-[#A1A1A0] uppercase tracking-widest bg-[#F1F1F0] px-1.5 py-0.5 rounded leading-none">v3.02.0</span>
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex gap-6 items-center">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-[#A1A1A0] uppercase tracking-widest mb-1 leading-none">History</span>
                            <span className="text-[11px] font-bold text-[#5F5F5E] tabular-nums flex items-center gap-1.5">
                                <Clock size={10} className="text-blue-500" /> Synced
                            </span>
                        </div>
                        <div className="h-6 w-px bg-[#F1F1F0]" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-[#A1A1A0] uppercase tracking-widest mb-1 leading-none">Status</span>
                            <div className="flex items-center gap-2 text-[11px] font-black text-[#5F5F5E] uppercase tracking-tighter">
                                <Activity size={10} className="text-green-500" /> Optimal
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CHAT SPACE ── */}
            <div className="px-10 py-4 border-b border-[#F1F1F0] bg-[#FCFCFB] shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A1A1A0]">Indexed Files</span>
                        <span className="text-[10px] font-bold text-[#5F5F5E]">{indexedFiles.length} files</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {indexedFiles.length === 0 && (
                            <div className="text-[12px] text-[#A1A1A0] py-1">No files indexed yet.</div>
                        )}
                        {indexedFiles.map((file) => (
                            <div key={file.id} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E8E7] bg-white">
                                <File size={12} className="text-[#A1A1A0]" />
                                <span className="text-[11px] font-semibold text-[#1A1A1A] max-w-[260px] truncate">{file.name}</span>
                                <button
                                    onClick={() => removeIndexedFile(file.id)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-[#A1A1A0] hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Remove indexed file"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-16 py-16 space-y-16 bg-[#FFFFFF] custom-scrollbar selection:bg-[#F2E27D]/40 relative">
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-24 animate-fade-in relative z-10">
                        <div className="w-16 h-16 rounded-[24px] bg-[#FBFBFA] border border-[#F1F1F0] flex items-center justify-center shadow-sm mb-10 group hover:rotate-6 transition-all duration-300">
                            <Monitor size={24} className="text-[#DCDCDA] group-hover:text-black transition-colors" />
                        </div>
                        <div>
                            <h4 className="text-[18px] font-semibold text-[#1A1A1A] mb-3 tracking-tight">System initialized and ready.</h4>
                            <p className="text-[15px] font-medium text-[#A1A1A0] leading-relaxed">Neural core is synchronized with your knowledge vault and partitioned history.</p>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex gap-8 max-w-4xl mx-auto items-start font-inter group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${msg.role === 'user' ? 'bg-[#111111] text-white border-black shadow-lg shadow-black/10' : 'bg-white text-[#A1A1A0] border-[#F1F1F0] hover:border-[#DCDCDA]'
                                }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`flex flex-col gap-4 flex-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
                                <div className={`selection:bg-[#F2E27D]/40 ${msg.role === 'user' ? 'text-[#1A1A1A] font-semibold' : ''
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <p className="text-[16px] leading-[1.6] tracking-tight">{msg.content}</p>
                                    ) : (
                                        <div
                                            className="ai-response ai-content text-[15.5px] leading-[1.6] tracking-tight text-[#1A1A1A]"
                                            dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }}
                                        />
                                    )}
                                </div>
                                <div className={`flex items-center gap-4 mt-2 transition-opacity ${msg.role === 'bot' ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                                    <span className="text-[9px] font-black text-[#DCDCDA] uppercase tracking-[0.2em]">{msg.time} // {msg.role === 'user' ? 'SCHOLAR_LOCAL' : 'CORE_NEURAL'}</span>
                                    {msg.role === 'bot' && (
                                        <button
                                            onClick={() => createNoteFromMsg(msg.content)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-[#A1A1A0] hover:text-black transition-colors"
                                        >
                                            <Save size={10} /> Save to Vault
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-8 max-w-4xl mx-auto">
                            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white border border-black shadow-lg shadow-black/10">
                                <Bot size={16} className="animate-pulse" />
                            </div>
                            <div className="flex gap-2 items-center pl-2">
                                <div className="w-1.5 h-1.5 bg-[#F2E27D] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-[#F2E27D] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-[#F2E27D] rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </div>

            {/* ── INTERFACE INPUT ── */}
            <div className="px-16 py-10 bg-[#FFFFFF] border-t border-[#F1F1F0] glass z-50">
                <div className="relative max-w-4xl mx-auto flex flex-col gap-4">
                    {/* Control Bar */}
                    <div className="flex items-center gap-3 px-1">
                        <button
                            onClick={handleNewChat}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#A1A1A0] hover:text-black hover:bg-[#F1F1F0] transition-all"
                        >
                            <Plus size={12} strokeWidth={3} /> New Chat
                        </button>
                        <div className="w-px h-3 bg-[#E8E8E7]" />
                        <button
                            onClick={handleDeleteHistory}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#A1A1A0] hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                            <Trash2 size={12} /> Clear History
                        </button>
                    </div>

                    <div className="flex items-end gap-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8E8E7] rounded-2xl p-2.5 focus-within:border-[#DCDCDA] transition-all">
                        {/* Unified Upload Action */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload PDF / TXT / MD / CSV / JSON"
                                className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${isUploading ? 'bg-black text-white animate-pulse' : 'bg-[#FBFBFA] text-[#A1A1A0] hover:text-black hover:bg-[#F1F1F0]'
                                    }`}
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
                            placeholder="Ask questions or upload study documents..."
                            rows={1}
                            className="flex-1 bg-transparent px-2 py-3 text-[14.5px] font-medium text-[#1A1A1A] placeholder-[#A1A1A0] outline-none resize-none min-h-[48px] custom-scrollbar"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-20"
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
