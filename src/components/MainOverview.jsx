import React, { useState, useEffect } from 'react';
import {
    BookOpen, Zap, Calendar, Activity, Briefcase,
    LayoutGrid, ArrowRight, Play, Square, Clock,
    Database, ClipboardCheck, TrendingUp, Target,
    ChevronRight, ChevronDown, Monitor, Clock4
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudyStats } from '../hooks/useStudyStats';

// ── Helpers ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MotionDiv = motion.div;

// High-end Scholastic Chart
function BarChart({ data, labels }) {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-3 h-44 w-full pt-10 group/chart">
            {data.map((v, i) => {
                const pct = (v / max) * 100;
                const isToday = i === (new Date().getDay() + 6) % 7;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 relative">
                        <div className="h-32 w-full flex flex-col justify-end">
                            <MotionDiv
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(pct, 5)}%` }}
                                className={`w-full rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isToday ? 'bg-[#111111] shadow-xl' : 'bg-[#E8E8E7] group-hover/chart:bg-[#DCDCDA]'
                                    }`}
                            />
                        </div>
                        <span className={`text-[10px] font-bold tracking-widest transition-colors duration-300 ${isToday ? 'text-[#111111]' : 'text-[#A1A1A0]'
                            }`}>
                            {labels[i]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const SubjectRow = ({ label, percentage, color }) => (
    <div className="flex items-center justify-between group cursor-default py-1">
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[13px] font-medium text-[#5F5F5E] group-hover:text-[#1A1A1A] transition-colors">{label}</span>
        </div>
        <span className="text-[12px] font-bold text-[#A1A1A0] tabular-nums">{percentage}%</span>
    </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const MainOverview = ({ onNavigate }) => {
    const {
        stats, todayHours, weekTotal, topSubject,
        startSession, stopSession, isSessionRunning
    } = useStudyStats();

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const weekHours = Math.round(weekTotal / 60 * 10) / 10;
    const weeklyMinutes = stats.weeklyMinutes || [0, 0, 0, 0, 0, 0, 0];
    const totalSubjectSessions = Object.values(stats.subjects || {}).reduce((sum, value) => sum + value, 0);

    const statsConfig = [
        { icon: Clock4, label: "Session focus", value: todayHours || '0h 0m', diff: isSessionRunning ? 'Live' : 'Today', color: 'text-grey-900', bg: 'bg-[#F1F1F0]' },
        { icon: Database, label: 'Materials indexed', value: String(stats.filesIndexed || 0), diff: 'Sync', color: 'text-grey-900', bg: 'bg-[#F1F1F0]' },
        { icon: ClipboardCheck, label: 'Task completion', value: `${stats.tasksCompleted || 0}/${stats.totalTasks || 0}`, diff: 'Active', color: 'text-grey-400', bg: 'bg-[#F1F1F0]' },
        { icon: TrendingUp, label: 'Weekly focus', value: `${weekHours}h`, diff: topSubject, color: 'text-grey-400', bg: 'bg-[#F1F1F0]' },
    ];

    const labModules = [
        { id: 'notes', icon: BookOpen, title: 'Smart Notes', desc: 'Synthesize complex materials into high-density insights.' },
        { id: 'planner', icon: Calendar, title: 'Study Planner', desc: 'Dynamic scheduling based on cognitive load management.' },
        { id: 'career', icon: Briefcase, title: 'Career Guide', desc: 'Predictive job analytics and career path mapping.' },
        { id: 'tools', icon: LayoutGrid, title: 'Academic Lab', desc: 'A curated collection of scientific toolkits and academic utilities.' },
    ];

    return (
        <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 ml-[72px] bg-paper-cream min-h-screen py-16 px-20 font-handwritten selection:bg-yellow-200"
        >
            {/* ── HEADER ── */}
            <header className="flex justify-between items-start mb-16 max-w-7xl mx-auto">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-4 bg-red-400 rounded-full" />
                        <span className="text-xs font-bold text-faded uppercase tracking-[0.2em] transform rotate-1">{dateStr} 📅</span>
                    </div>
                    <h1 className="text-4xl font-title-doodle tracking-tight text-ink leading-[1.1] max-w-xl transform -rotate-1">
                        Welcome to your <span className="text-yellow-500">📓 Student Hub</span>!
                    </h1>
                    <p className="mt-3 text-lg text-faded font-handwritten">Let's make today productive! ✨</p>
                </div>

                <button
                    onClick={isSessionRunning ? stopSession : startSession}
                    className={`h-12 px-8 rounded-xl font-bold text-base transition-all duration-300 flex items-center gap-3 border-2 ${isSessionRunning
                        ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200'
                        : 'bg-yellow-100 text-black border-gray-300 hover:bg-yellow-200 shadow-cutout hover:shadow-cutout-hover transform hover:-translate-y-1'
                        }`}
                >
                    {isSessionRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" strokeWidth={0} />}
                    {isSessionRunning ? '⏹ Stop Session' : '▶ Start Focus'}
                </button>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-x-12 gap-y-24">
                {/* ── STATS MODULE ── */}
                <div className="col-span-12">
                    <div className="grid grid-cols-4 gap-6">
                        {statsConfig.map((s, i) => (
                            <div key={i} className="flex flex-col gap-3 group cutout p-5 bg-white transform rotate-[${i % 2 === 0 ? '-' : ''}]1deg">
                                <div className="flex items-center gap-3 text-faded group-hover:text-ink transition-colors">
                                    <s.icon size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">{s.label}</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-semibold tracking-tight">{s.value}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded-md bg-yellow-100 text-gray-600 transform rotate-2">{s.diff}</span>
                                </div>
                                <div className="h-px bg-gray-200 mt-2 group-hover:bg-gray-300 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ANALYTICS CORE ── */}
                <div className="col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-title-doodle flex items-center gap-3 transform rotate-1">
                            <Activity size={18} strokeWidth={2.5} /> 📊 Weekly Progress
                        </h3>
                    </div>
                    <div className="p-8 bg-white border-2 border-gray-300 rounded-xl shadow-cutout hover:shadow-cutout-hover transition-all transform -rotate-0.5">
                        <BarChart data={weeklyMinutes} labels={DAYS} />
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <h3 className="text-lg font-title-doodle flex items-center gap-3 transform -rotate-1">
                        <Target size={18} strokeWidth={2.5} /> 📚 Subject Breakdown
                    </h3>
                    <div className="p-8 bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-cutout transform rotate-1">
                        <div className="flex flex-col gap-5">
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                {Object.entries(stats.subjects || {}).map(([, val], i) => {
                                    const colors = ['#f8b739', '#4ecdc4', '#ff6b6b', '#95e1a3'];
                                    return (
                                        <div
                                            key={i}
                                            style={{ width: `${totalSubjectSessions > 0 ? (val / totalSubjectSessions) * 100 : 0}%`, backgroundColor: colors[i % colors.length] }}
                                            className="h-full border-r-2 border-white last:border-0"
                                        />
                                    );
                                })}
                            </div>
                            <div className="space-y-2">
                                {Object.entries(stats.subjects || {}).map(([label, val], i) => {
                                    const colors = ['#f8b739', '#4ecdc4', '#ff6b6b', '#95e1a3'];
                                    return (
                                        <SubjectRow
                                            key={i}
                                            label={label}
                                            percentage={totalSubjectSessions > 0 ? Math.round((val / totalSubjectSessions) * 100) : 0}
                                            color={colors[i % colors.length]}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── LAB ACCESS ── */}
                <div className="col-span-12">
                    <div className="flex items-center gap-6 mb-8">
                        <h3 className="text-xl font-title-doodle tracking-tight transform -rotate-1">🧪 My Tools</h3>
                        <div className="h-px flex-1 bg-gray-300" />
                    </div>

                    <div className="grid grid-cols-4 gap-x-8">
                        {labModules.map((f, i) => (
                            <MotionDiv
                                key={i}
                                onClick={() => onNavigate?.(f.id)}
                                className="group cursor-pointer relative cutout p-6 bg-white"
                            >
                                <div className="w-14 h-14 bg-yellow-100 border-2 border-gray-300 rounded-xl flex items-center justify-center mb-5 group-hover:bg-yellow-200 group-hover:border-gray-400 group-hover:shadow-cutout transition-all duration-300 transform group-hover:-translate-y-1">
                                    <f.icon size={22} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-base font-bold mb-2 flex items-center gap-2 font-title-doodle">
                                    {f.title}
                                    <span className="opacity-0 group-hover:opacity-100 transition-all text-lg">→</span>
                                </h4>
                                <p className="text-sm text-faded leading-relaxed line-clamp-2 font-handwritten">{f.desc}</p>
                            </MotionDiv>
                        ))}
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
};

export default MainOverview;
