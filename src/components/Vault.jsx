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
        if (!window.confirm('🗑️ Delete this file?')) return;

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
            <div className="flex flex-col gap-6 font-handwritten">
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${isDragging
                        ? 'bg-yellow-100 border-yellow-400 scale-[0.98]'
                        : 'bg-yellow-50 border-gray-300 hover:border-yellow-400'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-yellow-300 text-gray-800' : 'bg-white border-2 border-gray-300 text-gray-500'}`}>
                        <Upload size={18} strokeWidth={isDragging ? 2.5 : 1.5} />
                    </div>
                    <div className="text-center">
                        <p className={`text-sm font-bold transition-colors ${isDragging ? 'text-gray-800' : 'text-gray-700'}`}>
                            📁 Upload Files
                        </p>
                        <p className={`text-xs mt-1 transition-colors ${isDragging ? 'text-gray-500' : 'text-gray-400'}`}>
                            PDF, TXT, MD, CSV, JSON
                        </p>
                    </div>
                    <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" ref={fileInputRef} onChange={handleSelect} className="hidden" />
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">📚 My Files</h4>
                        <span className="text-xs font-bold bg-yellow-200 px-2 py-0.5 rounded text-gray-700">{persistedFiles.length} files</span>
                    </div>

                    <AnimatePresence initial={false}>
                        {uploadingFiles.map((item) => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={item.id}
                                className="p-3 rounded-xl bg-yellow-50 border-2 border-gray-300 flex items-center justify-between group cutout"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-gray-600">
                                        <CloudIcon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{item.name}</p>
                                        <p className="text-xs text-gray-400 uppercase">Uploading... ⏳</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {persistedFiles.map((item) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={item.id}
                                className="p-3 rounded-xl bg-white border-2 border-gray-300 flex items-center justify-between group hover:border-yellow-300 transition-all cutout"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 border-2 border-gray-200 text-gray-600 group-hover:rotate-6 transition-transform">
                                        <File size={13} strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 uppercase">Saved</span>
                                            <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                            <span className="text-xs text-gray-400">
                                                {new Date(item.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteFile(item.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!isLoading && persistedFiles.length === 0 && uploadingFiles.length === 0 && (
                        <div className="py-10 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-yellow-50">
                            <Database size={24} className="mb-2 text-gray-400" />
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No files yet 📁</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen notebook-surface px-24 py-20 font-handwritten">
            <header className="mb-16 max-w-4xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-xl mb-6 border-2 border-gray-300 cutout">
                    <Fingerprint size={14} className="text-gray-600" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">📁 File Vault</span>
                </div>
                <h1 className="text-5xl font-title text-gray-800 mb-4 leading-tight" style={{ fontFamily: 'Changa One, cursive' }}>
                    📂 My Files 🗂️
                </h1>
                <p className="text-lg text-gray-600 max-w-xl">
                    Upload your study materials here! 📚✨
                </p>
            </header>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full min-h-[250px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all duration-300 relative overflow-hidden ${isDragging ? 'bg-yellow-100 border-yellow-400 scale-[0.99]' : 'bg-yellow-50 border-gray-300 hover:border-yellow-400'
                    }`}
            >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-yellow-300 text-gray-800 rotate-12' : 'bg-white border-2 border-gray-300 text-gray-400'}`}>
                    <Upload size={28} strokeWidth={isDragging ? 2.5 : 1.5} />
                </div>

                <div className="text-center px-8 relative z-10">
                    <p className={`text-xl font-bold transition-colors duration-300 ${isDragging ? 'text-gray-800' : 'text-gray-700'}`}>
                        📥 Drop files here!
                    </p>
                    <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" ref={fileInputRef} onChange={handleSelect} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className={`mt-4 h-11 px-8 rounded-xl font-bold text-sm transition-all duration-300 ${isDragging ? 'bg-gray-800 text-white' : 'bg-yellow-300 text-gray-800 hover:bg-yellow-400 cutout border-2 border-gray-400'
                            }`}
                    >
                        📁 Browse Files
                    </button>
                </div>
            </div>

            <div className="mt-16 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 gap-4">
                    <AnimatePresence>
                        {persistedFiles.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-2xl bg-white border-2 border-gray-300 flex items-center justify-between group hover:border-yellow-300 hover:shadow-lg transition-all duration-300 cutout"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 border-2 border-gray-200 text-gray-600 group-hover:rotate-6 transition-transform">
                                        <File size={20} strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-700 truncate max-w-[180px] mb-1">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 rounded bg-gray-100 text-xs font-bold text-gray-500">
                                                {Math.round(item.size / 1024)} KB
                                            </div>
                                            <span className="text-xs text-gray-400">✓ Saved</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteFile(item.id)}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
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
