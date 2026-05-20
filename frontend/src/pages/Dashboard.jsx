import { useState } from 'react';
import FormSelect from '../components/FormSelect';
import ScriptCard from '../components/ScriptCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useScript } from '../hooks/useScript';
import { toggleFavorite } from '../services/api';
import {
  Sparkles, Trash2, Instagram, Facebook, Youtube,
  Clock, AlertCircle
} from 'lucide-react';

const NICHES = [
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'astrology', label: '🔮 Astrology' },
  { value: 'trading', label: '📈 Trading' },
  { value: 'real estate', label: '🏠 Real Estate' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'general', label: '🌟 General' },
];

const TONES = [
  { value: 'Educational', label: '📚 Educational' },
  { value: 'Motivational', label: '🔥 Motivational' },
  { value: 'Storytelling', label: '📖 Storytelling' },
  { value: 'Casual', label: '😎 Casual' },
  { value: 'Authoritative', label: '💼 Authoritative' },
];

const LANGUAGES = [
  { value: 'Hindi', label: '🇮🇳 Hindi' },
  { value: 'English', label: '🇬🇧 English' },
  { value: 'Hinglish', label: '🌐 Hinglish' },
];

const PLATFORMS = [
  { value: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500', label: 'Instagram' },
  { value: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-400', label: 'Facebook' },
  { value: 'YouTube', icon: Youtube, color: 'from-red-600 to-red-400', label: 'YouTube' },
];

const DURATIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 180, label: '3m' },
];

const defaultForm = {
  topic: '', niche: '', platform: 'Instagram', tone: '', language: '', duration_sec: 60, audience: '',
};

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-10 shimmer rounded-lg" />)}
      </div>
      <div className="h-5 w-32 shimmer rounded" />
      {[1,2,3,4].map(i => (
        <div key={i} className="space-y-2 border border-border-dark rounded-xl p-4">
          <div className="h-4 w-24 shimmer rounded" />
          <div className="h-16 shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [savedId, setSavedId] = useState(null);
  const { loading, error, result, generate, clear } = useScript();
  const [scriptData, setScriptData] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.topic.trim()) errs.topic = 'Topic is required';
    if (!form.niche) errs.niche = 'Please select a niche';
    if (!form.tone) errs.tone = 'Please select a tone';
    if (!form.language) errs.language = 'Please select a language';
    if (!form.audience.trim()) errs.audience = 'Target audience is required';
    return errs;
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSavedId(null);
    try {
      const res = await generate(form);
      const parsed = JSON.parse(res.output_json);
      setScriptData({ parsed, raw: res });
    } catch {}
  };

  const handleClear = () => {
    setForm(defaultForm);
    setErrors({});
    setScriptData(null);
    clear();
  };

  const handleFavorite = async () => {
    if (!scriptData?.raw?.id) return;
    try {
      await toggleFavorite(scriptData.raw.id);
      setSavedId(scriptData.raw.id);
    } catch {}
  };

  const setField = (field) => (e) => {
    setForm({ ...form, [field]: e.target?.value ?? e });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Script Generator</h1>
        <p className="text-text-muted text-sm mt-1">Generate 3 viral AI script variations in seconds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ——— LEFT: Input Form ——— */}
        <div className="card p-5 space-y-5">
          <h2 className="text-base font-semibold text-text-primary border-b border-border-dark pb-3">
            ✍️ Script Details
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4" noValidate>
            {/* Topic */}
            <div>
              <label htmlFor="topic" className="label">Topic <span className="text-red-400">*</span></label>
              <textarea
                id="topic"
                rows={3}
                value={form.topic}
                onChange={setField('topic')}
                placeholder="e.g. Why term insurance is better than endowment plans"
                className={`input-field resize-none ${errors.topic ? 'border-red-500/60' : ''}`}
              />
              {errors.topic && <p className="text-red-400 text-xs mt-1">{errors.topic}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                id="niche"
                label="Niche"
                value={form.niche}
                onChange={setField('niche')}
                options={NICHES}
                required
              />
              {errors.niche && <p className="text-red-400 text-xs mt-1 col-span-2">{errors.niche}</p>}

              <FormSelect
                id="tone"
                label="Tone"
                value={form.tone}
                onChange={setField('tone')}
                options={TONES}
                required
              />
              {errors.tone && <p className="text-red-400 text-xs mt-1 col-span-2">{errors.tone}</p>}
            </div>

            {/* Platform */}
            <div>
              <label className="label">Platform <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(({ value, icon: Icon, color, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, platform: value })}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 ${
                      form.platform === value
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border-dark hover:border-primary/40 hover:bg-white/5'
                    }`}
                    id={`platform-${value.toLowerCase()}`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-text-primary">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                id="language"
                label="Language"
                value={form.language}
                onChange={setField('language')}
                options={LANGUAGES}
                required
              />
              {errors.language && <p className="text-red-400 text-xs mt-1 col-span-2">{errors.language}</p>}
            </div>

            {/* Duration */}
            <div>
              <label className="label flex items-center gap-2">
                <Clock size={13} /> Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, duration_sec: value })}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                      form.duration_sec === value
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'border-border-dark text-text-muted hover:border-primary/40 hover:text-text-primary'
                    }`}
                    id={`duration-${value}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label htmlFor="audience" className="label">Target Audience <span className="text-red-400">*</span></label>
              <input
                id="audience"
                type="text"
                value={form.audience}
                onChange={setField('audience')}
                placeholder="e.g. Young professionals aged 25-35"
                className={`input-field ${errors.audience ? 'border-red-500/60' : ''}`}
              />
              {errors.audience && <p className="text-red-400 text-xs mt-1">{errors.audience}</p>}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                id="generate-btn"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {loading ? 'Generating...' : 'Generate Scripts'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary flex items-center gap-2"
                id="clear-form-btn"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* ——— RIGHT: Results ——— */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-text-primary border-b border-border-dark pb-3 mb-4">
            ✨ Generated Scripts
          </h2>

          {loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="lg" text="AI is crafting your viral scripts..." />
              </div>
              <SkeletonCard />
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30
              text-red-300 rounded-xl p-4 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Generation failed</p>
                <p className="text-xs text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !scriptData && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4
                border border-primary/20">
                <Sparkles size={36} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Ready to Generate</h3>
              <p className="text-text-muted text-sm max-w-xs">
                Fill in the form and click &quot;Generate Scripts&quot; to create 3 viral script variations
              </p>
            </div>
          )}

          {!loading && scriptData && (
            <div className="h-full">
              {savedId && (
                <div className="flex items-center gap-2 bg-accent-green/10 border border-accent-green/30
                  text-accent-green rounded-lg px-4 py-2.5 text-sm mb-4">
                  ✅ Saved to favorites!
                </div>
              )}
              <ScriptCard
                script={scriptData.parsed}
                metadata={{
                  topic: form.topic, niche: form.niche, platform: form.platform,
                  tone: form.tone, language: form.language,
                  duration_sec: form.duration_sec, audience: form.audience,
                }}
                onFavorite={handleFavorite}
                onRegenerate={handleGenerate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
