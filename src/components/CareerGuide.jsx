import React from 'react';
import { Target, Briefcase, Award, TrendingUp, Search } from 'lucide-react';

const CareerGuide = () => {
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface">
            <header className="mb-12 border-b-4 border-gray-300 pb-8">
                <h2 className="text-5xl font-title text-gray-800 uppercase tracking-tight" style={{ fontFamily: 'Changa One, cursive' }}>💼 Career Guide</h2>
                <p className="font-handwritten text-gray-600 mt-2 text-xl italic">Your resume helper and internship finder! 🎯</p>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[600px]">
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="p-6 bg-blue-50 border-2 border-gray-300 rounded-2xl cutout shadow-md">
                        <h3 className="text-xl font-bold mb-4 uppercase flex items-center gap-2" style={{ fontFamily: 'Patrick Hand, cursive' }}>📄 Resume Analyzer</h3>
                        <div className="border-2 border-gray-300 bg-white p-8 flex flex-col items-center justify-center mb-4 rounded-xl">
                            <Search className="text-gray-500 mb-2" size={32} strokeWidth={2} />
                            <p className="text-xs font-bold text-gray-500 uppercase">Upload Resume</p>
                        </div>
                        <button className="w-full py-3 bg-yellow-300 text-gray-800 font-bold rounded-xl hover:bg-yellow-400 transition-colors border-2 border-gray-300 cutout shadow-sm">
                            🔍 Scan Resume
                        </button>
                    </div>

                    <div className="p-6 flex-1 bg-yellow-50 border-2 border-gray-300 rounded-2xl cutout shadow-md">
                        <h3 className="text-xl font-bold mb-4 uppercase" style={{ fontFamily: 'Patrick Hand, cursive' }}>📊 Skills Analysis</h3>
                        <div className="space-y-4">
                            {[
                                { skill: 'React.js', level: 80 },
                                { skill: 'Python', level: 45 },
                                { skill: 'UI Design', level: 60 },
                            ].map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span>{s.skill}</span>
                                        <span>{s.level}%</span>
                                    </div>
                                    <div className="border-2 border-gray-300 h-4 bg-white rounded overflow-hidden">
                                        <div className="bg-green-400 h-full rounded" style={{ width: `${s.level}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-8">
                    <div className="p-6 flex-1 bg-yellow-50 border-2 border-gray-300 rounded-2xl cutout shadow-md overflow-y-auto">
                        <h3 className="text-2xl font-bold uppercase mb-6 flex items-center gap-3" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                            <Award strokeWidth={3} /> 🎯 Internship Opportunities
                        </h3>
                        <div className="space-y-4">
                            {[
                                { company: 'Google', role: 'SWE Intern', match: '95%', deadline: 'June 15', emoji: '🔍' },
                                { company: 'Meta', role: 'Product Intern', match: '82%', deadline: 'July 1', emoji: '📱' },
                                { company: 'Startup', role: 'Full Stack', match: '78%', deadline: 'ASAP', emoji: '🚀' },
                            ].map((job, i) => (
                                <div key={i} className="flex flex-col border-2 border-gray-300 bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer cutout">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-lg text-blue-600">{job.emoji} {job.company}</h4>
                                        <span className="bg-green-200 text-gray-800 text-xs font-bold px-2 py-1 rounded">Match: {job.match}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-handwritten">
                                        <span>{job.role}</span>
                                        <span className="text-gray-500">📅 {job.deadline}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 bg-yellow-300 text-gray-800 font-bold rounded-xl hover:bg-yellow-400 transition-colors border-2 border-gray-300 cutout shadow-sm">
                            👀 View All Opportunities
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CareerGuide;
