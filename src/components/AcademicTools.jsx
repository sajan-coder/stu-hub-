import React from 'react';
import { PenTool, Calculator, FlaskConical, Globe } from 'lucide-react';

const AcademicTools = () => {
    const tools = [
        { name: 'CALCULATOR', icon: Calculator, desc: 'scientific_&_graphing' },
        { name: 'LAB_REPORTS', icon: FlaskConical, desc: 'template_generator' },
        { name: 'TRANSLATOR', icon: Globe, desc: '20+_languages' },
        { name: 'DIAGRAM_GEN', icon: PenTool, desc: 'concept_mapper' },
    ];

    return (
        <div className="flex-1 p-8 ml-64 min-h-screen bg-[#F4F4F4]">
            <header className="mb-12 border-b-[6px] border-black pb-8">
                <h2 className="text-6xl font-black text-black tracking-tighter uppercase">ACADEMIC_TOOLS</h2>
                <p className="font-black text-gray-500 mt-2 uppercase italic underline decoration-[4px] decoration-[#FFD600]">MODULE_05 // SWISS_ARMY_KNIFE_FOR_SCHOLARS.</p>
            </header>

            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
                {tools.map((tool, i) => (
                    <div key={i} className="neo-card p-10 bg-white flex flex-col items-center gap-6 group cursor-pointer hover:bg-black hover:text-white transition-all">
                        <div className={`p-6 border-[4px] border-black shadow-[6px_6px_0px_0px_#000] rotate-[-5deg] group-hover:rotate-0 group-hover:bg-white group-hover:text-black transition-all bg-[#FFD600] text-black`}>
                            <tool.icon size={48} strokeWidth={3} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-3xl font-black uppercase mb-2 italic tracking-tighter">{tool.name}</h3>
                            <p className="text-xs font-bold uppercase underline decoration-2">{tool.desc}_01</p>
                        </div>
                        <button className="neo-button bg-black text-white group-hover:bg-[#FFD600] group-hover:text-black transition-all w-full text-xs">LAUNCH_TOOL</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AcademicTools;
