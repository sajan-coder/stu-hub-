import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'studenthub_stats';

const defaultStats = {
    notesCount: 0,
    filesIndexed: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    // Weekly study minutes: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    // Subject usage count
    subjects: {},
    // Today's session start timestamps
    todaySessions: [],
    // Running session start (null if not running)
    sessionStart: null,
    // Accumulator for minutes before start of current session
    todayMinutesAcc: 0,
    lastUpdated: null,
};

function getStoredStats() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultStats;
        return { ...defaultStats, ...JSON.parse(raw) };
    } catch {
        return defaultStats;
    }
}

function saveStats(stats) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        // Trigger event for same-window syncing
        window.dispatchEvent(new Event('storage_sync'));
    } catch { }
}

export function useStudyStats() {
    const [stats, setStats] = useState(getStoredStats);

    // Sync with localStorage from other instances/tabs
    useEffect(() => {
        const handleSync = () => setStats(getStoredStats());
        window.addEventListener('storage', handleSync);
        window.addEventListener('storage_sync', handleSync);
        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('storage_sync', handleSync);
        };
    }, []);

    // Live clock for elapsed session time — update every second for responsive UI
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const update = useCallback((fn) => {
        setStats(prev => {
            const next = fn(prev);
            saveStats(next);
            return next;
        });
    }, []);

    // Derived values
    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

    // Live total minutes for today (persisted minutes + live session seconds converted)
    const liveSessionMs = stats.sessionStart ? (now - stats.sessionStart) : 0;
    const todayMinutes = (stats.todayMinutesAcc || 0) + (liveSessionMs / 60000);

    const displayMinutes = Math.floor(todayMinutes);
    const todayHours = `${Math.floor(displayMinutes / 60)}h ${displayMinutes % 60}m`;

    const weekTotal = stats.weeklyMinutes.reduce((a, b) => a + b, 0) + (liveSessionMs / 60000);

    const topSubject = Object.entries(stats.subjects).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const startSession = useCallback(() => {
        update(prev => ({
            ...prev,
            sessionStart: Date.now(),
            // Sync current weekly minutes to accumulator if it's a new day
            todayMinutesAcc: prev.weeklyMinutes[todayIdx] || 0
        }));
    }, [update, todayIdx]);

    const stopSession = useCallback(() => {
        update(prev => {
            if (!prev.sessionStart) return prev;
            const sessionMs = Date.now() - prev.sessionStart;
            const idx = (new Date().getDay() + 6) % 7;
            const w = [...prev.weeklyMinutes];
            w[idx] = (w[idx] || 0) + (sessionMs / 60000);
            return {
                ...prev,
                sessionStart: null,
                weeklyMinutes: w,
                todayMinutesAcc: w[idx]
            };
        });
    }, [update]);

    const incrementNotes = useCallback(() => {
        update(prev => ({ ...prev, notesCount: (prev.notesCount || 0) + 1 }));
    }, [update]);

    const incrementFilesIndexed = useCallback((n) => {
        update(prev => ({ ...prev, filesIndexed: (prev.filesIndexed || 0) + (n || 1) }));
    }, [update]);

    const setFilesIndexed = useCallback((n) => {
        update(prev => ({ ...prev, filesIndexed: n }));
    }, [update]);

    const completeTask = useCallback(() => {
        update(prev => ({
            ...prev,
            tasksCompleted: (prev.tasksCompleted || 0) + 1,
            totalTasks: Math.max((prev.totalTasks || 0), (prev.tasksCompleted || 0) + 1),
        }));
    }, [update]);

    const addTask = useCallback(() => {
        update(prev => ({ ...prev, totalTasks: (prev.totalTasks || 0) + 1 }));
    }, [update]);

    const logSubject = useCallback((subject) => {
        update(prev => ({
            ...prev,
            subjects: { ...prev.subjects, [subject]: ((prev.subjects || {})[subject] || 0) + 1 },
        }));
    }, [update]);

    // Seed some realistic demo data if completely fresh (no sessions logged)
    const seedDemoData = useCallback(() => {
        update(() => ({
            notesCount: 12,
            filesIndexed: 5,
            tasksCompleted: 8,
            totalTasks: 11,
            weeklyMinutes: [95, 120, 45, 180, 60, 30, 0],
            subjects: { Calculus: 14, Physics: 9, History: 6, Chemistry: 4 },
            todaySessions: [],
            sessionStart: null,
        }));
    }, [update]);

    return {
        stats,
        todayHours,
        todayMinutes,
        weekTotal,
        topSubject,
        startSession,
        stopSession,
        incrementNotes,
        setFilesIndexed,
        completeTask,
        addTask,
        logSubject,
        seedDemoData,
        isSessionRunning: !!stats.sessionStart,
    };
}
