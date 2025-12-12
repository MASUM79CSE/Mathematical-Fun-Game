/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useState, useEffect } from 'react';
import { ArrowUpTrayIcon, SparklesIcon, CpuChipIcon, PaperAirplaneIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface InputAreaProps {
  onGenerate: (prompt: string, file?: File) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const CyclingText = () => {
    const words = [
        "a napkin sketch",
        "a PDF specification",
        "a chaotic whiteboard",
        "a game level design",
        "a research paper",
        "a sci-fi interface",
        "a diagram of a machine",
        "an ancient scroll"
    ];
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // fade out
            setTimeout(() => {
                setIndex(prev => (prev + 1) % words.length);
                setFade(true); // fade in
            }, 500); // Wait for fade out
        }, 3000); // Slower cycle to read longer text
        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <span className={`inline-block whitespace-nowrap transition-all duration-500 transform ${fade ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-2 blur-sm'} text-white font-medium pb-1 border-b-2 border-blue-500/50`}>
            {words[index]}
        </span>
    );
};

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isGenerating, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      onGenerate(prompt, file);
    } else {
      alert("Please upload an image or PDF.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isGenerating) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, isGenerating, prompt]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled && !isGenerating) {
        setIsDragging(true);
    }
  }, [disabled, isGenerating]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleTextSubmit = () => {
      if (prompt.trim() && !disabled && !isGenerating) {
          onGenerate(prompt, undefined);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
          handleTextSubmit();
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto perspective-1000 flex flex-col gap-4">
      <div 
        className={`relative group transition-all duration-300 ${isDragging ? 'scale-[1.01]' : ''}`}
      >
        <label
          className={`
            relative flex flex-col items-center justify-center
            h-56 sm:h-64 md:h-[22rem]
            bg-zinc-900/30 
            backdrop-blur-sm
            rounded-xl border border-dashed
            cursor-pointer overflow-hidden
            transition-all duration-300
            ${isDragging 
              ? 'border-blue-500 bg-zinc-900/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/40'
            }
            ${isGenerating ? 'pointer-events-none border-blue-500/30 bg-blue-500/5' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
            {/* Technical Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px'}}>
            </div>
            
            {/* Corner Brackets for technical feel */}
            <div className={`absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 transition-colors duration-300 ${isDragging ? 'border-blue-500' : 'border-zinc-600'}`}></div>
            <div className={`absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 transition-colors duration-300 ${isDragging ? 'border-blue-500' : 'border-zinc-600'}`}></div>
            <div className={`absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 transition-colors duration-300 ${isDragging ? 'border-blue-500' : 'border-zinc-600'}`}></div>
            <div className={`absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 transition-colors duration-300 ${isDragging ? 'border-blue-500' : 'border-zinc-600'}`}></div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8 p-6 md:p-8 w-full">
                <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-transform duration-500 ${isDragging ? 'scale-110' : 'group-hover:-translate-y-1'}`}>
                    <div className={`absolute inset-0 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-xl flex items-center justify-center ${isGenerating ? 'ring-2 ring-blue-500/50 ring-offset-2 ring-offset-zinc-900' : ''}`}>
                        {isGenerating ? (
                            <div className="relative flex items-center justify-center">
                                <CpuChipIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-400 animate-spin" />
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                            </div>
                        ) : (
                            isDragging ? (
                                <ArrowUpTrayIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-400 transition-all duration-300 -translate-y-1" />
                            ) : (
                                <ArrowUpTrayIcon className="w-8 h-8 md:w-10 md:h-10 text-zinc-300" />
                            )
                        )}
                    </div>
                </div>

                <div className="space-y-2 md:space-y-4 w-full max-w-3xl">
                    {isGenerating ? (
                         <h3 className="text-xl sm:text-2xl md:text-3xl text-blue-400 font-mono animate-pulse">
                            Processing Artifact...
                         </h3>
                    ) : (
                        <h3 className="flex flex-col items-center justify-center text-xl sm:text-2xl md:text-4xl text-zinc-100 leading-none font-bold tracking-tighter gap-3">
                            <span>Bring</span>
                            {/* Fixed height container to prevent layout shifts */}
                            <div className="h-8 sm:h-10 md:h-14 flex items-center justify-center w-full">
                            <CyclingText />
                            </div>
                            <span>to life</span>
                        </h3>
                    )}
                    
                    {!isGenerating && (
                        <p className="text-zinc-500 text-xs sm:text-base md:text-lg font-light tracking-wide flex items-center justify-center gap-2">
                             <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />
                            <span>
                                <span className="hidden md:inline">Drag & Drop</span>
                                <span className="md:hidden">Tap</span> to upload an image or PDF
                            </span>
                        </p>
                    )}
                </div>
            </div>

            <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating || disabled}
            />
        </label>
      </div>

      {/* Custom Prompt Input */}
      <div className={`relative group transition-opacity duration-300 ${isGenerating ? 'opacity-80' : 'opacity-100'}`}>
         <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
         <div className="relative flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Optional: Add specific instructions, details, or game rules (supports images & PDFs)..."
                disabled={disabled || isGenerating}
                className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 px-4 py-3 focus:outline-none resize-none h-14 min-h-[3.5rem] focus:h-20 text-sm transition-all disabled:opacity-50"
             />
             {(prompt.trim() || isGenerating) && (
                 <button 
                    onClick={handleTextSubmit}
                    disabled={disabled || isGenerating}
                    className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-lg disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px]"
                    title="Send"
                 >
                    {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                    )}
                 </button>
             )}
         </div>
         <div className="flex justify-between px-1 mt-1.5">
            <div className="flex items-center space-x-1.5">
                <SparklesIcon className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-blue-400/80 font-medium uppercase tracking-wider">Gemini 3 Thinking Mode Active</span>
            </div>
            {prompt.trim() && !isGenerating && (
                 <span className="text-[10px] text-zinc-600 hidden sm:inline-block">Press Cmd+Enter to send</span>
            )}
         </div>
      </div>
    </div>
  );
};