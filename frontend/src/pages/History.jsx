import { useState, useEffect, useCallback } from 'react';
import { getHistory, deleteScript, toggleFavorite } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search, ChevronLeft, ChevronRight, Trash2, Star, Eye,
  FileText, Filter, History as HistoryIcon, X, Copy,
  Hash, Video, Mic, Target, Zap, ChevronDown, ChevronUp, Check
} from 'lucide-react';

const NICHE_OPTIONS = ['', 'insurance', 'astrology', 'trading', 'real estate', 'fitness', 'general'];

const PLATFORM_BADGE = {
  Instagram: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
  Facebook:  'bg-blue-500/10 text-blue-300 border-blue-500/30',
  YouTube:   'bg-red-500/10 text-red-300 border-red-500/30',
};

const HOOK_STYLE_COLOR = {
  curiosity: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  shock:     'text-red-300 bg-red-500/10 border-red-500/30',
  story:     'text-amber-300 bg-amber-500/10 border-amber-500/30',
};

/* ─── Copy-to-clipboard helper ─── */
function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary border border-border-dark
        hover:border-primary/30 transition-all"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

/* ─── Single variation card (inside modal) ─── */
function VariationCard({ v }) {
  const [open, setOpen] = useState(true);
  const hookColor = HOOK_STYLE_COLOR[v.hook_style?.toLowerCase()] || 'text-primary bg-primary/10 border-primary/30';

  return (
    <div className="rounded-xl border border-border-dark bg-white/3 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5
          hover:bg-white/4 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
            Variation {v.variation_number}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${hookColor}`}>
            {v.hook_style} hook
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border-dark pt-4">

          {/* Hook */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={11} className="text-accent-amber" /> Hook
              </p>
              <CopyButton text={v.hook} label="Copy hook" />
            </div>
            <p className="text-sm text-white/90 leading-relaxed bg-white/5 rounded-lg px-4 py-3 italic border-l-2 border-primary/40">
              "{v.hook}"
            </p>
          </div>

          {/* Full Script */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={11} className="text-primary" /> Full Script
              </p>
              <CopyButton text={v.script} label="Copy script" />
            </div>
            <pre className="text-sm text-text-primary leading-relaxed bg-white/5 rounded-lg px-4 py-3
              whitespace-pre-wrap font-sans border border-border-dark max-h-56 overflow-y-auto">
              {v.script}
            </pre>
          </div>

          {/* CTA */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Target size={11} className="text-green-400" /> Call to Action
            </p>
            <div className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-2.5">
              <p className="text-sm text-green-300 font-medium">{v.cta}</p>
              <CopyButton text={v.cta} label="Copy" />
            </div>
          </div>

          {/* Caption */}
          {v.caption && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Caption</p>
                <CopyButton text={v.caption} label="Copy caption" />
              </div>
              <p className="text-sm text-text-secondary bg-white/5 rounded-lg px-4 py-3 border border-border-dark leading-relaxed">
                {v.caption}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {v.hashtags?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={11} className="text-blue-400" /> Hashtags
                </p>
                <CopyButton text={v.hashtags.join(' ')} label="Copy all" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {v.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10
                    text-blue-300 border border-blue-500/20 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shot Suggestions & Voiceover — side by side on wider screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.shot_suggestions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Video size={11} className="text-pink-400" /> Shot Suggestions
                </p>
                <ul className="space-y-1.5">
                  {v.shot_suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-text-secondary flex gap-2 items-start">
                      <span className="text-pink-400 font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{s.replace(/^Shot \d+:\s*/i, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {v.voiceover_style && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mic size={11} className="text-purple-400" /> Voiceover Style
                </p>
                <p className="text-xs text-text-secondary bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2.5 leading-relaxed">
                  {v.voiceover_style}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Script Detail Modal ─── */
function ScriptModal({ script, onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  let variations = [];
  try {
    const parsed = JSON.parse(script.output_json);
    variations = parsed.variations || [];
  } catch {
    variations = [];
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl
        border border-border-dark shadow-2xl"
        style={{ background: 'var(--color-bg-card, #1a1a2e)' }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-dark shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-text-primary truncate">{script.topic}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="badge bg-primary/10 text-primary border border-primary/20 capitalize text-xs">
                {script.niche}
              </span>
              <span className={`badge border text-xs ${PLATFORM_BADGE[script.platform] || 'bg-white/5 text-text-muted border-border-dark'}`}>
                {script.platform}
              </span>
              <span className="text-xs text-text-muted">{script.language}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{script.duration_sec}s</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted capitalize">{script.tone} tone</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-all shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Variation Tabs */}
        {variations.length > 1 && (
          <div className="flex gap-1 px-6 pt-4 shrink-0">
            {variations.map((v, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === i
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                V{i + 1} · {v.hook_style?.charAt(0).toUpperCase() + v.hook_style?.slice(1) || `Variation ${i+1}`}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {variations.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Script content not available</p>
            </div>
          ) : (
            <VariationCard key={activeTab} v={variations[activeTab]} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-dark shrink-0">
          <p className="text-xs text-text-muted">
            {new Date(script.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            {script.token_count > 0 && <> · {script.token_count.toLocaleString()} tokens</>}
          </p>
          {variations.length > 0 && (
            <CopyButton
              text={variations[activeTab]?.script || ''}
              label="Copy full script"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main History Page ─── */
export default function History() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [niche, setNiche] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [deletingId, setDeletingId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHistory({ page, limit: 10, niche: niche || undefined, search: search || undefined });
      setScripts(res.data.items);
      setPagination({ total: res.data.total, pages: res.data.pages });
    } catch {} finally {
      setLoading(false);
    }
  }, [page, search, niche]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { setPage(1); }, [search, niche]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this script?')) return;
    setDeletingId(id);
    try {
      await deleteScript(id);
      setScripts(prev => prev.filter(s => s.id !== id));
      setPagination(p => ({ ...p, total: p.total - 1 }));
      if (selectedScript?.id === id) setSelectedScript(null);
    } catch {} finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(id);
      setScripts(prev => prev.map(s => s.id === id ? { ...s, is_favorite: res.data.is_favorite } : s));
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <HistoryIcon size={22} className="text-primary" /> Script History
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {pagination.total} script{pagination.total !== 1 ? 's' : ''} generated
            {pagination.total > 0 && <span className="text-text-muted/60 ml-1">· click any row to view full script</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            id="history-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic..."
            className="input-field pl-9"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <select
            id="history-niche-filter"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="input-field pl-9 min-w-40 appearance-none"
          >
            <option value="">All Niches</option>
            {NICHE_OPTIONS.filter(Boolean).map(n => (
              <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading history..." /></div>
      ) : scripts.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={48} className="text-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No scripts found</h3>
          <p className="text-text-muted text-sm">
            {search || niche ? 'Try adjusting your filters' : 'Generate your first script to see it here'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-dark bg-white/3">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Topic</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Niche</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Language</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {scripts.map((script) => (
                  <tr
                    key={script.id}
                    onClick={() => setSelectedScript(script)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    title="Click to view full script"
                  >
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {new Date(script.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-text-primary font-medium line-clamp-1 max-w-48 group-hover:text-primary transition-colors">
                          {script.topic}
                        </p>
                        <Eye size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="badge bg-primary/10 text-primary border border-primary/20 capitalize">
                        {script.niche}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`badge border ${PLATFORM_BADGE[script.platform] || 'bg-white/5 text-text-muted border-border-dark'}`}>
                        {script.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-text-muted">{script.language}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleToggleFavorite(e, script.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            script.is_favorite
                              ? 'text-accent-amber bg-accent-amber/10'
                              : 'text-text-muted hover:text-accent-amber hover:bg-accent-amber/10'
                          }`}
                          title={script.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star size={15} fill={script.is_favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedScript(script); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                          title="View script"
                          id={`view-script-${script.id}`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, script.id)}
                          disabled={deletingId === script.id}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete script"
                          id={`delete-script-${script.id}`}
                        >
                          {deletingId === script.id
                            ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-dark">
              <p className="text-xs text-text-muted">
                Page {page} of {pagination.pages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-border-dark text-text-muted hover:text-primary
                    hover:border-primary/40 transition-all disabled:opacity-40"
                  id="prev-page-btn"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="p-2 rounded-lg border border-border-dark text-text-muted hover:text-primary
                    hover:border-primary/40 transition-all disabled:opacity-40"
                  id="next-page-btn"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Script Detail Modal */}
      {selectedScript && (
        <ScriptModal script={selectedScript} onClose={() => setSelectedScript(null)} />
      )}
    </div>
  );
}
