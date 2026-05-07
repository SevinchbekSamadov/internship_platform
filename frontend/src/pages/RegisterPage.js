import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

const REDIRECTS = {
  student:    '/student/dashboard',
  company_hr: '/company/dashboard',
};

const ROLES = [
  {
    value: 'student',
    icon: '',
    label: 'Talaba',
    desc: "Amaliyot joyiga ariza topshiraman va amaliyot o'tayman",
    color: '#1a56db',
    bg: '#eff6ff',
  },
  {
    value: 'company_hr',
    icon: '',
    label: 'Korxona HR',
    desc: "Korxonamda talabalar uchun amaliyot joyi ta'minlayman",
    color: '#047857',
    bg: '#ecfdf5',
  },
];

const FACULTIES    = ['Raqamli texnologiyalar', 'Iqtisodiyot', 'Moliya', 'Boshqaruv', 'Huquq'];
const DEPARTMENTS  = [
  'Kompyuter injiniringi', "Dasturlash texnologiyalari",
  'Axborot tizimlari va texnologiyalari', "Sun'iy intellekt",
  'Kibersecurity', 'Tarmoq texnologiyalari', 'Matematik modellashtirish',
];
const DIRECTIONS   = [
  'Dasturiy injiniring', 'Web dasturlash', 'Mobil dasturlash',
  'Machine Learning', 'Deep Learning', 'Axborot xavfsizligi',
  'Tarmoq texnologiyalari', 'GIS texnologiyalari',
];
const INDUSTRIES   = [
  'Axborot texnologiyalari', 'Moliya va banking', 'Telekommunikatsiya',
  'Savdo va xizmat', 'Ishlab chiqarish', 'Ta\'lim', 'Sog\'liqni saqlash',
  'Qurilish', 'Transport va logistika', 'Boshqa',
];

export default function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Step 0 = rol tanlash, Step 1 = ma'lumotlar, Step 2 = parol
  const [step,    setStep]    = useState(0);
  const [role,    setRole]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Shaxsiy
  const [first_name,        setFirstName]       = useState('');
  const [last_name,         setLastName]        = useState('');
  const [email,             setEmail]           = useState('');
  const [phone,             setPhone]           = useState('');
  const [password,          setPassword]        = useState('');
  const [confirm_password,  setConfirmPassword] = useState('');
  const [showPass,          setShowPass]        = useState(false);

  // Talaba profili
  const [student_id,  setStudentId]  = useState('');
  const [faculty,     setFaculty]    = useState('');
  const [department,  setDepartment] = useState('');
  const [direction,   setDirection]  = useState('');
  const [course,      setCourse]     = useState('3');
  const [group,       setGroup]      = useState('');

  // Korxona
  const [company_name,     setCompanyName]     = useState('');
  const [company_inn,      setCompanyInn]      = useState('');
  const [company_industry, setCompanyIndustry] = useState('');
  const [company_city,     setCompanyCity]     = useState('');
  const [company_address,  setCompanyAddress]  = useState('');
  const [company_phone,    setCompanyPhone]    = useState('');

  if (user) return <Navigate to={REDIRECTS[user.role] || '/'} replace />;

  //  Validatsiya 
  const validateStep1 = () => {
    if (!first_name.trim()) return 'Ism majburiy';
    if (!last_name.trim())  return 'Familiya majburiy';
    if (!email.trim())      return 'Email majburiy';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Email noto\'g\'ri formatda';
    if (role === 'student') {
      if (!faculty)    return 'Fakultet tanlang';
      if (!department) return 'Kafedra tanlang';
      if (!direction)  return 'Yo\'nalish tanlang';
      if (!group.trim()) return 'Guruh majburiy';
    }
    if (role === 'company_hr') {
      if (!company_name.trim()) return 'Korxona nomi majburiy';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!password || password.length < 8) return 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak';
    if (password !== confirm_password)     return 'Parollar mos emas';
    return null;
  };

  //  Submit 
  const handleSubmit = async e => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true); setError('');

    const payload = {
      email, username: email, first_name, last_name, role, phone, password,
    };

    if (role === 'student') {
      payload.student_profile = { student_id, faculty, department, direction, course: parseInt(course), group };
    }
    if (role === 'company_hr') {
      payload.company_name     = company_name;
      payload.company_inn      = company_inn;
      payload.company_industry = company_industry;
      payload.company_city     = company_city;
      payload.company_address  = company_address;
      payload.company_phone    = company_phone || phone;
    }

    try {
      await authAPI.register(payload);
      const u = await login(email, password);
      navigate(REDIRECTS[u.role] || '/');
    } catch (e) {
      const data = e.response?.data;
      if (data) {
        const msgs = Object.values(data).flat();
        setError(msgs[0] || "Ro'yxatdan o'tishda xatolik");
      } else {
        setError('Xatolik yuz berdi');
      }
    } finally { setLoading(false); }
  };

  const goNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(''); setStep(2);
  };

  //  UI 
  const selectedRole = ROLES.find(r => r.value === role);

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: step === 0 ? 520 : 500 }}>

        {/* Logo */}
        <div className="login-logo">
          <div className="icon"></div>
          <h1>Ro'yxatdan o'tish</h1>
          <p>
            {step === 0 && 'Rolingizni tanlang'}
            {step === 1 && selectedRole && `${selectedRole.icon} ${selectedRole.label} sifatida ro'yxatdan o'ting`}
            {step === 2 && 'Parol o\'rnating'}
          </p>
        </div>

        {/* Progress bar */}
        {step > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 4,
                background: s <= step ? (selectedRole?.color || 'var(--primary)') : '#e5e7eb',
                transition: 'background .3s',
              }} />
            ))}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16, fontSize: 13 }}>{error}</div>
        )}

        {/*  STEP 0: Rol tanlash  */}
        {step === 0 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${role === r.value ? r.color : '#e5e7eb'}`,
                    background: role === r.value ? r.bg : '#fff',
                    textAlign: 'left', transition: 'all .2s',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{r.desc}</div>
                  </div>
                  {role === r.value && (
                    <span style={{ marginLeft: 'auto', color: r.color, fontSize: 20 }}></span>
                  )}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
              onClick={() => { if (!role) { setError('Rol tanlang'); return; } setError(''); setStep(1); }}
            >
              Davom etish 
            </button>
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
              Akkountingiz bormi?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Kirish</Link>
            </div>
          </div>
        )}

        {/*  STEP 1: Ma'lumotlar  */}
        {step === 1 && (
          <div>
            {/* Shaxsiy ma'lumotlar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span></span> Shaxsiy ma'lumotlar
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ism *</label>
                  <input className="form-control" placeholder="Alisher"
                    value={first_name} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Familiya *</label>
                  <input className="form-control" placeholder="Karimov"
                    value={last_name} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" placeholder="email@example.uz"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input className="form-control" placeholder="+998 90 123 45 67"
                  value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            {/*  Talaba profili  */}
            {role === 'student' && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span></span> Talaba ma'lumotlari
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Talaba ID</label>
                    <input className="form-control" placeholder="TDIU-2024-001"
                      value={student_id} onChange={e => setStudentId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Guruh *</label>
                    <input className="form-control" placeholder="KI-231"
                      value={group} onChange={e => setGroup(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Fakultet *</label>
                  <select className="form-control" value={faculty} onChange={e => setFaculty(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kafedra *</label>
                  <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Yo'nalish *</label>
                  <select className="form-control" value={direction} onChange={e => setDirection(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kurs</label>
                  <select className="form-control" value={course} onChange={e => setCourse(e.target.value)}>
                    {[1,2,3,4].map(c => <option key={c} value={c}>{c}-kurs</option>)}
                  </select>
                </div>
              </div>
            )}

            {/*  Korxona HR profili  */}
            {role === 'company_hr' && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span></span> Korxona ma'lumotlari
                </div>
                <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
                  ℹ Ro'yxatdan o'tgandan so'ng korxona admin tomonidan tasdiqlanadi.
                  Tasdiqlangach, vakansiya e'lon qilish va talabalar bilan ishlash mumkin bo'ladi.
                </div>
                <div className="form-group">
                  <label className="form-label">Korxona nomi *</label>
                  <input className="form-control" placeholder="TechSolutions Uzbekistan"
                    value={company_name} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">INN</label>
                    <input className="form-control" placeholder="123456789"
                      value={company_inn} onChange={e => setCompanyInn(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Shahar</label>
                    <input className="form-control" placeholder="Toshkent"
                      value={company_city} onChange={e => setCompanyCity(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Soha</label>
                  <select className="form-control" value={company_industry} onChange={e => setCompanyIndustry(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Manzil</label>
                  <input className="form-control" placeholder="Yunusobod tumani, 1-ko'cha, 5-uy"
                    value={company_address} onChange={e => setCompanyAddress(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Korxona telefoni</label>
                  <input className="form-control" placeholder="+998 71 123 45 67"
                    value={company_phone} onChange={e => setCompanyPhone(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => { setStep(0); setError(''); }}>
                 Orqaga
              </button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '10px' }}
                onClick={goNext}>
                Davom etish 
              </button>
            </div>
          </div>
        )}

        {/*  STEP 2: Parol  */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            {/* Qisqacha xulosa */}
            <div style={{
              background: selectedRole?.bg || '#f9fafb',
              border: `1px solid ${selectedRole?.color || '#e5e7eb'}`,
              borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13,
            }}>
              <div style={{ fontWeight: 600 }}>{selectedRole?.icon} {first_name} {last_name}</div>
              <div style={{ color: '#6b7280', marginTop: 2 }}>{email}</div>
              {role === 'student' && group && (
                <div style={{ color: '#6b7280' }}>Guruh: {group} · {course}-kurs</div>
              )}
              {role === 'company_hr' && company_name && (
                <div style={{ color: '#6b7280' }}>Korxona: {company_name}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Parol *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Kamida 8 ta belgi"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16,
                  }}>
                  {showPass ? '' : ''}
                </button>
              </div>
              {/* Parol kuchi ko'rsatkichi */}
              {password && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: password.length >= i*3
                        ? (password.length >= 12 ? '#10b981' : password.length >= 8 ? '#f59e0b' : '#ef4444')
                        : '#e5e7eb',
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center', marginLeft: 4 }}>
                    {password.length < 8 ? 'Zaif' : password.length < 12 ? "O'rta" : 'Kuchli'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Parolni tasdiqlang *</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="Parolni qayta kiriting"
                value={confirm_password}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  borderColor: confirm_password && confirm_password !== password ? '#ef4444' : undefined,
                }}
              />
              {confirm_password && confirm_password !== password && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Parollar mos emas</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => { setStep(1); setError(''); }}>
                 Orqaga
              </button>
              <button type="submit" className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center', padding: '10px' }}
                disabled={loading || (confirm_password && confirm_password !== password)}>
                {loading
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saqlanmoqda...</>
                  : " Ro'yxatdan o'tish"}
              </button>
            </div>
          </form>
        )}

        {step > 0 && (
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            Akkountingiz bormi?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Kirish</Link>
          </div>
        )}
      </div>
    </div>
  );
}
