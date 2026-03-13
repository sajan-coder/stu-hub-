import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'studenthub_stats';

const defaultStats = {
    notesCount: 0,
    filesIndexed: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    dailyFocusMinutes: {},
    subjects: {},
    fileSubjects: {},
    todaySessions: [],
    sessionStart: null,
    lastUpdated: null,
};

function getDayKey(input = new Date()) {
    const date = input instanceof Date ? input : new Date(input);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentWeekKeys(reference = new Date()) {
    const start = new Date(reference);
    const mondayIndex = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - mondayIndex);

    return Array.from({ length: 7 }, (_, index) => {
        const current = new Date(start);
        current.setDate(start.getDate() + index);
        return getDayKey(current);
    });
}

function distributeMinutesByDay(startMs, endMs) {
    if (!startMs || !endMs || endMs <= startMs) {
        return {};
    }

    const minutesByDay = {};
    let cursor = startMs;

    while (cursor < endMs) {
        const current = new Date(cursor);
        const nextMidnight = new Date(current);
        nextMidnight.setHours(24, 0, 0, 0);

        const sliceEnd = Math.min(endMs, nextMidnight.getTime());
        const dayKey = getDayKey(current);
        const minutes = (sliceEnd - cursor) / 60000;

        minutesByDay[dayKey] = (minutesByDay[dayKey] || 0) + minutes;
        cursor = sliceEnd;
    }

    return minutesByDay;
}

function mergeDailyMinutes(baseMinutes = {}, extraMinutes = {}) {
    const merged = { ...baseMinutes };

    Object.entries(extraMinutes).forEach(([dayKey, minutes]) => {
        merged[dayKey] = (merged[dayKey] || 0) + minutes;
    });

    return merged;
}

function getStoredStats() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultStats;

        const parsed = JSON.parse(raw);
        const merged = { ...defaultStats, ...parsed };

        if (
            (!merged.dailyFocusMinutes || Object.keys(merged.dailyFocusMinutes).length === 0) &&
            Array.isArray(merged.weeklyMinutes) &&
            merged.weeklyMinutes.some((minutes) => minutes > 0)
        ) {
            const weekKeys = getCurrentWeekKeys();
            merged.dailyFocusMinutes = weekKeys.reduce((acc, dayKey, index) => {
                const minutes = merged.weeklyMinutes[index] || 0;
                if (minutes > 0) {
                    acc[dayKey] = minutes;
                }
                return acc;
            }, {});
        }

        return merged;
    } catch {
        return defaultStats;
    }
}

function saveStats(stats) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        window.dispatchEvent(new Event('storage_sync'));
    } catch {
        return;
    }
}

export function useStudyStats() {
    const [stats, setStats] = useState(getStoredStats);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const handleSync = () => setStats(getStoredStats());
        window.addEventListener('storage', handleSync);
        window.addEventListener('storage_sync', handleSync);

        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('storage_sync', handleSync);
        };
    }, []);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const update = useCallback((fn) => {
        setStats((prev) => {
            const next = fn(prev);
            saveStats(next);
            return next;
        });
    }, []);

    const liveDailyMinutes = stats.sessionStart
        ? distributeMinutesByDay(stats.sessionStart, now)
        : {};

    const allDailyMinutes = mergeDailyMinutes(stats.dailyFocusMinutes, liveDailyMinutes);
    const weekKeys = getCurrentWeekKeys(now);
    const weeklyMinutes = weekKeys.map((dayKey) => allDailyMinutes[dayKey] || 0);
    const todayMinutes = allDailyMinutes[getDayKey(now)] || 0;
    const displayMinutes = Math.floor(todayMinutes);
    const todayHours = `${Math.floor(displayMinutes / 60)}h ${displayMinutes % 60}m`;
    const weekTotal = weeklyMinutes.reduce((sum, minutes) => sum + minutes, 0);
    const derivedSubjects = Object.values(stats.fileSubjects || {}).reduce((acc, subject) => {
        if (subject) {
            acc[subject] = (acc[subject] || 0) + 1;
        }
        return acc;
    }, {});
    const subjectCounts = Object.keys(derivedSubjects).length > 0 ? derivedSubjects : (stats.subjects || {});
    const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

    const startSession = useCallback(() => {
        update((prev) => {
            if (prev.sessionStart) {
                return prev;
            }

            return {
                ...prev,
                sessionStart: Date.now(),
                lastUpdated: new Date().toISOString(),
            };
        });
    }, [update]);

    const stopSession = useCallback(() => {
        update((prev) => {
            if (!prev.sessionStart) {
                return prev;
            }

            const sessionEnd = Date.now();
            const sessionMinutes = distributeMinutesByDay(prev.sessionStart, sessionEnd);

            return {
                ...prev,
                sessionStart: null,
                dailyFocusMinutes: mergeDailyMinutes(prev.dailyFocusMinutes, sessionMinutes),
                lastUpdated: new Date(sessionEnd).toISOString(),
            };
        });
    }, [update]);

    const incrementNotes = useCallback(() => {
        update((prev) => ({ ...prev, notesCount: (prev.notesCount || 0) + 1 }));
    }, [update]);

    const incrementFilesIndexed = useCallback((n) => {
        update((prev) => ({ ...prev, filesIndexed: (prev.filesIndexed || 0) + (n || 1) }));
    }, [update]);

    const setFilesIndexed = useCallback((n) => {
        update((prev) => ({ ...prev, filesIndexed: n }));
    }, [update]);

    const completeTask = useCallback(() => {
        update((prev) => ({
            ...prev,
            tasksCompleted: (prev.tasksCompleted || 0) + 1,
            totalTasks: Math.max((prev.totalTasks || 0), (prev.tasksCompleted || 0) + 1),
        }));
    }, [update]);

    const addTask = useCallback(() => {
        update((prev) => ({ ...prev, totalTasks: (prev.totalTasks || 0) + 1 }));
    }, [update]);

    const logSubject = useCallback((subject) => {
        if (!subject) {
            return;
        }
        update((prev) => ({
            ...prev,
            subjects: { ...prev.subjects, [subject]: ((prev.subjects || {})[subject] || 0) + 1 },
        }));
    }, [update]);

    const logSubjects = useCallback((subjects) => {
        const validSubjects = (Array.isArray(subjects) ? subjects : []).filter(Boolean);
        if (validSubjects.length === 0) {
            return;
        }

        update((prev) => {
            const nextSubjects = { ...(prev.subjects || {}) };
            validSubjects.forEach((subject) => {
                nextSubjects[subject] = (nextSubjects[subject] || 0) + 1;
            });

            return {
                ...prev,
                subjects: nextSubjects,
            };
        });
    }, [update]);

    const syncFileSubjects = useCallback((files) => {
        const indexedFiles = Array.isArray(files) ? files : [];

        update((prev) => {
            const nextFileSubjects = {};

            indexedFiles.forEach((file) => {
                const fileId = file?.id != null ? String(file.id) : null;
                if (!fileId) {
                    return;
                }

                nextFileSubjects[fileId] = file.subject || prev.fileSubjects?.[fileId] || 'General';
            });

            return {
                ...prev,
                fileSubjects: nextFileSubjects,
            };
        });
    }, [update]);

    const mergeFileSubjects = useCallback((files) => {
        const indexedFiles = Array.isArray(files) ? files : [];

        update((prev) => {
            const nextFileSubjects = { ...(prev.fileSubjects || {}) };

            indexedFiles.forEach((file) => {
                const fileId = file?.id != null ? String(file.id) : null;
                if (!fileId) {
                    return;
                }

                nextFileSubjects[fileId] = file.subject || nextFileSubjects[fileId] || 'General';
            });

            return {
                ...prev,
                fileSubjects: nextFileSubjects,
            };
        });
    }, [update]);

    const removeFileSubject = useCallback((fileId) => {
        if (fileId == null) {
            return;
        }

        update((prev) => {
            const nextFileSubjects = { ...(prev.fileSubjects || {}) };
            delete nextFileSubjects[String(fileId)];

            return {
                ...prev,
                fileSubjects: nextFileSubjects,
            };
        });
    }, [update]);

    const seedDemoData = useCallback(() => {
        const demoMinutes = [95, 120, 45, 180, 60, 30, 0];
        const weekKeysForSeed = getCurrentWeekKeys();
        const dailyFocusMinutes = weekKeysForSeed.reduce((acc, dayKey, index) => {
            if (demoMinutes[index] > 0) {
                acc[dayKey] = demoMinutes[index];
            }
            return acc;
        }, {});

        update(() => ({
            ...defaultStats,
            notesCount: 12,
            filesIndexed: 5,
            tasksCompleted: 8,
            totalTasks: 11,
            weeklyMinutes: demoMinutes,
            dailyFocusMinutes,
            subjects: { Calculus: 14, Physics: 9, History: 6, Chemistry: 4 },
            sessionStart: null,
            lastUpdated: new Date().toISOString(),
        }));
    }, [update]);

    return {
        stats: {
            ...stats,
            weeklyMinutes,
            dailyFocusMinutes: allDailyMinutes,
            subjects: subjectCounts,
        },
        todayHours,
        todayMinutes,
        weekTotal,
        topSubject,
        startSession,
        stopSession,
        incrementNotes,
        incrementFilesIndexed,
        setFilesIndexed,
        completeTask,
        addTask,
        logSubject,
        logSubjects,
        syncFileSubjects,
        mergeFileSubjects,
        removeFileSubject,
        seedDemoData,
        isSessionRunning: !!stats.sessionStart,
    };
}
