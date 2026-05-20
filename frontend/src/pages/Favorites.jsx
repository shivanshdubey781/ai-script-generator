import { useState, useEffect } from 'react';
import { getFavorites, toggleFavorite, deleteScript } from '../services/api';
import ScriptCard from '../components/ScriptCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function FavoriteRow({ script, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = (() => { try { return JSON.parse(script.output_json); } catch { return null; } })();

  return (
    <div className="card border border-border-dark overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Star size={14} fill="currentColor" className="text-accent-amber flex-shrink-0" />
            <p className="text-sm font-semibold text-text-primary truncate">{script.topic}</p>
            <span className="badge bg-primary/10 text-primary border border-primary/20 capitalize text-xs">
              {script.niche}
            </span>
            <span className="text-xs text-text-muted hidden sm:inline">{script.platform} · {script.language}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {new Date(script.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(script.id); }}
            className="p-1.5 rounded-lg text-accent-amber hover:bg-accent-amber/10 transition-all"
            title="Remove from favorites"
          >
            <Star size={15} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(script.id); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete script"
          >
            <Trash2 size={15} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </div>

      {expanded && parsed && (
        <div className="border-t border-border-dark p-5 animate-slide-up">
          <ScriptCard
            script={parsed}
            metadata={{
              topic: script.topic, niche: script.niche, platform: script.platform,
              tone: script.tone, language: script.language,
              duration_sec: script.duration_sec, audience: script.audience,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFavorites()
      .then(res => setFavorites(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id) => {
    try {
      await toggleFavorite(id);
      setFavorites(f => f.filter(s => s.id !== id));
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this script permanently?')) return;
    try {
      await deleteScript(id);
      setFavorites(f => f.filter(s => s.id !== id));
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Star size={22} className="text-accent-amber" fill="currentColor" /> Favorites
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {favorites.length} saved script{favorites.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading favorites..." /></div>
      ) : favorites.length === 0 ? (
        <div className="card p-16 text-center">
          <Star size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No favorites yet</h3>
          <p className="text-text-muted text-sm">Save scripts from the Dashboard to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map(script => (
            <FavoriteRow
              key={script.id}
              script={script}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
