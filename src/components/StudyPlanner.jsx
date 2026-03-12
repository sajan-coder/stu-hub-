import React from 'react';
import { Calendar, Clock, BarChart, Plus } from 'lucide-react';

const StudyPlanner = () => {
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface">
            <header className="mb-12 border-b-4 border-gray-400 pb-8">
                <h2 className="text-5xl font-title text-gray-800 tracking-tight uppercase" style={{ fontFamily: 'Changa One, cursive' }}>📅 Study Planner</h2>
                <p className="font-handwritten text-gray-600 mt-2 text-xl italic">Let's plan your learning adventure! ✏️</p>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[600px]">
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="neo-card p-6 bg-yellow-50 border-2 border-gray-300 rounded-2xl cutout shadow-md">
                        <h3 className="text-xl font-bold mb-4 uppercase flex items-center gap-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            <Plus strokeWidth={3} /> 📝 New Session
                        </h3>
                        <input className="neo-input mb-4 text-sm font-handwritten bg-white border-2 border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="What do you want to learn?" />
                        <div className="flex gap-2 mb-4">
                            <button className="flex-1 bg-red-200 border-2 border-gray-400 rounded-lg py-2 font-bold text-sm hover:bg-red-300 transition-colors">😰 Hard</button>
                            <button className="flex-1 bg-green-200 border-2 border-gray-400 rounded-lg py-2 font-bold text-sm hover:bg-green-300 transition-colors">😊 Easy</button>
                        </div>
                        <button className="w-full bg-yellow-300 border-2 border-gray-400 rounded-xl py-3 font-bold text-gray-800 hover:bg-yellow-400 transition-colors cutout shadow-sm">
                            🚀 Let's Go!
                        </button>
                    </div>

                    <div className="neo-card p-6 flex-1 bg-green-50 border-2 border-gray-300 rounded-2xl cutout shadow-md">
                        <h3 className="text-xl font-bold mb-2 uppercase" style={{ fontFamily: 'Patrick Hand, cursive' }}>⚡ Efficiency</h3>
                        <div className="text-5xl font-title text-gray-800 mb-2 tracking-tight">92%</div>
                        <p className="text-sm font-handwritten italic mb-4">You're on fire, scholar! 🔥</p>
                        <div className="border-2 border-gray-400 h-8 w-full bg-white rounded-lg p-1">
                            <div className="bg-green-400 h-full w-[92%] rounded" />
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-8 h-full">
                    <div className="neo-card p-6 flex-1 bg-yellow-50 border-2 border-gray-300 rounded-2xl overflow-y-auto cutout shadow-md">
                        <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            <Calendar strokeWidth={3} /> 📅 This Week
                        </h3>
                        <div className="space-y-4">
                            {[
                                { day: 'MONDAY', task: 'Review Calculus Ch 4-6', time: '2:00 - 4:30 PM', status: 'DONE', emoji: '✅' },
                                { day: 'TUESDAY', task: 'Physics Lab Report', time: '9:00 - 11:00 AM', status: 'PENDING', emoji: '📝' },
                                { day: 'WEDNESDAY', task: 'History: French Revolution', time: '4:00 - 6:00 PM', status: 'PENDING', emoji: '📚' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 border-2 border-gray-300 bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer cutout">
                                    <div className="font-bold text-sm w-24 border-r-2 border-gray-300 pr-2 text-gray-600">{item.day}</div>
                                    <div className="flex-1 font-handwritten text-base">{item.emoji} {item.task}</div>
                                    <div className="font-mono text-xs font-bold bg-gray-100 p-1 border-2 border-gray-200 rounded">{item.time}</div>
                                    <div className={`text-xs font-bold p-2 border-2 border-gray-400 rounded ${item.status === 'DONE' ? 'bg-green-200' : 'bg-yellow-200'}`}>
                                        {item.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyPlanner;
