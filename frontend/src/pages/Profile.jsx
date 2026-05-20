import { useState, useEffect } from 'react';
import { getMe, updateMe, getMyStats } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  User, Mail, Shield, Calendar, Edit3, Key, Save, X,
  Sparkles, Star, CheckCircle, AlertCircle
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [nameForm, setNameForm] = useState({ full_name: user?.full_name || '' });
  const [passForm, setPassForm] = useState({ current_password: '', password: '', confirmPassword: '' });
  const [nameMsg, setNameMsg] = useState(null);
  const [passMsg, setPassMsg] = useState(null);
  const [nameLoading, setNameLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passErrors, setPassErrors] = useState({});

  useEffect(() => {
    getMyStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleNameSave = async (e) => {
    e.preventDefault();
    if (!nameForm.full_name.trim()) return;
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res = await updateMe({ full_name: nameForm.full_name });
      updateUser(res.data);
      setNameMsg({ type: 'success', text: 'Name updated successfully!' });
    } catch (err) {
      setNameMsg({ type: 'error', text: err.response?.data?.detail || 'Update failed' });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePassSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passForm.current_password) errs.current_password = 'Current password required';
    if (!passForm.password) errs.password = 'New password required';
    else if (passForm.password.length < 8) errs.password = 'Min. 8 characters';
    if (passForm.password !== passForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setPassErrors(errs); return; }
    setPassErrors({});
    setPassLoading(true);
    setPassMsg(null);
    try {
      await updateMe({
        current_password: passForm.current_password,
        password: passForm.password,
      });
      setPassForm({ current_password: '', password: '', confirmPassword: '' });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      setPassMsg({ type: 'error', text: err.response?.data?.detail || 'Password update failed' });
    } finally {
      setPassLoading(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* User info card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent-green
            flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-primary/30 flex-shrink-0">
            {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-text-primary">{user?.full_name}</h2>
              {user?.role === 'admin' && (
                <span className="badge bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Mail size={13} className="text-primary" /> {user?.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Calendar size={13} className="text-primary" /> Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border-dark">
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Scripts Generated</span>
            </div>
            <p className="text-3xl font-bold text-primary">{user?.generation_count || 0}</p>
          </div>
          <div className="bg-accent-amber/5 border border-accent-amber/15 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star size={14} className="text-accent-amber" />
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Favorites Saved</span>
            </div>
            <p className="text-3xl font-bold text-accent-amber">{stats?.favorites_count ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Change name */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Edit3 size={16} className="text-primary" /> Change Display Name
        </h3>

        {nameMsg && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-4 ${
            nameMsg.type === 'success'
              ? 'bg-accent-green/10 border border-accent-green/30 text-accent-green'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}>
            {nameMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {nameMsg.text}
          </div>
        )}

        <form onSubmit={handleNameSave} className="flex gap-3">
          <input
            id="profile-name-input"
            type="text"
            value={nameForm.full_name}
            onChange={(e) => setNameForm({ full_name: e.target.value })}
            placeholder="Your full name"
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={nameLoading}
            className="btn-primary flex items-center gap-2"
            id="save-name-btn"
          >
            {nameLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            Save
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Key size={16} className="text-primary" /> Change Password
        </h3>

        {passMsg && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-4 ${
            passMsg.type === 'success'
              ? 'bg-accent-green/10 border border-accent-green/30 text-accent-green'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}>
            {passMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {passMsg.text}
          </div>
        )}

        <form onSubmit={handlePassSave} className="space-y-4">
          {[
            { id: 'current-pass', field: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
            { id: 'new-pass', field: 'password', label: 'New Password', placeholder: 'Min. 8 characters' },
            { id: 'confirm-pass', field: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Repeat new password' },
          ].map(({ id, field, label, placeholder }) => (
            <div key={field}>
              <label htmlFor={id} className="label">{label}</label>
              <input
                id={id}
                type="password"
                value={passForm[field]}
                onChange={(e) => {
                  setPassForm({ ...passForm, [field]: e.target.value });
                  if (passErrors[field]) setPassErrors({ ...passErrors, [field]: '' });
                }}
                placeholder={placeholder}
                className={`input-field ${passErrors[field] ? 'border-red-500/60' : ''}`}
                autoComplete="new-password"
              />
              {passErrors[field] && <p className="text-red-400 text-xs mt-1">{passErrors[field]}</p>}
            </div>
          ))}

          <button
            type="submit"
            disabled={passLoading}
            className="btn-primary flex items-center gap-2"
            id="save-password-btn"
          >
            {passLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key size={15} />}
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
