import React from 'react';
import { PenTool, Calculator, FlaskConical, Globe } from 'lucide-react';

const AcademicTools = () => {
    const tools = [
        { name: 'Calculator', icon: Calculator, desc: 'Math helper', color: 'bg-blue-100' },
        { name: 'Lab Reports', icon: FlaskConical, desc: 'Templates', color: 'bg-green-100' },
        { name: 'Translator', icon: Globe, desc: '20+ languages', color: 'bg-purple-100' },
        { name: 'Diagrams', icon: PenTool, desc: 'Mind maps', color: 'bg-pink-100' },
    ];

    return (
        <div className="flex-1 p-8 ml-64 min-h-screen notebook-surface">
            <header className="mb-12 border-b-4 border-gray-300 pb-8">
                <h2 className="text-5xl font-title text-gray-800 uppercase tracking-tight" style={{ fontFamily: 'Changa One, cursive' }}>🛠️ Academic Tools</h2>
                <p className="font-handwritten text-gray-600 mt-2 text-xl italic">Your Swiss Army knife for studying! ✏️</p>
            </header>

            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
                {tools.map((tool, i) => (
                    <div key={i} className="p-8 bg-yellow-50 border-2 border-gray-300 rounded-2xl flex flex-col items-center gap-4 group cursor-pointer hover:shadow-lg hover:border-yellow-300 transition-all cutout" style={{ transform: `rotate(${i % 2 === 0 ? 1 : -1}deg)` }}>
                        <div className={`p-6 rounded-xl shadow-md rotate-[-3deg] group-hover:rotate-0 group-hover:scale-110 transition-all ${tool.color} border-2 border-gray-300`}>
                            <tool.icon size={44} strokeWidth={2} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Patrick Hand, cursive' }}>{tool.name}</h3>
                            <p className="text-sm text-gray-500">{tool.desc} 📝</p>
                        </div>
                        <button className="w-full py-2 px-4 bg-yellow-300 text-gray-800 font-bold rounded-xl hover:bg-yellow-400 transition-colors border-2 border-gray-300 cutout shadow-sm">
                            🚀 Launch
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AcademicTools;
