import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';

export default function PostMortemModal({ isOpen, onClose, markdown, incidentId }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !markdown) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostMortem-${incidentId || 'Incident'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-cyan-500/30">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Autonomous Post-Mortem Incident Report
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-space-800 text-xs font-mono text-cyan-300 border border-slate-700 hover:bg-space-700 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-xs font-mono text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-slate-300 leading-relaxed space-y-4 bg-space-950/90">
          <pre className="whitespace-pre-wrap font-mono text-slate-200">
            {markdown}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-space-900/60 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-space-800 hover:bg-space-700 transition-all"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}

