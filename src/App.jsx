import React, { Suspense, useEffect, useState } from 'react';
import { Cpu, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MainOverview from './components/MainOverview';
import ChatTerminal from './components/ChatTerminal';
import SmartNotes from './components/SmartNotes';
import ChatHistory from './components/ChatHistory';
import SettingsView from './components/SettingsView';
import { supabase } from './lib/supabaseClient';

const AssistantTab = ({ user, authToken }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [newSessionToken, setNewSessionToken] = useState(0);

  if (!user || !authToken) {
    return (
      <div className="ml-[72px] h-screen flex items-center justify-center bg-paper-cream font-handwritten">
        <div className="max-w-md text-center cutout p-8">
          <h2 className="text-3xl font-title-doodle text-ink mb-4">⚠️ Login Required</h2>
          <p className="text-lg text-faded font-handwritten">Open Settings, sign in, and your chats/files will be separated by your email account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden ml-[72px] font-handwritten">
      <aside className="w-[440px] h-full overflow-y-auto px-12 py-12 border-r-2 border-gray-300 bg-paper-cream flex flex-col gap-12 custom-scrollbar z-10 cutout">
        <div className="flex-1 space-y-12">
          <ChatHistory
            authToken={authToken}
            activeSessionId={activeSessionId}
            onSelectSession={(sessionId) => setActiveSessionId(sessionId)}
            onNewSession={() => {
              setActiveSessionId(null);
              setNewSessionToken((n) => n + 1);
            }}
          />
        </div>

        <div className="mt-auto p-4 px-6 rounded-lg bg-yellow-100 relative overflow-hidden group border-2 border-gray-400 transform rotate-1">
          <p className="text-xs font-bold uppercase text-red-500 tracking-widest mb-2 flex items-center gap-2">
            📝 Study Log
          </p>
          <p className="text-sm leading-relaxed text-faded mb-4 font-handwritten">Track your learning progress with doodles!</p>
          <button className="w-full py-2 border-2 border-gray-500 hover:border-black hover:bg-yellow-200 rounded-md transition-all text-sm font-bold font-handwritten">
            Start Writing 📝
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white relative cutout">
        <ChatTerminal authToken={authToken} selectedSessionId={activeSessionId} newSessionToken={newSessionToken} />
      </main>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const syncAuth = async () => {
    if (!supabase) {
      setUser(null);
      setAuthToken(null);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user || null);
    setAuthToken(data.session?.access_token || null);
  };

  useEffect(() => {
    syncAuth();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthToken(session?.access_token || null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen selection:bg-yellow-200 font-handwritten">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />

      <main className="flex-1 w-full relative">
        <Suspense fallback={
          <div className="h-screen w-full flex items-center justify-center bg-[#F8F8F7]">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-black rounded-full animate-bounce" />
            </div>
          </div>
        }>
          {activeTab === 'dashboard' && <MainOverview onNavigate={setActiveTab} />}
          {activeTab === 'assistant' && <AssistantTab user={user} authToken={authToken} />}
          {activeTab === 'notes' && <SmartNotes authToken={authToken} />}
          {activeTab === 'settings' && <SettingsView user={user} onAuthChanged={syncAuth} />}
          {['planner', 'career', 'tools'].includes(activeTab) && (
            <div className="ml-[72px] h-screen flex flex-col items-center justify-center text-center px-24 bg-paper-cream font-handwritten">
              <div className="w-20 h-20 bg-yellow-100 border-2 border-gray-300 rounded-2xl flex items-center justify-center mb-8 floating">
                <Cpu size={32} className="text-gray-600" />
              </div>
              <div className="max-w-md">
                <h1 className="text-4xl font-title-doodle tracking-tight text-ink mb-6 uppercase transform -rotate-1">
                  📍 {activeTab.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h1>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="px-3 py-1 rounded bg-yellow-100 text-xs font-bold text-gray-600 uppercase tracking-widest transform rotate-2">Coming Soon!</div>
                </div>
                <p className="text-lg text-faded font-handwritten leading-relaxed">
                  🎨 This section is being decorated with doodles! Check back soon for more fun features.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-10 h-12 px-12 bg-yellow-200 text-black rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all shadow-cutout hover:shadow-cutout-hover transform hover:-translate-y-1 rotate-1"
              >
                ← Back to Notebook
              </button>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
