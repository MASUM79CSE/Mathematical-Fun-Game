/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, ClipboardDocumentCheckIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';
import { analyzeCode } from '../services/gemini';

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  onRefine: (instruction: string) => Promise<void>;
}

// Add type definition for the global pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// Tooltip Component
const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-end z-50 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
             {/* Little triangle pointing up */}
             <div className="w-2 h-2 mr-2.5 -mb-1 bg-zinc-800 border-t border-l border-zinc-700 transform rotate-45 shadow-sm"></div>
             {/* Content */}
             <div className="bg-zinc-800 text-zinc-200 text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-zinc-700 shadow-xl whitespace-nowrap backdrop-blur-sm">
                 {content}
             </div>
        </div>
    </div>
);

const LoadingStep = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
);

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        if (!isCancelled) setError("PDF library not initialized");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        
        if (isCancelled) return;

        // Get the first page
        const page = await pdf.getPage(1);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;
        
        // Initial viewport at scale 1.0 to check dimensions
        const initialViewport = page.getViewport({ scale: 1.0 });
        
        // Dynamic scaling: If it's a huge blueprint, don't supersample it.
        // If it's a standard letter page, scale up for crispness on high DPI screens.
        let scale = 1.5; 
        if (initialViewport.width > 2000 || initialViewport.height > 2000) {
            scale = 1.0; // Keep original size for large docs
        } else if (initialViewport.width < 1000) {
            scale = 2.0; // Supersample small docs
        }

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (!isCancelled) setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        if (!isCancelled) {
            setError("Could not render PDF preview.");
            setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
        isCancelled = true;
    };
  }, [dataUrl]);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
            <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
            <p className="text-sm mb-2 text-red-400/80">{error}</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-900/50">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        <canvas 
            ref={canvasRef} 
            className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded bg-white transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, onRefine }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSplitView, setShowSplitView] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    
    // Refinement state
    const [refinementPrompt, setRefinementPrompt] = useState("");
    const [isRefining, setIsRefining] = useState(false);

    // Handle loading animation steps
    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => {
                setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 2000); 
            return () => clearInterval(interval);
        } else {
            setLoadingStep(0);
        }
    }, [isLoading]);

    // Reset when creation changes
    useEffect(() => {
        if (creation?.originalImage) {
            setShowSplitView(true);
        } else {
            setShowSplitView(false);
        }
        setAnalysisResult(null);
        setShowAnalysis(false);
        setIsAnalyzing(false);
        setRefinementPrompt("");
        setIsRefining(false);
    }, [creation]);

    const handleExport = () => {
        if (!creation) return;
        const dataStr = JSON.stringify(creation, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleToggleAnalysis = async () => {
        if (!creation) return;
        
        if (showAnalysis) {
            setShowAnalysis(false);
            return;
        }

        setShowAnalysis(true);

        if (!analysisResult && !isAnalyzing) {
            setIsAnalyzing(true);
            try {
                const result = await analyzeCode(creation.html);
                setAnalysisResult(result);
            } catch (e) {
                setAnalysisResult("Failed to retrieve analysis. Please try again.");
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handleRefinementSubmit = async () => {
        if (!refinementPrompt.trim() || isRefining) return;
        setIsRefining(true);
        try {
            await onRefine(refinementPrompt);
            setRefinementPrompt("");
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefining(false);
        }
    };

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isFocused
          ? 'inset-2 md:inset-4 opacity-100 scale-100'
          : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      {/* Minimal Technical Header */}
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0 relative z-50">
        {/* Left: Controls */}
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls">
                <button 
                  onClick={onReset}
                  className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 hover:!bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="Close Preview"
                >
                  <XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" />
                </button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
        </div>
        
        {/* Center: Title */}
        <div className="flex items-center space-x-2 text-zinc-500">
            <CodeBracketIcon className="w-3 h-3" />
            <span className="text-[11px] font-mono uppercase tracking-wider">
                {isLoading ? 'System Processing...' : isRefining ? 'Refining Application...' : creation ? creation.name : 'Preview Mode'}
            </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end space-x-1 w-auto min-w-[128px]">
            {!isLoading && creation && (
                <>
                    <Tooltip content="Analyze Code Quality">
                        <button
                            onClick={handleToggleAnalysis}
                            className={`p-1.5 rounded-md transition-all ${showAnalysis ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            <ClipboardDocumentCheckIcon className="w-4 h-4" />
                        </button>
                    </Tooltip>

                    {creation.originalImage && (
                        <Tooltip content={showSplitView ? "Show App Only" : "Compare with Input"}>
                             <button 
                                onClick={() => setShowSplitView(!showSplitView)}
                                className={`p-1.5 rounded-md transition-all ${showSplitView ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                            >
                                <ViewColumnsIcon className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    )}

                    <Tooltip content="Export JSON">
                        <button 
                            onClick={handleExport}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                    </Tooltip>

                    <Tooltip content="New Upload">
                        <button 
                            onClick={onReset}
                            className="ml-2 flex items-center space-x-1 text-xs font-bold bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-md transition-colors"
                        >
                            <PlusIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">New</span>
                        </button>
                    </Tooltip>
                </>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 bg-[#09090b] flex overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full">
             {/* Technical Loading State */}
             <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-6 text-blue-500 animate-spin-slow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-zinc-100 font-mono text-lg tracking-tight">Constructing Environment</h3>
                    <p className="text-zinc-500 text-sm mt-2">Interpreting visual data...</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_3s_ease-in-out_infinite] w-1/3"></div>
                </div>

                 {/* Terminal Steps */}
                 <div className="border border-zinc-800 bg-black/50 rounded-lg p-4 space-y-3 font-mono text-sm">
                     <LoadingStep text="Analyzing visual inputs" active={loadingStep === 0} completed={loadingStep > 0} />
                     <LoadingStep text="Identifying UI patterns" active={loadingStep === 1} completed={loadingStep > 1} />
                     <LoadingStep text="Generating functional logic" active={loadingStep === 2} completed={loadingStep > 2} />
                     <LoadingStep text="Compiling preview" active={loadingStep === 3} completed={loadingStep > 3} />
                 </div>
             </div>
          </div>
        ) : showAnalysis ? (
             <div className="w-full h-full overflow-y-auto p-6 md:p-8 bg-[#0c0c0e]">
                 <div className="max-w-3xl mx-auto">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-zinc-800">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-white">Code Analysis</h2>
                            <p className="text-xs text-zinc-500 font-mono">Automated review by Gemini 3 Pro</p>
                        </div>
                    </div>
                    
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-sm text-zinc-500 animate-pulse">Analyzing logic and structure...</span>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none font-mono">
                            <pre className="whitespace-pre-wrap bg-transparent p-0 text-zinc-300 font-mono text-sm leading-relaxed">
                                {analysisResult}
                            </pre>
                        </div>
                    )}
                 </div>
             </div>
        ) : creation?.html ? (
          <>
            {/* Split View: Left Panel (Original Image) */}
            {showSplitView && creation.originalImage && (
                <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] relative flex flex-col shrink-0">
                    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-zinc-400 text-[10px] font-mono uppercase px-2 py-1 rounded border border-zinc-800">
                        Input Source
                    </div>
                    <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                        {creation.originalImage.startsWith('data:application/pdf') ? (
                            <PdfRenderer dataUrl={creation.originalImage} />
                        ) : (
                            <img 
                                src={creation.originalImage} 
                                alt="Original Input" 
                                className="max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* App Preview Panel */}
            <div className={`relative h-full bg-white transition-all duration-500 ${showSplitView && creation.originalImage ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full'}`}>
                 <iframe
                    title="Gemini Live Preview"
                    srcDoc={creation.html}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                />
                
                {/* Refinement Overlay (During Loading) */}
                {isRefining && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-in fade-in">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex items-center space-x-3">
                             <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                             <span className="text-sm font-mono text-zinc-200">Refining application...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Refinement Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-30">
                 <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 shadow-2xl rounded-xl overflow-hidden">
                        <div className="pl-3 text-zinc-500">
                            <SparklesIcon className="w-4 h-4" />
                        </div>
                        <input 
                            type="text"
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefinementSubmit()}
                            placeholder="Type to refine (e.g., 'Make the background blue', 'Add a score counter')"
                            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 px-3 py-3.5 focus:outline-none"
                            disabled={isRefining}
                        />
                        <button 
                            onClick={handleRefinementSubmit}
                            disabled={!refinementPrompt.trim() || isRefining}
                            className="mr-1.5 p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-0 disabled:pointer-events-none transition-all"
                        >
                            <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                 </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};