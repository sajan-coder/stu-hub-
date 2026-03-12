import React, { useState } from 'react';
import { Shield, LogIn, UserPlus, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SettingsView = ({ user, onAuthChanged }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);

    const requireClient = () => {
        if (!supabase) {
            setStatus('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend .env.');
            return false;
        }
        return true;
    };

    const handleSignUp = async () => {
        if (!requireClient()) return;
        setBusy(true);
        setStatus('');
        const { error } = await supabase.auth.signUp({ email, password });
        setBusy(false);
        if (error) {
            setStatus(`Sign up failed: ${error.message}`);
            return;
        }
        setStatus('Sign up successful. Check email if confirmation is enabled.');
    };

    const handleSignIn = async () => {
        if (!requireClient()) return;
        setBusy(true);
        setStatus('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) {
            setStatus(`Login failed: ${error.message}`);
            return;
        }
        setStatus('Logged in successfully.');
        onAuthChanged?.();
    };

    const handleGoogleSignIn = async () => {
        if (!requireClient()) return;
        setBusy(true);
        setStatus('');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        setBusy(false);
        if (error) {
            setStatus(`Google Login failed: ${error.message}`);
        }
    };

    const handleSignOut = async () => {
        if (!requireClient()) return;
        setBusy(true);
        const { error } = await supabase.auth.signOut();
        setBusy(false);
        if (error) {
            setStatus(`Logout failed: ${error.message}`);
            return;
        }
        setStatus('Logged out.');
        onAuthChanged?.();
    };

    return (
        <div className="ml-[72px] min-h-screen notebook-surface px-16 py-16 font-handwritten">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-100 border-2 border-gray-300 mb-6 cutout shadow-sm">
                    <Shield size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">⚙️ Settings</span>
                </div>
                <h1 className="text-4xl font-title mb-4 text-gray-800" style={{ fontFamily: 'Changa One, cursive' }}>👤 Account Access</h1>
                <p className="text-gray-600 mb-8 font-handwritten text-lg">Sign in to sync your doodles across devices! 📝</p>

                <div className="rounded-2xl border-2 border-gray-300 bg-yellow-50 p-6 space-y-4 cutout shadow-md">
                    <div className="grid grid-cols-1 gap-3">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="📧 Email"
                            className="h-12 px-4 rounded-xl border-2 border-gray-300 outline-none focus:border-yellow-400 bg-white font-handwritten"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="🔒 Password"
                            className="h-12 px-4 rounded-xl border-2 border-gray-300 outline-none focus:border-yellow-400 bg-white font-handwritten"
                        />
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <button onClick={handleSignUp} disabled={busy} className="h-10 px-4 rounded-xl bg-green-300 text-gray-800 text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-green-400 transition-colors cutout border-2 border-gray-400">
                            <UserPlus size={14} /> Create User
                        </button>
                        <button onClick={handleSignIn} disabled={busy} className="h-10 px-4 rounded-xl bg-blue-300 text-gray-800 text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-blue-400 transition-colors cutout border-2 border-gray-400">
                            <LogIn size={14} /> Login
                        </button>
                        <button onClick={handleSignOut} disabled={busy} className="h-10 px-4 rounded-xl bg-red-200 text-gray-800 text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-red-300 transition-colors cutout border-2 border-gray-400">
                            <LogOut size={14} /> Logout
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleGoogleSignIn} disabled={busy} className="h-10 px-4 w-full rounded-xl border-2 border-gray-300 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-100 transition-colors bg-white">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    </div>

                    <div className="rounded-xl border-2 border-gray-300 bg-blue-50 p-4 text-sm">
                        <div className="font-bold mb-1 flex items-center gap-2"><User size={14} /> 👤 Current User</div>
                        {user ? (
                            <div className="space-y-1 text-gray-600">
                                <p>📧 Email: {user.email}</p>
                                <p>🆔 ID: {user.id.slice(0, 8)}...</p>
                            </div>
                        ) : (
                            <p className="text-gray-400">Not logged in 🤔</p>
                        )}
                    </div>

                    {status && <p className="text-sm text-gray-600 bg-yellow-100 p-2 rounded-lg border-2 border-gray-300">{status}</p>}
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
