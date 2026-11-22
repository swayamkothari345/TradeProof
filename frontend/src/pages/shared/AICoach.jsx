import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, Plus, MessageSquare, Trash2, Edit3, Check, X, Send, Sparkles,
  ChevronRight, Loader2, AlertCircle, Menu, TrendingUp,
} from 'lucide-react';
import { aicoachApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderInline(text) {
  const tokens = [];
  const regex = /(\*\*[\s\S]+?\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) tokens.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith('**')) tokens.push(<strong key={key++}>{m.slice(2, -2)}</strong>);
    else if (m.startsWith('`')) tokens.push(<code key={key++}>{m.slice(1, -1)}</code>);
    else tokens.push(<em key={key++}>{m.slice(1, -1)}</em>);
    last = match.index + m.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

function MarkdownContent({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('### ')) { elements.push(<h3 key={key++}>{renderInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h2 key={key++}>{renderInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# ')) { elements.push(<h1 key={key++}>{renderInline(line.slice(2))}</h1>); i++; continue; }

    if (line.startsWith('```')) {
      const codeLines = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(<pre key={key++}><code>{codeLines.join('\n')}</code></pre>);
      continue;
    }

    if (line.startsWith('> ')) {
      const ql = []; while (i < lines.length && lines[i].startsWith('> ')) { ql.push(lines[i].slice(2)); i++; }
      elements.push(<blockquote key={key++}><p>{renderInline(ql.join(' '))}</p></blockquote>);
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) { items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>); i++; }
      elements.push(<ul key={key++}>{items}</ul>);
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) { items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>); i++; }
      elements.push(<ol key={key++}>{items}</ol>);
      continue;
    }

    if (line.trim().match(/^[-*]{3,}$/) || line.trim() === '---') { elements.push(<hr key={key++} />); i++; continue; }

    // Paragraph — collect non-special consecutive lines
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,3} |```|> |[-*]\s|\d+\.\s)/)) {
      para.push(lines[i]); i++;
    }
    if (para.length) elements.push(<p key={key++}>{renderInline(para.join(' '))}</p>);
    else { elements.push(<p key={key++}>{renderInline(line)}</p>); i++; }
  }

  return <div className="ai-markdown">{elements}</div>;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { label: 'Teach me technical analysis from scratch', icon: '📈' },
  { label: 'Explain options trading with practical examples', icon: '📊' },
  { label: 'What are my most repeated trading mistakes?', icon: '🔍' },
  { label: 'How do I calculate position sizing?', icon: '🧮' },
  { label: 'Give me a NIFTY trading scenario to practise', icon: '🎯' },
  { label: 'Explain risk-to-reward ratio with examples', icon: '⚖️' },
  { label: 'Create a 7-day trading learning plan for me', icon: '📅' },
  { label: 'How do I improve my trading discipline?', icon: '🧠' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Conversation Sidebar ─────────────────────────────────────────────────────

function ConversationSidebar({ conversations, selectedId, onSelect, onCreate, onDelete, onRename, isCreating, open, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (conv) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };
  const commitRename = (id) => {
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        />
      )}
      <aside
        className={[
          'flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200',
          'w-[240px]',
          // Mobile: fixed overlay
          'fixed inset-y-0 left-0 z-30 md:relative md:inset-auto md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--badge-purple-bg)' }}>
              <Brain size={13} style={{ color: 'var(--badge-purple-color)' }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>AI Coach</span>
          </div>
          <button className="md:hidden" onClick={onClose} style={{ color: 'var(--text-3)' }}><X size={15} /></button>
        </div>

        {/* New conversation button */}
        <div className="px-2 py-2 flex-shrink-0">
          <button
            onClick={onCreate}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px dashed var(--accent)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'}
          >
            <Plus size={14} />
            New conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {conversations?.length === 0 && (
            <p className="text-center text-[12px] py-6" style={{ color: 'var(--text-3)' }}>No conversations yet</p>
          )}
          {conversations?.map(conv => {
            const isSelected = conv.id === selectedId;
            const lastMsg = conv.messages?.[0];
            return (
              <div
                key={conv.id}
                className="group relative flex items-start gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  boxShadow: isSelected ? 'inset 2px 0 0 var(--accent)' : 'none',
                }}
                onClick={() => { onSelect(conv.id); onClose(); }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <MessageSquare size={13} className="flex-shrink-0 mt-0.5" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-3)' }} />
                <div className="min-w-0 flex-1">
                  {editingId === conv.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        className="text-[12px] flex-1 bg-transparent border-b outline-none min-w-0"
                        style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => commitRename(conv.id)}><Check size={11} style={{ color: 'var(--pos)' }} /></button>
                      <button onClick={() => setEditingId(null)}><X size={11} style={{ color: 'var(--text-3)' }} /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] font-medium truncate leading-tight" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-2)' }}>
                        {conv.title}
                      </p>
                      {lastMsg && (
                        <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {timeAgo(lastMsg.createdAt)}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {/* Actions */}
                {editingId !== conv.id && (
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-0.5 rounded"
                      onClick={() => startRename(conv)}
                      title="Rename"
                      style={{ color: 'var(--text-3)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      className="p-0.5 rounded"
                      onClick={() => onDelete(conv.id)}
                      title="Delete"
                      style={{ color: 'var(--text-3)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--neg)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Educational use only · No financial advice · Simulated data only
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
        style={{
          backgroundColor: isUser ? 'var(--accent-subtle)' : 'var(--badge-purple-bg)',
          color: isUser ? 'var(--accent)' : 'var(--badge-purple-color)',
        }}
      >
        {isUser ? 'Y' : <Brain size={13} />}
      </div>

      {/* Bubble */}
      <div
        className="max-w-[75%] px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-surface)',
          color: isUser ? 'var(--accent-fg)' : 'inherit',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        {isUser ? (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--accent-fg)' }}>
            {message.content}
          </p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--badge-purple-bg)' }}>
        <Brain size={13} style={{ color: 'var(--badge-purple-color)' }} />
      </div>
      <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-3)', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onPrompt, onNew }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--badge-purple-bg)' }}>
        <Brain size={28} style={{ color: 'var(--badge-purple-color)' }} />
      </div>
      <h2 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
        TradeProof AI Coach
      </h2>
      <p className="text-[13px] max-w-md leading-relaxed mb-8" style={{ color: 'var(--text-3)' }}>
        Your personal trading education assistant. Ask anything about trading concepts, get personalised analysis of your practice data, or work through interactive learning scenarios.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTED_PROMPTS.map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => onPrompt(label)}
            className="flex items-center gap-2.5 text-left px-4 py-3 rounded-xl text-[13px] transition-all duration-100"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
          >
            <span className="text-[16px] flex-shrink-0">{icon}</span>
            <span className="font-medium leading-snug">{label}</span>
            <ChevronRight size={13} className="ml-auto flex-shrink-0 opacity-50" />
          </button>
        ))}
      </div>

      <button
        onClick={onNew}
        className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
      >
        <Sparkles size={14} />
        Start a new conversation
      </button>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────

function ChatWindow({ conversationId, onSidebarOpen, pendingPrompt, onPendingPromptConsumed }) {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: conv, isLoading } = useQuery({
    queryKey: ['ai-conv', conversationId],
    queryFn: () => aicoachApi.getConversation(conversationId).then(r => r.data.data),
    enabled: !!conversationId,
    refetchOnWindowFocus: false,
  });

  const sendMutation = useMutation({
    mutationFn: (content) => aicoachApi.sendMessage(conversationId, content).then(r => r.data.data),
    onMutate: async (content) => {
      // Optimistic: add user message immediately
      await qc.cancelQueries({ queryKey: ['ai-conv', conversationId] });
      const prev = qc.getQueryData(['ai-conv', conversationId]);
      qc.setQueryData(['ai-conv', conversationId], old => old ? {
        ...old,
        messages: [...(old.messages || []), {
          id: 'temp-' + Date.now(), role: 'user', content, createdAt: new Date().toISOString(),
        }],
      } : old);
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['ai-conv', conversationId], ctx.prev);
    },
    onSuccess: ({ userMessage, aiMessage }) => {
      qc.setQueryData(['ai-conv', conversationId], old => old ? {
        ...old,
        messages: [
          ...(old.messages || []).filter(m => !m.id.startsWith('temp-')),
          userMessage,
          aiMessage,
        ],
      } : old);
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });

  const messages = conv?.messages || [];
  const isSending = sendMutation.isPending;

  // Auto-send pending prompt when it arrives
  useEffect(() => {
    if (pendingPrompt && !isSending) {
      onPendingPromptConsumed?.();
      sendMutation.mutate(pendingPrompt);
    }
  }, [pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isSending]);

  const send = useCallback(() => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    sendMutation.mutate(content);
  }, [input, isSending, sendMutation]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!conversationId) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <button
          className="md:hidden w-7 h-7 flex items-center justify-center rounded"
          style={{ color: 'var(--text-3)' }}
          onClick={onSidebarOpen}
        >
          <Menu size={15} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--badge-purple-bg)' }}>
            <Brain size={12} style={{ color: 'var(--badge-purple-color)' }} />
          </div>
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
            {isLoading ? 'Loading…' : (conv?.title || 'AI Coach')}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--pos)' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>AI Coach</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-3)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare size={24} className="mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Start the conversation</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>Type a question or choose a suggested prompt below</p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTED_PROMPTS.slice(0, 4).map(({ label }) => (
                <button key={label}
                  onClick={() => { setInput(label); inputRef.current?.focus(); }}
                  className="text-[12px] px-3 py-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isSending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {sendMutation.isError && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
          style={{ backgroundColor: 'var(--neg-bg)', color: 'var(--neg)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={13} />
          {sendMutation.error?.response?.data?.message ?? 'Failed to get a response. Please try again.'}
        </div>
      )}

      {/* Composer */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about trading concepts, your performance, or anything else…"
            disabled={isSending}
            className="flex-1 bg-transparent resize-none outline-none text-[13px] leading-relaxed min-h-[22px] max-h-[120px]"
            style={{ color: 'var(--text)', overflowY: 'auto', scrollbarWidth: 'none' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isSending}
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-100 disabled:opacity-40"
            style={{ backgroundColor: input.trim() && !isSending ? 'var(--accent)' : 'var(--bg-sunken)', color: input.trim() && !isSending ? 'var(--accent-fg)' : 'var(--text-3)' }}
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--text-3)' }}>
          Enter to send · Shift+Enter for new line · Educational purposes only
        </p>
      </div>
    </div>
  );
}

// ─── Main AICoach page ────────────────────────────────────────────────────────

export default function AICoach() {
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // pendingPrompt carries a { convId, text } when a welcome-screen prompt is clicked
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => aicoachApi.conversations().then(r => r.data.data),
  });

  // Auto-select the most recent conversation on first load
  useEffect(() => {
    if (conversations?.length && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useMutation({
    mutationFn: () => aicoachApi.createConversation().then(r => r.data.data),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
      setSelectedConvId(conv.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => aicoachApi.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (selectedConvId === deletedId) {
        const remaining = (conversations || []).filter(c => c.id !== deletedId);
        setSelectedConvId(remaining[0]?.id ?? null);
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => aicoachApi.updateConversation(id, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-conversations'] }),
  });

  // Create a conversation then queue the prompt for auto-send once ChatWindow mounts
  const handlePrompt = async (prompt) => {
    try {
      const conv = await createMutation.mutateAsync();
      setPendingPrompt({ convId: conv.id, text: prompt });
      setSelectedConvId(conv.id);
    } catch {
      // createMutation error state will show any failure
    }
  };

  return (
    <div
      className="flex overflow-hidden rounded-lg"
      style={{
        height: 'calc(100vh - 100px)',
        minHeight: '500px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-raised)',
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedConvId}
        onSelect={setSelectedConvId}
        onCreate={() => createMutation.mutate()}
        onDelete={(id) => deleteMutation.mutate(id)}
        onRename={(id, title) => renameMutation.mutate({ id, title })}
        isCreating={createMutation.isPending}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      {selectedConvId ? (
        <ChatWindow
          key={selectedConvId}
          conversationId={selectedConvId}
          onSidebarOpen={() => setSidebarOpen(true)}
          pendingPrompt={pendingPrompt?.convId === selectedConvId ? pendingPrompt.text : null}
          onPendingPromptConsumed={() => setPendingPrompt(null)}
        />
      ) : (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <button
              className="md:hidden w-7 h-7 flex items-center justify-center rounded"
              style={{ color: 'var(--text-3)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={15} />
            </button>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>AI Trading Coach</span>
          </div>
          <WelcomeScreen
            onPrompt={handlePrompt}
            onNew={() => createMutation.mutate()}
          />
        </div>
      )}
    </div>
  );
}
