import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Terminal, Shield, CornerDownLeft, Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  "Explain root cause in simple terms",
  "Is the hotfix safe to execute?",
  "How does the clock drift normalizer work?",
  "How do I fix this manually in Linux terminal?"
];

export default function AIChatCopilot({ incident }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      sender: 'Aegis Copilot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: "👋 **Hello! I'm your AegisOps SRE Copilot.**\n\nI have real-time visibility into the current incident, telemetry signals, and remediation playbooks. Ask me anything, or click a quick prompt below!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      sender: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          sender: 'Aegis Copilot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: "⚠️ *Unable to connect to Copilot backend. Ensure the FastAPI backend is running on port 8000.*"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white font-bold font-mono text-xs shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all border border-cyan-300/40 group"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>AI SRE Copilot</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/30 text-[10px] text-cyan-200">
            Online
          </span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 sm:w-[420px] h-[550px] max-h-[85vh] glass-panel-glow rounded-2xl flex flex-col overflow-hidden border border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.25)] bg-space-950/95 backdrop-blur-2xl">
          
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-700/60 bg-space-900/90 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-100">Aegis AI Copilot</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Context
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {incident ? `Connected to ${incident.id}` : 'Autonomous Incident Assistant'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex items-start space-x-2.5 ${isAssistant ? '' : 'flex-row-reverse space-x-reverse'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                      isAssistant
                        ? 'bg-gradient-to-br from-cyan-500/20 to-purple-600/30 text-cyan-300 border border-cyan-500/30'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 space-y-1 ${
                      isAssistant
                        ? 'bg-space-900/90 text-slate-200 border border-slate-800 rounded-tl-sm'
                        : 'bg-cyan-600/90 text-white rounded-tr-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-cyan-300">{m.sender}</span>
                      <span className="font-mono text-slate-500">{m.timestamp}</span>
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Copilot analyzing telemetry & incident context...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 bg-space-900/50 border-t border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] bg-space-800/80 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 border border-cyan-500/20 transition-all font-mono shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-800 bg-space-950 flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about this crash or how to fix it..."
              className="flex-1 bg-space-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
