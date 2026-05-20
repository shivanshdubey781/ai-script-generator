import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.08) 0%, transparent 60%)
        `
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">AI Script Generator</h1>
            <p className="text-xs text-text-muted">Create. Grow. Succeed.</p>
          </div>
        </div>

        <div className="card shadow-2xl shadow-black/50 border-border-dark">
          <Outlet />
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Smart • Secure • Fast
        </p>
      </div>
    </div>
  );
}
