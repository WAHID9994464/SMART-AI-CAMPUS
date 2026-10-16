import React, { useEffect, useState, useRef } from 'react';
import {
  Bot,
  Send,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronRight,
  User,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { chatWithAI, fetchHealth, ChatMessage, ChatResponse } from '../api';

const SUGGESTED_QUESTIONS = [
  'What are the 5 campus buildings and their current operational status?',
  'Explain the ₹20,000 baseline cost savings and where energy was saved today.',
  'Which rooms have equipment running while vacant across the 5 facilities?',
  'What is the status of CDSIMER Hospital and Hospital Emergency Block?',
  'What are the active water leaks and flow rates in the campus network?',
  'Which waste containers need immediate emptying in the dining pavilion?',
  'How much solar energy was generated and grid consumption avoided?',
  'Generate a comprehensive campus sustainability summary for today.',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'openrouter' | 'gemini' | 'local_fallback' | string;
  error?: string;
  recommendations?: ChatResponse['structured_recommendations'];
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Markdown Parser & Formatter Component
// ---------------------------------------------------------------------------
function MarkdownRenderer({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to parse inline styles: bold, italic, inline code
  const renderInline = (text: string): React.ReactNode => {
    // Regex for bold, italic, code
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Process inline tokens
    while (remaining.length > 0) {
      // Inline code: `code`
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
      // Bold: **bold**
      const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/s);
      // Italic: *italic*
      const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/s);

      // Find the earliest match
      const matches = [
        { type: 'code', match: codeMatch, index: codeMatch ? codeMatch[1].length : Infinity },
        { type: 'bold', match: boldMatch, index: boldMatch ? boldMatch[1].length : Infinity },
        { type: 'italic', match: italicMatch, index: italicMatch ? italicMatch[1].length : Infinity },
      ].sort((a, b) => a.index - b.index);

      const earliest = matches[0];
      if (!earliest.match || earliest.index === Infinity) {
        parts.push(remaining);
        break;
      }

      const before = earliest.match[1];
      const token = earliest.match[2];
      const after = earliest.match[3];

      if (before) parts.push(before);

      if (earliest.type === 'code') {
        parts.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded text-xs font-mono bg-[#E8DDCB]/60 text-[#332820] border border-[#C19A6B]/30"
          >
            {token}
          </code>
        );
      } else if (earliest.type === 'bold') {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-[#292D29]">
            {token}
          </strong>
        );
      } else if (earliest.type === 'italic') {
        parts.push(
          <em key={`italic-${keyIdx++}`} className="italic text-[#6D716A]">
            {token}
          </em>
        );
      }

      remaining = after;
    }

    return <>{parts}</>;
  };

  // Split lines into blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      const blockId = `code-${i}`;

      elements.push(
        <div key={`codeblock-${i}`} className="my-2 rounded-lg overflow-hidden border border-[#45362C] bg-[#241B15] text-[#F5F0E7]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#332820] text-xs text-[#A6978A] border-b border-[#45362C]">
            <span className="font-mono">{lang || 'text'}</span>
            <button
              onClick={() => handleCopy(fullCode, blockId)}
              className="flex items-center gap-1 hover:text-white transition-colors"
              title="Copy code"
            >
              {copiedCode === blockId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedCode === blockId ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Markdown Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }

      if (tableRows.length >= 2) {
        const headerCols = tableRows[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const dataRows = tableRows.slice(2); // skip separator row (|---|---|)

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-[#E8DDCB] shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8DDCB]">
                  {headerCols.map((col, idx) => (
                    <th key={idx} className="p-2.5 font-bold text-[#332820]">
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDCB]/60 bg-white">
                {dataRows.map((rowStr, rIdx) => {
                  const cells = rowStr
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                  return (
                    <tr key={rIdx} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-[#292D29]">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-[#332820] mt-3 mb-1 uppercase tracking-wider">
          {renderInline(line.replace('#### ', ''))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-[#2E6B45] mt-3 mb-1.5 flex items-center gap-1.5">
          {renderInline(line.replace('### ', ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-[#332820] mt-4 mb-2 pb-1 border-b border-[#E8DDCB]">
          {renderInline(line.replace('## ', ''))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg font-bold text-[#332820] mt-4 mb-2">
          {renderInline(line.replace('# ', ''))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 border-l-3 border-[#2E6B45] bg-[#FAF8F5] p-2.5 text-xs text-[#6D716A] italic rounded-r"
        >
          {renderInline(line.replace('> ', ''))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Bullet Lists (- or *)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1 text-xs text-[#292D29] list-disc list-inside">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered Lists (1. 2. etc.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1 text-xs text-[#292D29] list-decimal list-inside">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-[#292D29]">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Message Bubble Component
// ---------------------------------------------------------------------------
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar Icon */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
          isUser ? 'bg-[#C19A6B]' : 'bg-[#2E6B45]'
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="max-w-[85%] md:max-w-[80%] space-y-2">
        {/* Bubble Surface */}
        <div
          className={`rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
            isUser
              ? 'bg-[#E8DDCB] text-[#332820] border border-[#C19A6B]/30 rounded-tr-none'
              : 'bg-white text-[#332820] border border-[#E8DDCB] rounded-tl-none'
          }`}
        >
          <MarkdownRenderer content={msg.content} />
        </div>

        {/* Structured Recommendations Cards */}
        {msg.recommendations && msg.recommendations.length > 0 && (
          <div className="space-y-2 pt-1">
            {msg.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded-lg text-xs border border-[#E8DDCB] shadow-2xs space-y-1"
              >
                <div className="font-bold text-[#332820] flex items-center gap-1.5">
                  <span className="text-sm">
                    {rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡'}
                  </span>
                  <span>{rec.finding}</span>
                </div>
                <p className="text-[#6D716A] text-[11px] leading-relaxed">
                  <span className="font-semibold text-[#332820]">Action:</span> {rec.recommended_action}
                </p>
                {rec.expected_impact && (
                  <p className="text-[#2E6B45] font-semibold text-[11px]">
                    Expected Impact: {rec.expected_impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Metadata Footer: Source Badge & Timestamp */}
        <div className={`flex items-center gap-2 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
              msg.source === 'openrouter' || msg.source === 'gemini'
                ? 'bg-emerald-50 text-[#2E6B45] border-emerald-200'
                : 'bg-[#F5F0E7] text-[#6D716A] border-[#E8DDCB]'
            }`}
          >
            {msg.source === 'openrouter' || msg.source === 'gemini' ? (
              <>
                <Sparkles size={11} className="text-[#2E6B45]" />
                OpenRouter AI (Grounded)
              </>
            ) : msg.source === 'local_fallback' ? (
              <>
                <Cpu size={11} />
                Local Analytics Fallback (Rule-Based)
              </>
            ) : null}
          </span>

          <span className="text-[10px] text-[#8C847B]">
            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Error Notice */}
        {msg.error && (
          <div className="flex items-start gap-1.5 text-xs text-[#C94A42] bg-red-50 border border-red-200 rounded-lg p-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#C94A42]" />
            <span>{msg.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main NexusIntelligence Page
// ---------------------------------------------------------------------------
export default function NexusIntelligence() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchHealth()
      .then((h) => setAiConfigured(!!(h.openrouter_configured || h.gemini_configured)))
      .catch(() => setAiConfigured(false));

    // Welcome message with initial prompt
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `### Welcome to Smart AI Campus Assistant
I am your campus sustainability co-pilot connected to **OpenRouter AI (google/gemini-3-flash-preview)**. I monitor live telemetry across all **5 campus facilities**:
- 🏛️ **School of Engineering** (Academic Block A)
- 🍽️ **Campus Cafeteria** (Food & Dining Pavilion)
- 🔬 **School of Health Sciences** (Clinical & Academic Wing)
- 🏥 **CDSIMER Hospital** (Healthcare & Main Entrance)
- 🚑 **Hospital Emergency Block** (24/7 Critical Care & Trauma Unit)

**Live Telemetry Baseline:**
- **Estimated Cost Saved**: ₹20,000 (Demonstration Baseline)
- **Monitored Nodes**: 5 Buildings, 12 Rooms, 5 CCTV Optical Nodes
- **Active Subsystems**: Solar arrays, water plumbing, waste collection

How can I assist you with your campus management today?`,
        source: 'local_fallback',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = async (questionText?: string) => {
    const text = (questionText || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setLoading(true);

    try {
      // Send last 6 conversation turns
      const history: ChatMessage[] = messages
        .filter((m) => m.id !== 'welcome' && m.id !== 'welcome-cleared')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await chatWithAI(text, history);

      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.response || res.reply || 'No response text received from the assistant.',
        source: res.source,
        error: res.error,
        recommendations: res.structured_recommendations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: '### Connection Error\nCould not communicate with the NexusEco backend server. Please verify that the backend API is running on port 8000.',
          source: 'local_fallback',
          error: e.message || 'Network request failed',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-cleared',
        role: 'assistant',
        content: `### Chat History Reset
Ask any question regarding campus energy, water leak detection, waste collection, or laboratory telemetry.`,
        source: 'local_fallback',
        timestamp: new Date(),
      },
    ]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2E6B45]/15 text-[#2E6B45] rounded-xl border border-[#2E6B45]/30">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#332820]">Smart AI Campus Assistant</h1>
            <p className="text-xs text-[#6D716A]">
              Grounded AI campus reasoning, anomaly explanation & facilities optimization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {aiConfigured !== null && (
            <div
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${
                aiConfigured
                  ? 'border-emerald-200 bg-emerald-50 text-[#2E6B45]'
                  : 'border-[#E8DDCB] bg-white text-[#6D716A]'
              }`}
            >
              {aiConfigured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#2E6B45] animate-pulse" />
                  OpenRouter Active (gemini-3-flash-preview)
                </>
              ) : (
                <>
                  <Cpu size={12} />
                  Local Analytics Mode
                </>
              )}
            </div>
          )}

          <button
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 hover:border-[#2E6B45] transition-colors"
            onClick={clearChat}
            title="Clear Chat History"
          >
            <RefreshCw size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Unconfigured API Key Warning Banner */}
      {aiConfigured === false && (
        <div className="bg-[#FAF8F5] border border-[#D89A35]/40 rounded-xl p-3 text-xs text-[#332820] flex items-start gap-2.5 shadow-2xs shrink-0">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#D89A35]" />
          <div className="space-y-1">
            <p className="font-semibold text-[#332820]">
              OpenRouter API Key is not configured — Operating in Local Analytics Mode
            </p>
            <p className="text-[#6D716A] leading-relaxed">
              To activate OpenRouter AI reasoning with <span className="font-semibold text-[#292D29]">google/gemini-3-flash-preview</span>, configure your key in <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8DDCB] text-[#332820]">backend/.env</code>:
              <span className="font-mono ml-1 text-[#2E6B45]">OPENROUTER_API_KEY=sk-or-v1-...</span>. Current responses are generated by rule-based analytics operating on live database records.
            </p>
          </div>
        </div>
      )}

      {/* Main Chat & Sidebar Grid */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat Conversation Card */}
        <div className="flex-1 bg-white border border-[#E8DDCB] rounded-xl flex flex-col min-h-0 shadow-2xs overflow-hidden">
          {/* Scrollable Message History */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 min-h-0 bg-[#FAF8F5]/40">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2E6B45] flex items-center justify-center text-white shrink-0">
                  <Bot size={15} />
                </div>
                <div className="bg-white border border-[#E8DDCB] rounded-2xl p-3.5 flex items-center gap-2.5 shadow-xs">
                  <Loader2 size={15} className="animate-spin text-[#2E6B45]" />
                  <span className="text-xs text-[#6D716A]">
                    Retrieving campus telemetry and analyzing records…
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 md:p-4 border-t border-[#E8DDCB] bg-white">
            <div className="flex items-end gap-2 bg-[#FAF8F5] border border-[#E8DDCB] rounded-xl p-1.5 focus-within:border-[#2E6B45] transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about campus energy load, water leaks, waste bins, or laboratories… (Enter to send, Shift+Enter for new line)"
                className="w-full bg-transparent px-3 py-2 text-xs text-[#292D29] placeholder-[#8C847B] focus:outline-none resize-none max-h-32"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className={`p-2.5 rounded-lg text-white font-medium transition-all shrink-0 flex items-center justify-center ${
                  loading || !input.trim()
                    ? 'bg-[#E8DDCB] text-[#A6978A] cursor-not-allowed'
                    : 'bg-[#2E6B45] hover:bg-[#255838] shadow-xs active:scale-95'
                }`}
                title="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Queries Right Sidebar */}
        <div className="w-72 hidden xl:flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D716A] uppercase tracking-wider px-1">
            <Info size={13} className="text-[#C19A6B]" />
            <span>Suggested Inquiries</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-1">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="w-full text-left text-xs p-3 rounded-xl bg-white border border-[#E8DDCB] hover:border-[#2E6B45] hover:bg-[#FAF8F5] text-[#332820] transition-all flex items-start gap-2 group shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 mt-0.5 text-[#C19A6B] group-hover:text-[#2E6B45] group-hover:translate-x-0.5 transition-transform"
                />
                <span className="font-medium leading-relaxed">{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
