import { useState, useEffect } from 'react';
import {
  getAdminStats, getTemplates, createTemplate,
  updateTemplate, deleteTemplate
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Shield, Users, FileText, TrendingUp, Plus, Edit2,
  Trash2, CheckCircle, X, Save, AlertCircle, BarChart2
} from 'lucide-react';

const NICHES = ['insurance', 'astrology', 'trading', 'real estate', 'fitness', 'general'];

function StatCard({ label, value, icon: Icon, color = 'primary' }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    green: 'text-accent-green bg-accent-green/10 border-accent-green/20',
    amber: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <div className={`card p-5 border ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">{label}</p>
          <p className="text-3xl font-bold">{value ?? '—'}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center opacity-70">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    niche: template?.niche || '',
    template_text: template?.template_text || '',
    is_active: template?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.niche || !form.template_text.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (template) {
        const res = await updateTemplate(template.id, form);
        onSave(res.data, false);
      } else {
        const res = await createTemplate(form);
        onSave(res.data, true);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark">
          <h3 className="text-lg font-bold text-text-primary">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div>
            <label className="label">Niche</label>
            <select
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              className="input-field"
              id="template-niche-select"
            >
              <option value="">Select niche</option>
              {NICHES.map(n => (
                <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Template Text</label>
            <textarea
              rows={12}
              value={form.template_text}
              onChange={(e) => setForm({ ...form, template_text: e.target.value })}
              placeholder="Enter the niche-specific prompt instructions..."
              className="input-field resize-none font-mono text-sm"
              id="template-text-input"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
                form.is_active ? 'bg-accent-green' : 'bg-border-dark'
              }`}
              id="template-active-toggle"
            >
              <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${
                form.is_active ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-sm text-text-muted">Active template</span>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border-dark">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            id="save-template-btn"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplates() {
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTemplate, setModalTemplate] = useState(undefined); // undefined = closed, null = new
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getTemplates()])
      .then(([statsRes, templatesRes]) => {
        setStats(statsRes.data);
        setTemplates(templatesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleModalSave = (template, isNew) => {
    if (isNew) {
      setTemplates(t => [template, ...t]);
    } else {
      setTemplates(t => t.map(tmpl => tmpl.id === template.id ? template : tmpl));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template permanently?')) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      setTemplates(t => t.filter(tmpl => tmpl.id !== id));
    } catch {} finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <LoadingSpinner size="lg" text="Loading admin panel..." />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield size={22} className="text-accent-amber" /> Admin Panel
          </h1>
          <p className="text-text-muted text-sm mt-1">Platform statistics and prompt template management</p>
        </div>
        <button
          onClick={() => setModalTemplate(null)}
          className="btn-primary flex items-center gap-2"
          id="create-template-btn"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="primary" />
        <StatCard label="Total Scripts" value={stats?.total_scripts} icon={FileText} color="green" />
        <StatCard label="Scripts Today" value={stats?.scripts_today} icon={TrendingUp} color="amber" />
        <StatCard label="Templates" value={templates.length} icon={BarChart2} color="blue" />
      </div>

      {/* Top Niches */}
      {stats?.top_niches?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Top Niches</h3>
          <div className="space-y-3">
            {stats.top_niches.map((n, i) => (
              <div key={n.niche} className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-4">{i + 1}.</span>
                <span className="text-sm font-medium text-text-primary capitalize flex-1">{n.niche}</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 bg-border-dark rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-primary to-accent-green"
                      style={{ width: `${Math.min(100, (n.count / (stats?.total_scripts || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-8 text-right">{n.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-dark flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Prompt Templates</h3>
          <span className="text-xs text-text-muted">{templates.length} templates</span>
        </div>

        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-text-muted text-sm">No templates yet. Create one to override default prompts.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-dark">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="flex items-start gap-4 p-5 hover:bg-white/3 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="badge bg-primary/10 text-primary border border-primary/20 capitalize">
                      {tmpl.niche}
                    </span>
                    {tmpl.is_active
                      ? <span className="badge bg-accent-green/10 text-accent-green border border-accent-green/20">
                          <CheckCircle size={9} /> Active
                        </span>
                      : <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>}
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2 font-mono">{tmpl.template_text}</p>
                  <p className="text-xs text-text-muted/60 mt-1">
                    {new Date(tmpl.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setModalTemplate(tmpl)}
                    className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                    id={`edit-template-${tmpl.id}`}
                    title="Edit template"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    disabled={deletingId === tmpl.id}
                    className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                    id={`delete-template-${tmpl.id}`}
                    title="Delete template"
                  >
                    {deletingId === tmpl.id
                      ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalTemplate !== undefined && (
        <TemplateModal
          template={modalTemplate}
          onSave={handleModalSave}
          onClose={() => setModalTemplate(undefined)}
        />
      )}
    </div>
  );
}
