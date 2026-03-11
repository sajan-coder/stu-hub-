import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Plus, CloudIcon, Fingerprint, Database, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyStats } from '../hooks/useStudyStats';

const Vault = ({ compact = false, authToken }) => {
    const [persistedFiles, setPersistedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef(null);
    const { incrementFilesIndexed } = useStudyStats();

    const fetchFiles = async () => {
        try {
            const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
            const res = await fetch('http://localhost:5000/api/files', { headers });
            const data = await res.json();
            setPersistedFiles(data.data || []);
        } catch (err) {
            console.error('Failed to fetch files:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();

        const handleRefresh = () => fetchFiles();
        window.addEventListener('vault-refresh', handleRefresh);
        return () => window.removeEventListener('vault-refresh', handleRefresh);
    }, []);

    const processFiles = async (newFiles) => {
        if (!newFiles.length) return;

        const uploads = newFiles.map(f => ({
            id: Math.random().toString(),
            name: f.name,
            status: 'uploading'
        }));
        setUploadingFiles(prev => [...prev, ...uploads]);

        const formData = new FormData();
        newFiles.forEach(f => formData.append('files', f));

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                body: formData
            });
            if (response.ok) {
                // Refresh persistent list and clear temp upload list
                window.dispatchEvent(new Event('vault-refresh'));
                setUploadingFiles(prev => prev.filter(u => !uploads.find(up => up.id === u.id)));
                incrementFilesIndexed(newFiles.length);
            } else {
                setUploadingFiles(prev => prev.map(u =>
                    uploads.find(up => up.id === u.id) ? { ...u, status: 'error' } : u
                ));
            }
        } catch (err) {
            setUploadingFiles(prev => prev.map(u =>
                uploads.find(up => up.id === u.id) ? { ...u, status: 'error' } : u
            ));
        }
    };

    const deleteFile = async (id) => {
        if (!window.confirm('NEURAL_PURGE_CONFIRMATION: Permanently remove this intelligence unit and all associated vectors?')) return;

        try {
            const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
            const res = await fetch(`http://localhost:5000/api/files/${id}`, { method: 'DELETE', headers });
            if (res.ok) {
                setPersistedFiles(prev => prev.filter(f => f.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete file:', err);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(Array.from(e.dataTransfer.files));
    };

    const handleSelect = (e) => {
        processFiles(Array.from(e.target.files));
    };

    if (compact) {
        return (
            <div className="flex flex-col gap-8 font-inter">
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`h-40 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDragging
                        ? 'bg-[#111111] border-transparent scale-[0.98]'
                        : 'bg-[#FBFBFA] border-[#E8E8E7] hover:border-[#DCDCDA]'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-white text-black translate-y-[-4px]' : 'bg-white shadow-sm border border-[#F1F1F0] text-[#A1A1A0]'
                        }`}>
                        <Upload size={18} strokeWidth={isDragging ? 2.5 : 1.5} />
                    </div>
                    <div className="text-center">
                        <p className={`text-[11px] font-bold tracking-tight transition-colors ${isDragging ? 'text-white' : 'text-[#111111]'}`}>
                            Upload Files
                        </p>
                        <p className={`text-[9px] font-medium mt-1 transition-colors ${isDragging ? 'text-white/50' : 'text-[#A1A1A0]'}`}>
                            DRAG PDF/TXT/MD/CSV/JSON
                        </p>
                    </div>
                    <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" ref={fileInputRef} onChange={handleSelect} className="hidden" />
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A1A1A0]">Active Index</h4>
                        <span className="text-[9px] font-bold bg-[#F1F1F0] px-1.5 py-0.5 rounded text-[#5F5F5E]">{persistedFiles.length} Units</span>
                    </div>

                    <AnimatePresence initial={false}>
                        {uploadingFiles.map((item) => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={item.id}
                                className="p-4 rounded-xl bg-[#111111] border border-black flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-white animate-pulse">
                                        <CloudIcon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-white truncate tracking-tight">{item.name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Syncing...</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {persistedFiles.map((item) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={item.id}
                                className="p-4 rounded-xl bg-white border border-[#F1F1F0] flex items-center justify-between group hover:border-[#E8E8E7] transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[#FBFBFA] border border-[#F1F1F0] text-[#DCDCDA] group-hover:text-black transition-colors">
                                        <File size={13} strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-[#1A1A1A] truncate tracking-tight">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A1A1A0]">Partitioned</span>
                                            <div className="w-0.5 h-0.5 rounded-full bg-[#DCDCDA]" />
                                            <span className="text-[9px] font-bold text-[#DCDCDA] uppercase tracking-tighter">
                                                {new Date(item.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteFile(item.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A1A1A0] hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!isLoading && persistedFiles.length === 0 && uploadingFiles.length === 0 && (
                        <div className="py-12 border border-[#F1F1F0] border-dashed rounded-2xl flex flex-col items-center justify-center opacity-40">
                            <Database size={24} className="mb-3 text-[#DCDCDA]" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Index Empty</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Full screen version logic (similar to compact but with more detail)
    return (
        <div className="min-h-screen bg-[#F8F8F7] px-24 py-24 font-inter">
            <header className="mb-20 max-w-4xl">
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-[#F1F1F0] rounded-lg mb-8 border border-[#E8E8E7]">
                    <Fingerprint size={13} className="text-[#A1A1A0]" strokeWidth={2.5} />
                    <span className="text-[10px] font-black text-[#5F5F5E] uppercase tracking-[0.2em]">Neural Repository</span>
                </div>
                <h1 className="text-[44px] font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">Neural Vault.</h1>
                <p className="text-[17px] font-medium text-[#A1A1A0] max-w-xl leading-relaxed">
                    Persistent vector partitions of your core research documents and visual intelligence.
                </p>
            </header>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full min-h-[300px] rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-8 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden ${isDragging ? 'bg-[#111111] border-transparent shadow-2xl scale-[0.99]' : 'bg-white border-[#E8E8E7] hover:border-[#DCDCDA]'
                    }`}
            >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-700 ${isDragging ? 'bg-white text-black rotate-12' : 'bg-[#FBFBFA] border border-[#F1F1F0] text-[#DCDCDA]'
                    }`}>
                    <Upload size={32} strokeWidth={isDragging ? 2.5 : 1.5} />
                </div>

                <div className="text-center px-8 relative z-10">
                    <p className={`text-xl font-bold tracking-tight transition-colors duration-500 ${isDragging ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        Ingest new knowledge unit
                    </p>
                    <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" ref={fileInputRef} onChange={handleSelect} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className={`mt-6 h-11 px-10 rounded-xl font-semibold text-[13px] transition-all duration-500 z-10 ${isDragging ? 'bg-white text-black' : 'bg-black text-white hover:translate-y-[-2px] shadow-xl'
                            }`}
                    >
                        Local Data Access
                    </button>
                </div>
            </div>

            <div className="mt-20 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 gap-6">
                    <AnimatePresence>
                        {persistedFiles.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-2xl bg-white border border-[#E8E8E7] flex items-center justify-between group hover:border-[#DCDCDA] hover:shadow-xl transition-all duration-300"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#FBFBFA] border border-[#F1F1F0] text-[#DCDCDA] group-hover:text-black group-hover:rotate-6 transition-all duration-500">
                                        <File size={22} strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-bold text-[#1A1A1A] truncate max-w-[200px] mb-1 tracking-tight">{item.name}</p>
                                        <div className="flex items-center gap-3">
                                            <div className="px-2 py-0.5 rounded bg-[#F1F1F0] text-[9px] font-black uppercase tracking-[0.15em] text-[#A1A1A0]">
                                                {Math.round(item.size / 1024)} KB
                                            </div>
                                            <span className="text-[10px] font-bold text-[#111111]">Partitioned</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteFile(item.id)}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[#A1A1A0] hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Vault;
