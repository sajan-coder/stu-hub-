import React from 'react';
import { Target, Briefcase, Award, TrendingUp, Search } from 'lucide-react';

const CareerGuide = () => {
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen bg-[#F4F4F4]">
            <header className="mb-12 border-b-[6px] border-black pb-8">
                <h2 className="text-6xl font-black text-black tracking-tighter uppercase">CAREER_GUIDE</h2>
                <p className="font-black text-gray-500 mt-2 uppercase italic underline decoration-[4px] decoration-[#3B82F6]">MODULE_04 // RESUME_ROAST_&_INTERNSHIP_RADAR.</p>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[600px]">
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="neo-card p-6 bg-[#3B82F6] text-white">
                        <h3 className="text-xl font-black mb-4 uppercase flex items-center gap-2"><Briefcase strokeWidth={3} /> RESUME_ANALYSER</h3>
                        <div className="border-[3px] border-black bg-white p-8 flex flex-col items-center justify-center mb-4">
                            <Search className="text-black mb-2" size={32} strokeWidth={4} />
                            <p className="text-[10px] font-black uppercase text-black">UPLOAD_RESUME.PDF</p>
                        </div>
                        <button className="neo-button w-full bg-black text-white hover:bg-[#FFD600] hover:text-black">START_SCAN</button>
                    </div>

                    <div className="neo-card p-6 flex-1 bg-white">
                        <h3 className="text-xl font-black mb-4 uppercase">SKILL_GAP_ANALYSIS</h3>
                        <div className="space-y-4">
                            {[
                                { skill: 'REACT.JS', level: 80 },
                                { skill: 'PYTHON', level: 45 },
                                { skill: 'UI_DESIGN', level: 60 },
                            ].map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span>{s.skill}</span>
                                        <span>{s.level}%</span>
                                    </div>
                                    <div className="border-[2px] border-black h-3 bg-gray-100 italic">
                                        <div className="bg-black h-full" style={{ width: `${s.level}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-8">
                    <div className="neo-card p-6 flex-1 bg-white">
                        <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                            <Award strokeWidth={3} /> INTERNSHIP_RADAR_V1.1
                        </h3>
                        <div className="space-y-4">
                            {[
                                { company: 'GOOGLE', role: 'SWE_INTERN', match: '95%', deadline: 'JUNE_15' },
                                { company: 'META', role: 'PRODUCT_INTERN', match: '82%', deadline: 'JULY_01' },
                                { company: 'LOCAL_STARTUP', role: 'FULL_STACK', match: '78%', deadline: 'ASAP' },
                            ].map((job, i) => (
                                <div key={i} className="flex flex-col border-[3px] border-black p-4 shadow-[6px_6px_0px_0px_#000] hover:bg-gray-50 cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-black text-lg text-[#3B82F6]">{job.company}</h4>
                                        <span className="neo-badge bg-[#22C55E] text-black">MATCH: {job.match}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black uppercase">
                                        <span>{job.role}</span>
                                        <span className="italic underline underline-offset-2">DEADLINE: {job.deadline}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="neo-button w-full mt-6 bg-black text-white py-3">VIEW_ALL_OPPORTUNITIES</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CareerGuide;
