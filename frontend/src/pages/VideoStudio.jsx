import { useState, useEffect, useRef } from 'react';
import { Video, Film, Download, RefreshCw, CheckCircle, Clock, XCircle, Loader, Wand2, Lock, FlaskConical, AlertTriangle } from 'lucide-react';
import { generateVideo, getVideoStatus, getVideoHistory } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the error string is a credit-insufficient error from the API. */
function isCreditError(msg = '') {
  return msg.includes('credit') || msg.includes('402') || msg.includes('upgrade');
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { id: '9:16', label: 'Reels / TikTok', sub: '9:16 Vertical', icon: '📱' },
  { id: '16:9', label: 'YouTube', sub: '16:9 Horizontal', icon: '🖥️' },
  { id: '1:1', label: 'Square', sub: '1:1 Post', icon: '⬜' },
];

const DURATIONS = [3, 5, 8];

const RESOLUTIONS = [
  { id: '480p', label: '480p', sub: 'Standard', available: true },
  { id: '720p', label: '720p', sub: 'Coming Soon', available: false },
];

const PIPELINE_STEPS = [
  { key: 'pending', label: 'Preparing your request' },
  { key: 'generating_video', label: 'Creating video frames' },
  { key: 'adding_voice', label: 'Generating voiceover audio' },
  { key: 'assembling', label: 'Assembling final video' },
  { key: 'done', label: 'Complete' },
];

const STATUS_STEP_MAP = {
  pending: 0,
  generating_video: 1,
  adding_voice: 2,
  assembling: 3,
  done: 4,
};

// ── Helper components ─────────────────────────────────────────────────────────

function StepIcon({ state }) {
  if (state === 'done') return <CheckCircle size={18} className="text-emerald-400" />;
  if (state === 'active') return <Loader size={18} className="text-indigo-400 animate-spin" />;
  if (state === 'failed') return <XCircle size={18} className="text-red-400" />;
  return <Clock size={18} className="text-gray-600" />;
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-gray-700 text-gray-300',
    generating_video: 'bg-blue-900/60 text-blue-300 animate-pulse',
    adding_voice: 'bg-purple-900/60 text-purple-300 animate-pulse',
    assembling: 'bg-amber-900/60 text-amber-300 animate-pulse',
    done: 'bg-emerald-900/60 text-emerald-300',
    failed: 'bg-red-900/60 text-red-300',
  };
  const labels = {
    pending: 'Pending', generating_video: 'Generating', adding_voice: 'Voiceover',
    assembling: 'Assembling', done: 'Done', failed: 'Failed',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || map.pending}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [voiceoverText, setVoiceoverText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('480p');

  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);   // { status, progress, video_url, error }
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState('');

  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);

  // ── Fetch history on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchHistory();
    return () => stopPolling();
  }, []);

  async function fetchHistory() {
    try {
      const { data } = await getVideoHistory();
      setHistory(data);
    } catch (_) {}
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  function startPolling(id) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getVideoStatus(id);
        setJobStatus(data);
        if (data.status === 'done') {
          stopPolling();
          setIsGenerating(false);
          setVideoUrl(data.video_url);
          fetchHistory();
        } else if (data.status === 'failed') {
          stopPolling();
          setIsGenerating(false);
          setError(data.error || 'Video generation failed. Please try again.');
        }
      } catch (_) {}
    }, 5000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Visual prompt must be at least 10 characters.');
      return;
    }
    if (!voiceoverText.trim() || voiceoverText.trim().length < 10) {
      setError('Voiceover text must be at least 10 characters.');
      return;
    }
    setError('');
    setVideoUrl(null);
    setJobStatus(null);
    setIsGenerating(true);

    try {
      const { data } = await generateVideo({
        prompt: prompt.trim(),
        voiceover_text: voiceoverText.trim(),
        aspect_ratio: aspectRatio,
        duration_seconds: duration,
        resolution,
      });
      setJobId(data.job_id);
      setJobStatus({ status: 'pending', progress: 5 });
      startPolling(data.job_id);
    } catch (e) {
      setIsGenerating(false);
      setError(e.response?.data?.detail || 'Failed to start video generation. Please try again.');
    }
  }

  function handleReset() {
    stopPolling();
    setIsGenerating(false);
    setJobId(null);
    setJobStatus(null);
    setVideoUrl(null);
    setError('');
  }

  // ── Step state helper ──────────────────────────────────────────────────────
  function getStepState(stepIdx) {
    if (!jobStatus) return 'waiting';
    const currentIdx = STATUS_STEP_MAP[jobStatus.status] ?? 0;
    if (jobStatus.status === 'failed') return stepIdx <= currentIdx ? 'failed' : 'waiting';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'waiting';
  }

  const currentAR = ASPECT_RATIOS.find(r => r.id === aspectRatio);
  const hasKey = true; // key is in .env, validated server-side

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e2e2f0] p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <Video size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Video Studio
            </h1>
            <p className="text-sm text-[#8888aa]">AI video + voiceover in one click</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT: Input Form ────────────────────────────────────────────── */}
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6 space-y-6">

          {/* Visual Prompt */}
          <div>
            <label className="block text-sm font-medium text-[#8888aa] mb-1.5">
              Visual Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isGenerating}
              rows={4}
              placeholder="Describe the video scene visually..."
              className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-4 py-3 text-sm text-[#e2e2f0] placeholder-[#8888aa] resize-none focus:outline-none focus:border-violet-500 transition disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-[#8888aa]">
              Example: A confident insurance advisor in a modern office, speaking to camera, warm lighting
            </p>
          </div>

          {/* Voiceover Text */}
          <div>
            <label className="block text-sm font-medium text-[#8888aa] mb-1.5">
              Voiceover Script <span className="text-red-400">*</span>
            </label>
            <textarea
              value={voiceoverText}
              onChange={e => setVoiceoverText(e.target.value)}
              disabled={isGenerating}
              rows={5}
              placeholder="Type the narration that will be spoken over the video..."
              className="w-full bg-[#0f0f1a] border border-[#2d2d4e] rounded-xl px-4 py-3 text-sm text-[#e2e2f0] placeholder-[#8888aa] resize-none focus:outline-none focus:border-violet-500 transition disabled:opacity-50"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-[#8888aa]">This text will be spoken as English voiceover</p>
              <span className="text-xs text-[#8888aa]">{voiceoverText.length} chars</span>
            </div>
          </div>

          {/* Platform / Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-[#8888aa] mb-2">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id)}
                  disabled={isGenerating}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition
                    ${aspectRatio === r.id
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'border-[#2d2d4e] text-[#8888aa] hover:border-violet-500/50'
                    } disabled:opacity-50`}
                >
                  <span className="text-lg">{r.icon}</span>
                  <span>{r.label}</span>
                  <span className="text-[10px] opacity-70">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-[#8888aa] mb-2">Duration</label>
            <div className="flex gap-3">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={isGenerating}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition
                    ${duration === d
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'border-[#2d2d4e] text-[#8888aa] hover:border-violet-500/50'
                    } disabled:opacity-50`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-[#8888aa] mb-2">Quality</label>
            <div className="flex gap-2">
              {RESOLUTIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => r.available && setResolution(r.id)}
                  disabled={isGenerating || !r.available}
                  title={!r.available ? 'Coming soon' : ''}
                  className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-xs font-semibold transition
                    ${
                      !r.available
                        ? 'border-[#2d2d4e] text-[#444466] cursor-not-allowed opacity-60'
                        : resolution === r.id
                        ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                        : 'border-[#2d2d4e] text-[#8888aa] hover:border-violet-500/50'
                    } disabled:cursor-not-allowed`}
                >
                  {!r.available
                    ? <FlaskConical size={12} className="text-amber-500/70 mb-0.5" />
                    : null
                  }
                  <span>{r.label}</span>
                  <span className={`text-[9px] font-normal ${
                    !r.available ? 'text-amber-600/70' : 'opacity-60'
                  }`}>{r.sub}</span>
                  {!r.available && (
                    <Lock size={9} className="absolute top-1.5 right-1.5 text-amber-600/60" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Credit-insufficient error — generic panel, no brand mentions */}
          {error && isCreditError(error) && (
            <div className="bg-amber-900/20 border border-amber-600/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                <AlertTriangle size={16} className="shrink-0" />
                Video Generation Limit Reached
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Your current plan doesn't have enough generation capacity for this video.
                Try reducing the duration to <strong>3s</strong> to lower resource usage.
              </p>
              <button
                onClick={() => { setDuration(3); setError(''); }}
                className="w-full py-2 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-600/30 transition"
              >
                Switch to 3s (lower resource usage)
              </button>
            </div>
          )}

          {/* Generic error */}
          {error && !isCreditError(error) && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm flex items-center justify-center gap-2
              hover:from-violet-500 hover:to-fuchsia-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            {isGenerating ? (
              <><Loader size={16} className="animate-spin" /> Generating… (~1–2 minutes)</>
            ) : (
              <><Wand2 size={16} /> Generate Video</>
            )}
          </button>
        </div>

        {/* ── RIGHT: Output / Progress ────────────────────────────────────── */}
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6 flex flex-col">

          {/* Empty state */}
          {!isGenerating && !videoUrl && !jobStatus && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 border border-violet-500/20 flex items-center justify-center">
                <Film size={36} className="text-violet-400/60" />
              </div>
              <div>
                <p className="text-[#e2e2f0] font-semibold">Your video will appear here</p>
                <p className="text-sm text-[#8888aa] mt-1">Fill in the form and click Generate Video</p>
              </div>
            </div>
          )}

          {/* Progress tracker */}
          {(isGenerating || (jobStatus && jobStatus.status !== 'done')) && !videoUrl && (
            <div className="flex-1 flex flex-col gap-6">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-[#8888aa] mb-1.5">
                  <span>Generating video…</span>
                  <span>{jobStatus?.progress ?? 5}%</span>
                </div>
                <div className="w-full bg-[#0f0f1a] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-1000"
                    style={{ width: `${jobStatus?.progress ?? 5}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step, idx) => {
                  const state = getStepState(idx);
                  return (
                    <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl border transition
                      ${state === 'active' ? 'border-violet-500/40 bg-violet-900/10' : 'border-transparent'}`}>
                      <StepIcon state={state} />
                      <span className={`text-sm ${state === 'done' ? 'text-emerald-400' : state === 'active' ? 'text-white' : 'text-[#8888aa]'}`}>
                        Step {idx + 1}: {step.label}
                      </span>
                      {state === 'active' && (
                        <span className="ml-auto text-xs text-violet-400 animate-pulse">Processing…</span>
                      )}
                      {state === 'done' && (
                        <span className="ml-auto text-xs text-emerald-400">✓ Done</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-center text-[#8888aa] mt-auto">
                ⏱ Estimated time: 60–90 seconds · Do not close this tab
              </p>
            </div>
          )}

          {/* Video player — done */}
          {videoUrl && (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle size={18} /> Video Ready!
                </h3>
                {jobStatus?.error_message && (
                  <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-1 rounded-lg">
                    ⚠ {jobStatus.error_message.includes('voiceover') ? 'Video generated without voiceover' : 'Partial result'}
                  </span>
                )}
              </div>

              <div className="rounded-xl overflow-hidden bg-black border border-[#2d2d4e] flex items-center justify-center"
                style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9', maxHeight: '400px' }}>
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <a
                  href={videoUrl}
                  download={`ai-video-${jobId}.mp4`}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition"
                >
                  <Download size={15} /> Download MP4
                </a>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-[#0f0f1a] border border-[#2d2d4e] text-[#8888aa] text-sm font-medium flex items-center justify-center gap-2 hover:border-violet-500/50 hover:text-[#e2e2f0] transition"
                >
                  <RefreshCw size={15} /> Generate Another
                </button>
              </div>

              <div className="text-xs text-[#8888aa] flex gap-4">
                <span>📐 {currentAR?.label}</span>
                <span>⏱ {duration}s</span>
                <span>🎙 Auto voiceover</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Video History ──────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Film size={18} className="text-violet-400" /> Recent Videos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {history.map(job => (
              <div key={job.job_id}
                className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl p-4 hover:border-violet-500/30 transition">
                {/* Thumbnail placeholder */}
                <div className="w-full aspect-video bg-[#0f0f1a] rounded-lg mb-3 flex items-center justify-center border border-[#2d2d4e]">
                  <Film size={28} className="text-[#2d2d4e]" />
                </div>
                <p className="text-xs text-[#e2e2f0] font-medium leading-relaxed mb-2 line-clamp-2">
                  {job.prompt}
                </p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={job.status} />
                  {job.status === 'done' && job.video_url && (
                    <a
                      href={job.video_url}
                      download
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      <Download size={12} /> Download
                    </a>
                  )}
                </div>
                {job.created_at && (
                  <p className="text-[10px] text-[#8888aa] mt-2">
                    {new Date(job.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
