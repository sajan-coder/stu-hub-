import React from 'react';
import { Calendar, Clock, BarChart, Plus } from 'lucide-react';

const StudyPlanner = () => {
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen bg-[#F4F4F4]">
            <header className="mb-12 border-b-[6px] border-black pb-8">
                <h2 className="text-6xl font-black text-black tracking-tighter uppercase">STUDY_PLANNER</h2>
                <p className="font-black text-gray-500 mt-2 uppercase italic underline decoration-[4px] decoration-[#FFD600]">MODULE_03 // OPTIMIZE_TIME_KILL_PROCRASTINATION.</p>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[600px]">
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="neo-card p-6 bg-white">
                        <h3 className="text-xl font-black mb-4 uppercase flex items-center gap-2"><Plus strokeWidth={4} /> NEW_SESSION</h3>
                        <input className="neo-input mb-4 text-xs font-black uppercase" placeholder="MODULE_NAME (E.G. QUANTUM_PHYSICS)" />
                        <div className="flex gap-2 mb-4">
                            <button className="neo-button flex-1 bg-[#3B82F6] text-white text-xs">DIFFICULT</button>
                            <button className="neo-button flex-1 bg-[#FFD600] text-black text-xs">EASY</button>
                        </div>
                        <button className="neo-button w-full bg-black text-white py-3 font-black">GENERATE_SCHEDULE</button>
                    </div>

                    <div className="neo-card p-6 flex-1 bg-[#22C55E]">
                        <h3 className="text-xl font-black mb-2 uppercase">EFFICIENCY</h3>
                        <div className="text-5xl font-black text-black mb-2 tracking-tighter italic">92%</div>
                        <p className="text-xs font-black uppercase italic mb-4">YOU ARE ON FIRE, SCHOLAR!</p>
                        <div className="border-[3px] border-black h-10 w-full bg-white p-1">
                            <div className="bg-black h-full w-[92%]" />
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-8 h-full">
                    <div className="neo-card p-6 flex-1 bg-white overflow-y-auto">
                        <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                            <Calendar strokeWidth={3} /> WEEKLY_PROTOCOL_V.01
                        </h3>
                        <div className="space-y-4">
                            {[
                                { day: 'MONDAY', task: 'Review Calculus Ch 4-6', time: '14:00 - 16:30', status: 'DONE' },
                                { day: 'TUESDAY', task: 'Physics Lab Report Prep', time: '09:00 - 11:00', status: 'PENDING' },
                                { day: 'WEDNESDAY', task: 'History: The French Revolution', time: '16:00 - 18:00', status: 'PENDING' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                                    <div className="font-black text-xs w-24 border-r-[3px] border-black pr-2">{item.day}</div>
                                    <div className="flex-1 font-extrabold text-sm uppercase">{item.task}</div>
                                    <div className="font-mono text-xs font-bold bg-gray-100 p-1 border-[2px] border-black">{item.time}</div>
                                    <div className={`text-[10px] font-black p-1 border-[2px] border-black ${item.status === 'DONE' ? 'bg-[#22C55E]' : 'bg-[#FFD600]'}`}>
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
