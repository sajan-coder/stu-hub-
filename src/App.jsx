import React, { Suspense, useEffect, useState } from 'react';
import { Cpu, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MainOverview from './components/MainOverview';
import ChatTerminal from './components/ChatTerminal';
import NotesView from './components/NotesView';
import ChatHistory from './components/ChatHistory';
import SettingsView from './components/SettingsView';
import { supabase } from './lib/supabaseClient';

const AssistantTab = ({ user, authToken }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [newSessionToken, setNewSessionToken] = useState(0);

  if (!user || !authToken) {
    return (
      <div className="ml-[72px] h-screen flex items-center justify-center bg-[#F8F8F7] font-inter">
        <div className="max-w-md text-center">
          <h2 className="text-[28px] font-semibold text-[#111111] mb-3">Login Required</h2>
          <p className="text-[#6B6B6A]">Open Settings, sign in, and your chats/files will be separated by your email account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F8F7] overflow-hidden ml-[72px] font-inter">
      <aside className="w-[440px] h-full overflow-y-auto px-12 py-12 border-r border-[#E8E8E7] bg-[#FFFFFF] flex flex-col gap-12 custom-scrollbar shadow-inner shadow-black/5 z-10">
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

        <div className="mt-auto p-1 px-8 rounded-2xl bg-[#111111] text-white relative overflow-hidden group border-b-4 border-black">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <p className="text-[9px] font-black uppercase text-[#F2E27D] tracking-widest mb-3 flex items-center gap-2">
            <Zap size={10} fill="currentColor" /> Research performance
          </p>
          <p className="text-[12px] font-medium leading-relaxed opacity-60 mb-6 font-inter">Advanced vector indexing activated for high-context paper analysis.</p>
          <button className="w-full py-2.5 border border-white/20 hover:border-white hover:bg-white hover:text-black rounded-[8px] transition-all text-[11px] font-bold uppercase tracking-widest">
            Access Pro
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white relative">
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
    <div className="flex bg-[#F8F8F7] min-h-screen selection:bg-[#F2E27D]/40 font-inter">
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
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'settings' && <SettingsView user={user} onAuthChanged={syncAuth} />}
          {['planner', 'career', 'tools'].includes(activeTab) && (
            <div className="ml-[72px] h-screen flex flex-col items-center justify-center text-center px-24 bg-[#F8F8F7] font-inter">
              <div className="w-16 h-16 bg-white border border-[#E8E8E7] rounded-xl flex items-center justify-center mb-10 shadow-sm">
                <Cpu size={26} className="text-[#DCDCDA]" strokeWidth={1.5} />
              </div>
              <div className="max-w-md">
                <h1 className="text-[28px] font-semibold tracking-tight text-[#111111] mb-4 uppercase">
                  Initializing {activeTab.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h1>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="px-2 py-1 rounded bg-[#F1F1F0] text-[10px] font-bold text-[#A1A1A0] uppercase tracking-widest">Neural_Core v3.1</div>
                  <div className="px-2 py-1 rounded bg-[#F1F1F0] text-[10px] font-bold text-[#A1A1A0] uppercase tracking-widest">Allocating Cycles</div>
                </div>
                <p className="text-[#A1A1A0] font-medium leading-relaxed text-[15px]">
                  Optimizing partitioning for your specific study profile. The OS is allocating local compute cycles for high-density analysis.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-14 h-11 px-10 bg-black text-white rounded-[11px] font-semibold text-[13px] hover:translate-y-[-1px] transition-all shadow-xl hover:shadow-black/5 active:scale-95"
              >
                Return to Workspace
              </button>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
