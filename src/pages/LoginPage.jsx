// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';


// ─── GAP brand panel ──────────────────────────────────────────────────────────
function GapBrandPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
      style={{
        // BASE_URL keeps the path correct when the app is served from a
        // repository sub-path rather than a domain root.
        backgroundImage: `url(${import.meta.env.BASE_URL}gap-portrait.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Dark overlay so text stays readable over the photo */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(175deg, rgba(0,18,60,0.82) 0%, rgba(0,14,45,0.70) 40%, rgba(0,10,30,0.88) 100%)' }}
      />

      {/* Top — GAP logo */}
      <div className="relative px-12 pt-12">
        <GapLogo />
        <p className="text-white/40 text-[11px] mt-3 tracking-widest uppercase font-medium">Gap Inc. Planning Platform</p>
      </div>

      {/* Middle — hero text */}
      <div className="relative px-12">
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.2em] mb-4">InsightsIQ</p>
        <h2 className="text-[40px] font-bold text-white leading-[1.08] tracking-tight">
          Plan smarter.<br />Execute better.
        </h2>
        <p className="text-white/55 mt-5 text-[13px] leading-relaxed max-w-[320px]">
          A unified decision-support platform covering promotional planning,
          price management, and in-season analytics across Gap Inc. brands.
        </p>

        {/* Tool chips — all 3 tools */}
        <div className="flex flex-wrap gap-2 mt-7">
          {[
            { label: 'PEMPAL',       desc: 'Promo planning' },
            { label: 'Krypton',      desc: 'Price mgmt' },
            { label: 'Simple Suite', desc: 'Analytics' },
            { label: 'Insights AI',  desc: 'AI analysis' },
          ].map(f => (
            <span
              key={f.label}
              className="flex items-center gap-1.5 text-[10px] font-medium text-white/65 border border-white/12 px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              {f.label}
              <span className="text-white/30">·</span>
              <span className="text-white/35">{f.desc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom — brand strip */}
      <div className="relative px-12 pb-10">
        <div className="h-px bg-white/12 mb-5" />
        <p className="text-[10px] text-white/25 tracking-wide">
          © {new Date().getFullYear()} Gap Inc. · Built by Tiger Analytics · All rights reserved
        </p>
        <div className="flex items-center gap-2 mt-3">
          {['Athleta', 'Gap', 'Old Navy', 'Banana Republic'].map((b, i) => (
            <span
              key={b}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: i === 0 ? '#5B8DD9' : 'rgba(255,255,255,0.22)',
                backgroundColor: i === 0 ? 'rgba(92,184,204,0.12)' : 'transparent',
                border: i === 0 ? '1px solid rgba(92,184,204,0.28)' : 'none',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GapLogo() {
  return (
    <svg width="90" height="36" viewBox="0 0 90 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* GAP square background */}
      <rect width="90" height="36" rx="3" fill="white"/>
      {/* GAP text */}
      <text x="50%" y="26" textAnchor="middle"
        style={{ fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: 22, fill: '#001A6E', letterSpacing: 3 }}>
        GAP
      </text>
      {/* Small blue square — classic GAP logo detail */}
      <rect x="74" y="4" width="10" height="10" rx="1" fill="#0064D2"/>
    </svg>
  );
}


// ─── Login page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('demo@insightsiq.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error || 'Login failed');
  };

  return (
    <div className="min-h-screen flex bg-white">
      <GapBrandPanel />

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-block mb-3">
              <GapLogo />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">InsightsIQ</h1>
          </div>

          {/* InsightsIQ badge */}
          <div className="flex items-center gap-2 mb-7">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B4F9C, #163F82)' }}>
              <span className="text-white text-sm font-bold">I</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-neutral-800 leading-none">InsightsIQ</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Gap Inc. Planning Platform</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight">Welcome back</h2>
            <p className="text-[12.5px] text-neutral-500 mt-1">Sign in with your Gap Inc. credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 mb-1.5 block tracking-wide uppercase">
                Email Address
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:shadow-glow-primary transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 mb-1.5 block tracking-wide uppercase">
                Password
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:shadow-glow-primary transition-all"
              />
            </div>
            {error && (
              <div className="px-3 py-2 bg-danger-50 border border-danger-500/30 rounded-lg text-[11.5px] text-danger-700 animate-fade-in-down">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
              Sign in to InsightsIQ
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-200">
            <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wide text-center mb-2.5">Demo Accounts</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => { setEmail('demo@insightsiq.com'); setPassword('demo123'); }}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left"
              >
                <span className="text-[11px] text-neutral-600 font-mono">demo@insightsiq.com</span>
                <span className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wide bg-neutral-100 px-1.5 py-0.5 rounded">Planner</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('manager@insightsiq.com'); setPassword('demo123'); }}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left"
              >
                <span className="text-[11px] text-neutral-600 font-mono">manager@insightsiq.com</span>
                <span className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wide bg-neutral-100 px-1.5 py-0.5 rounded">Manager</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-300 text-center mt-3">Password for all demo accounts: demo123</p>
          </div>

        </div>
      </div>
    </div>
  );
}
