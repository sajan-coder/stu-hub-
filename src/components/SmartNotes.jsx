import React from 'react';
import { FileEdit, Scissors, FileType, CheckCheck } from 'lucide-react';

const SmartNotes = () => {
    return (
        <div className="flex-1 p-8 ml-64 min-h-screen bg-white">
            <header className="mb-12 border-b-[6px] border-black pb-8">
                <h2 className="text-6xl font-black text-black tracking-tighter uppercase whitespace-nowrap">SMART_NOTES</h2>
                <p className="font-black text-gray-500 mt-2 uppercase italic underline decoration-[4px] decoration-[#2563EB]">MODULE_02 // CONVERT_NOTES_TO_A_GRADED_ASSIGNMENTS.</p>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[600px]">
                <div className="col-span-8 flex flex-col gap-8">
                    <div className="neo-card p-6 flex-1 bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase italic bg-[#2563EB] text-white px-2 border-[3px] border-black inline-block tracking-tight">ACADEMIC_EDITOR_V0.1</h3>
                            <div className="flex gap-4">
                                <button className="neo-button bg-white text-black text-xs py-1 px-4 hover:bg-gray-50">SAVE</button>
                                <button className="neo-button bg-black text-white text-xs py-1 px-4 hover:bg-[#2563EB]">EXPORT_PDF</button>
                            </div>
                        </div>
                        <textarea
                            className="w-full h-[400px] neo-input font-mono text-sm leading-relaxed border-[4px] border-black p-4"
                            placeholder="START WRITING OR UPLOAD AN IMAGE TO OCR..."
                        ></textarea>
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="neo-card p-6 bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#2563EB]">
                        <h3 className="text-xl font-black mb-4 uppercase tracking-tighter">AI_POWERED_TOOLS</h3>
                        <div className="space-y-3">
                            <button className="neo-button w-full bg-white text-black justify-start text-xs hover:bg-[#EFF6FF]"><Scissors size={16} /> OCR_FROM_IMAGE</button>
                            <button className="neo-button w-full bg-white text-black justify-start text-xs hover:bg-[#EFF6FF]"><FileType size={16} /> FORMAT_TO_IEEE</button>
                            <button className="neo-button w-full bg-white text-black justify-start text-xs hover:bg-[#EFF6FF]"><CheckCheck size={16} /> CHECK_AI_PROBABILITY</button>
                        </div>
                    </div>

                    <div className="neo-card p-6 flex-1 bg-white border-[4px] border-black">
                        <h3 className="text-xl font-black mb-4 uppercase">AUTO_CITATIONS</h3>
                        <div className="border-[3px] border-black p-4 bg-gray-50 italic text-xs font-bold font-mono shadow-inner">
                            [1] Smith, J. et al. "The Future of AI in Education," Journal of Digital Learning, 2024.
                        </div>
                        <button className="neo-button w-full mt-4 bg-black text-white text-xs hover:bg-[#2563EB]">GENERATE_BIBLIOGRAPHY</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartNotes;
