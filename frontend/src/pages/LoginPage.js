import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Lock, Eye, EyeOff, GraduationCap, Building2,
  Users, BookOpen, BarChart3, ChevronRight, CheckCircle
} from 'lucide-react';

const REDIRECTS = {
  student:    '/student/dashboard',
  company_hr: '/company/dashboard',
  mentor:     '/mentor/dashboard',
  supervisor: '/supervisor/dashboard',
  kafedra:    '/kafedra/dashboard',
  dekanat:    '/dekanat/dashboard',
  admin:      '/admin/dashboard',
};

const STATS = [
  { icon: Building2, value: '200+',  label: 'Hamkor korxona' },
  { icon: Users,     value: '5000+', label: 'Talaba' },
  { icon: BookOpen,  value: '98%',   label: 'Muvaffaqiyat' },
  { icon: BarChart3, value: '4.8',   label: 'Reyting' },
];

const FEATURES = [
  'Onlayn kundalik yuritish tizimi',
  "Mentor va rahbar bilan bog'lanish",
  'Real vaqt kuzatuv va hisobotlar',
  'Elektron hujjat aylanishi',
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email,      setEmail]      = useState('');
  const [pass,       setPass]       = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [shake,      setShake]      = useState(false);
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 900;
  const emailRef = useRef(null);
  const passRef  = useRef(null);

  useEffect(() => {
    // Focus email on mount
    if (emailRef.current) emailRef.current.focus();
  }, []);

  if (user) return <Navigate to={REDIRECTS[user.role] || '/'} replace />;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) return;
    setLoading(true);
    setError('');
    try {
      const u = await login(email.trim(), pass);
      navigate(REDIRECTS[u.role] || '/');
    } catch (err) {
      const msg = err?.response?.data?.detail || "Email yoki parol noto'g'ri. Qaytadan urinib ko'ring.";
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPass('');
    } finally {
      setLoading(false);
    }
  };

  const focusBorder = ref => {
    if (ref.current && ref.current.parentNode)
      ref.current.parentNode.style.borderColor = '#2563eb';
  };
  const blurBorder = ref => {
    if (ref.current && ref.current.parentNode)
      ref.current.parentNode.style.borderColor = '#e2e8f0';
  };

  return (
    <div className="lp-root">
      {/* ── LEFT: Hero ── */}
      {!isNarrow && (
        <div className="lp-hero">
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
          <div className="lp-blob lp-blob-3" />

          <div className="lp-hero-content">
            {/* Brand */}
            <div className="lp-brand">
              <div className="lp-brand-icon">
                <GraduationCap size={26} color="#fff" />
              </div>
              <div>
                <div className="lp-brand-name">Amaliyot Tizimi</div>
                <div className="lp-brand-sub">O'zbekiston talabalariga amaliyot</div>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="lp-tagline-h">
              Kelajagingizni bugun<br />shakllantiring
            </h2>
            <p className="lp-tagline-p">
              Eng yaxshi korxonalarda amaliyot o'ting, professional
              tajriba orttiring va karyerangizni quring.
            </p>

            {/* Features */}
            <div className="lp-features">
              {FEATURES.map((f, i) => (
                <div key={i} className="lp-feature-item">
                  <CheckCircle size={14} color="#86efac" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="lp-stats-grid">
              {STATS.map((st, i) => (
                <div key={i} className="lp-stat-card">
                  <st.icon size={16} color="rgba(255,255,255,.7)" />
                  <div className="lp-stat-val">{st.value}</div>
                  <div className="lp-stat-lbl">{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RIGHT: Form ── */}
      <div className={isNarrow ? 'lp-form-side lp-form-side--narrow' : 'lp-form-side'}>
        <div className={`lp-form-card${shake ? ' lp-shake' : ''}`}>

          {/* Header */}
          <div className="lp-form-header">
            <div className="lp-form-logo">
              <GraduationCap size={22} color="#2563eb" />
            </div>
            <h2 className="lp-form-title">Xush kelibsiz!</h2>
            <p className="lp-form-sub">Shaxsiy hisobingizga kiring</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="lp-error">⚠ {error}</div>
            )}

            {/* Email input */}
            <div className="lp-input-wrap">
              <Mail size={15} color="#94a3b8" className="lp-input-icon" />
              <input
                ref={emailRef}
                type="email"
                placeholder="Email manzilingiz"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => focusBorder(emailRef)}
                onBlur={() => blurBorder(emailRef)}
                required
                autoComplete="email"
                className="lp-input"
              />
            </div>

            {/* Password input */}
            <div className="lp-input-wrap">
              <Lock size={15} color="#94a3b8" className="lp-input-icon" />
              <input
                ref={passRef}
                type={showPass ? 'text' : 'password'}
                placeholder="Parolingiz"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onFocus={() => focusBorder(passRef)}
                onBlur={() => blurBorder(passRef)}
                required
                autoComplete="current-password"
                className="lp-input lp-input--pass"
              />
              <button
                type="button"
                className="lp-eye-btn"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                aria-label={showPass ? 'Yashirish' : 'Ko\'rsatish'}
              >
                {showPass
                  ? <EyeOff size={15} color="#94a3b8" />
                  : <Eye    size={15} color="#94a3b8" />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="lp-submit-btn"
            >
              {loading ? (
                <><span className="lp-spinner" /> Kirilmoqda...</>
              ) : (
                <><span>Kirish</span><ChevronRight size={16} /></>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="lp-register-link">
            Akkountingiz yo'qmi?{' '}
            <Link to="/register" className="lp-register-a">Ro'yxatdan o'tish</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
