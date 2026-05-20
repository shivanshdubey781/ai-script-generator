import { useState } from 'react';
import CopyButton from './CopyButton';
import { copyText } from '../utils/copyText';
import { exportScriptsPDF } from '../utils/exportPDF';
import {
  Mic, Tag, Film, MessageSquare, Hash,
  Star, Download, RefreshCw, ChevronDown, ChevronUp,
  Lightbulb, Megaphone, FileText
} from 'lucide-react';

const HOOK_COLORS = {
  curiosity: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  shock: 'bg-red-500/15 text-red-300 border-red-500/30',
  story: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

const HOOK_ICONS = {
  curiosity: '🔮',
  shock: '⚡',
  story: '📖',
};

function SectionBlock({ icon: Icon, label, content, copyable = true }) {
  const [expanded, setExpanded] = useState(true);
  const charCount = content ? String(content).length : 0;

  return (
    <div className="border border-border-dark rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-white/3 cursor-pointer
          hover:bg-white/5 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />}
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
          <span className="text-xs text-text-muted/60">({charCount} chars)</span>
        </div>
        <div className="flex items-center gap-2">
          {copyable && content && <CopyButton text={typeof content === 'string' ? content : content?.join(' ')} />}
          {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 py-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

export default function ScriptCard({ script, metadata, onFavorite, onRegenerate }) {
  const [activeTab, setActiveTab] = useState(0);
  const variations = script?.variations || [];
  const current = variations[activeTab] || {};

  const handleExportPDF = () => {
    exportScriptsPDF(script, metadata);
  };

  const handleCopyAll = async () => {
    const text = variations.map((v, i) =>
      `=== VARIATION ${i + 1} — ${v.hook_style?.toUpperCase()} HOOK ===\n\nHOOK:\n${v.hook}\n\nSCRIPT:\n${v.script}\n\nCTA:\n${v.cta}\n\nCAPTION:\n${v.caption}\n\nHASHTAGS:\n${v.hashtags?.join(' ')}`
    ).join('\n\n' + '='.repeat(50) + '\n\n');
    await copyText(text);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Variation Tabs */}
      <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-xl border border-border-dark">
        {variations.map((v, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200 ${activeTab === i
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}
            id={`variation-tab-${i + 1}`}
          >
            <span>{HOOK_ICONS[v.hook_style] || '✨'}</span>
            <span className="hidden sm:inline">Variation {i + 1}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Hook style badge */}
      {current.hook_style && (
        <div className="flex items-center gap-2 mb-4">
          <span className={`badge border ${HOOK_COLORS[current.hook_style] || 'bg-primary/10 text-primary border-primary/30'}`}>
            {HOOK_ICONS[current.hook_style]} {current.hook_style?.charAt(0).toUpperCase() + current.hook_style?.slice(1)} Hook
          </span>
          <span className="text-xs text-text-muted">Variation {activeTab + 1} of {variations.length}</span>
        </div>
      )}

      {/* Content sections */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        <SectionBlock icon={Lightbulb} label="Hook" content={current.hook} />
        <SectionBlock icon={FileText} label="Full Script" content={current.script} />
        <SectionBlock icon={Megaphone} label="Call to Action" content={current.cta} />
        <SectionBlock icon={MessageSquare} label="Caption" content={current.caption} />

        {/* Hashtags */}
        {current.hashtags?.length > 0 && (
          <div className="border border-border-dark rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/3">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-primary" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Hashtags</span>
              </div>
              <CopyButton text={current.hashtags.join(' ')} />
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {current.hashtags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => copyText(tag)}
                  className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary
                    border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shot suggestions */}
        {current.shot_suggestions?.length > 0 && (
          <div className="border border-border-dark rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3">
              <Film size={14} className="text-primary" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Shot Suggestions</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {current.shot_suggestions.map((shot, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-text-primary">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary
                    flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{shot}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voiceover style */}
        {current.voiceover_style && (
          <div className="border border-accent-amber/20 bg-accent-amber/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mic size={14} className="text-accent-amber" />
              <span className="text-xs font-semibold text-accent-amber uppercase tracking-wider">Voiceover Style</span>
            </div>
            <p className="text-sm text-text-primary">{current.voiceover_style}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-dark">
        <button
          onClick={handleCopyAll}
          className="btn-secondary flex items-center gap-2 text-sm flex-1"
          id="copy-all-btn"
        >
          <Tag size={15} />
          Copy All
        </button>
        {onFavorite && (
          <button
            onClick={onFavorite}
            className="btn-secondary flex items-center gap-2 text-sm flex-1 hover:border-accent-amber/50 hover:text-accent-amber"
            id="save-favorites-btn"
          >
            <Star size={15} />
            Save
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="btn-ghost flex items-center gap-2 text-sm"
            id="regenerate-btn"
          >
            <RefreshCw size={15} />
            Regen
          </button>
        )}
        <button
          onClick={handleExportPDF}
          className="btn-primary flex items-center gap-2 text-sm"
          id="export-pdf-btn"
        >
          <Download size={15} />
          PDF
        </button>
      </div>
    </div>
  );
}
