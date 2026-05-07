import React from 'react';

//  Status Badge 
const BADGE_MAP = {
  pending:           ['badge-yellow', 'Kutilmoqda'],
  hr_approved:       ['badge-blue',   'HR tasdiqladi'],
  hr_rejected:       ['badge-red',    'HR rad etdi'],
  sup_approved:      ['badge-cyan',   'Rahbar tasdiqladi'],
  sup_rejected:      ['badge-red',    'Rahbar rad etdi'],
  kafedra_approved:  ['badge-cyan',   'Kafedra tasdiqladi'],
  kafedra_rejected:  ['badge-red',    'Kafedra rad etdi'],
  dekan_approved:    ['badge-cyan',   'Dekanat tasdiqladi'],
  completed:         ['badge-green',  'Yakunlandi'],
  active:            ['badge-green',  'Faol'],
  done:              ['badge-blue',   'Bajarildi'],
  approved:          ['badge-green',  'Tasdiqlandi'],
  rejected:          ['badge-red',    'Rad etildi'],
  submitted:         ['badge-blue',   'Yuborildi'],
  draft:             ['badge-gray',   'Qoralama'],
  open:              ['badge-green',  'Ochiq'],
  closed:            ['badge-gray',   'Yopiq'],
  present:           ['badge-green',  'Keldi'],
  absent:            ['badge-red',    'Kelmadi'],
  late:              ['badge-yellow', 'Kechikdi'],
  sent:              ['badge-green',  'Yuborildi'],
  company_accepted:  ['badge-green',  'Korxona qabul qildi'],
};

export function Badge({ status }) {
  const [cls, label] = BADGE_MAP[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

//  Modal 
export function Modal({ open = true, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

//  Stat Card 
export function StatCard({ icon: Icon, value, label, color = 'blue' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        {typeof Icon === 'string'
          ? <span style={{ fontSize: 18 }}>{Icon}</span>
          : Icon && <Icon size={18} />}
      </div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  );
}

//  Empty State 
export function Empty({ icon, text = "Ma'lumot topilmadi" }) {
  return (
    <div className="empty">
      <svg className="empty-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M12 20h16M12 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 14h32" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{text}</p>
    </div>
  );
}

//  Loading 
export function Loading({ text = 'Yuklanmoqda...' }) {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <span>{text}</span>
    </div>
  );
}

//  Progress Bar 
export function Progress({ value, max = 100 }) {
  const pct = Math.min(100, Math.round(value / max * 100));
  const color = pct >= 75 ? 'green' : '';
  return (
    <div>
      <div className="flex-between text-sm text-muted" style={{ marginBottom: 4 }}>
        <span></span><span>{pct}%</span>
      </div>
      <div className="progress">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

//  Info Row 
export function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className="info-row-value">{value || '—'}</span>
    </div>
  );
}

//  Page Header 
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

//  Tabs 
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <div key={t.key} className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </div>
      ))}
    </div>
  );
}

//  Person Card — nomga bosganda kontakt ma'lumotlari 
const ROLE_LABELS = {
  student: 'Talaba', company_hr: 'Korxona HR', mentor: 'Mentor',
  supervisor: 'Amaliyot Rahbar', kafedra: 'Kafedra', dekanat: 'Dekanat', admin: 'Admin',
};

export function PersonLink({ userId, name, role, extraInfo }) {
  const [open, setOpen] = React.useState(false);
  const [info, setInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (!userId) return;
    setOpen(true);
    if (info) return;
    setLoading(true);
    try {
      const { authAPI } = await import('../../api');
      const res = await authAPI.getUser(userId);
      setInfo(res.data);
    } catch { setInfo(null); }
    finally { setLoading(false); }
  };

  if (!userId) return <span>{name || '—'}</span>;

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'var(--primary)', cursor: 'pointer',
          fontWeight: 600, fontSize: 'inherit',
          textDecoration: 'underline dotted',
          textUnderlineOffset: 3,
        }}
      >
        {name}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ROLE_LABELS[role] || role || 'Ma\'lumot'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : info ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, flexShrink: 0
                    }}>
                      {(info.full_name || info.email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{info.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ROLE_LABELS[info.role] || info.role}</div>
                    </div>
                  </div>
                  {/* Kontakt */}
                  {[
                    [' Email', info.email],
                    [' Telefon', info.phone || '—'],
                    info.supervisor_profile && [' Kafedra', info.supervisor_profile.department],
                    info.supervisor_profile && [' Lavozim', info.supervisor_profile.position],
                    info.kafedra_profile   && [' Kafedra', info.kafedra_profile.department],
                    info.kafedra_profile   && [' Lavozim', info.kafedra_profile.position],
                    info.student_profile   && [' Guruh', info.student_profile.group],
                    info.student_profile   && [' Yunalish', info.student_profile.direction],
                    extraInfo && ['ℹ', extraInfo],
                  ].filter(Boolean).map(([label, val]) => val && (
                    <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)', minWidth: 100 }}>{label}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Ma'lumot topilmadi</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

//  ExcelImport — universal Excel yuklash panel 
export function ExcelImportPanel({ onImport, templateCols, title = 'Excel import' }) {
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [err, setErr] = React.useState('');

  const run = async () => {
    if (!file) return;
    setLoading(true); setErr(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await onImport(fd);
      setResult(res.data);
    } catch (e) {
      const d = e.response?.data;
      setErr(d?.error || d?.detail || JSON.stringify(d) || 'Xatolik yuz berdi');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      {templateCols && (
        <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
          <strong>Excel ustunlar tartibi:</strong>{' '}
          {templateCols.map((c, i) => <span key={i} style={{ margin: '0 4px' }}>{String.fromCharCode(65+i)}: <strong>{c}</strong></span>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" accept=".xlsx,.xls"
          onChange={e => { setFile(e.target.files[0]); setResult(null); setErr(''); }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn btn-primary" onClick={run} disabled={!file || loading}>
          {loading ? ' Yuklanmoqda...' : ' Import qilish'}
        </button>
      </div>
      {err && <div className="alert alert-error mt-3">{err}</div>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <div className={`alert ${result.created_count > 0 ? 'alert-success' : 'alert-error'}`} style={{ fontSize: 13 }}>
             <strong>{result.created_count}</strong> ta muvaffaqiyatli yaratildi
            {result.error_count > 0 && (
              <span style={{ color: '#d97706', marginLeft: 8 }}>
                ·  <strong>{result.error_count}</strong> ta xato
              </span>
            )}
          </div>

          {result.credentials?.length > 0 && (
            <details style={{ marginTop: 8 }} open>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                 Yaratilgan talabalar va parollar ({result.credentials.length} ta)
              </summary>
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Ism</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Email</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Parol</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.credentials.map((c, i) => (
                      <tr key={i} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>{c.full_name}</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>{c.email}</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{c.password}</code>
                        </td>
                        <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb', color: '#6b7280' }}>{c.student_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {result.errors?.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#d97706', marginBottom: 6 }}>
                 Xatolar ({result.errors.length} ta)
              </summary>
              <div style={{ marginTop: 6 }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '4px 8px', marginBottom: 3,
                    background: '#fef3c7', borderLeft: '3px solid #f59e0b', borderRadius: '0 4px 4px 0'
                  }}>
                    <strong>{e.row}-qator:</strong> {e.error}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

//  Baho ko'rsatish 
const GRADE_LABEL = { '5': "A'lo", '4': 'Yaxshi', '3': 'Qoniqarli', '2': 'Qoniqarsiz' };
const GRADE_COLOR = { '5': '#10b981', '4': '#3b82f6', '3': '#f59e0b', '2': '#ef4444' };

export function GradeBadge({ score, letter }) {
  if (!score && !letter) return <span style={{ color: '#9ca3af' }}>—</span>;
  const ltr   = letter || (score >= 90 ? '5' : score >= 70 ? '4' : score >= 60 ? '3' : '2');
  const label = GRADE_LABEL[ltr] || ltr;
  const color = GRADE_COLOR[ltr] || '#6b7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontWeight: 700, color,
    }}>
      {score && <span style={{ fontSize: 15 }}>{score}</span>}
      <span style={{
        background: color + '1a', color,
        borderRadius: 6, padding: '2px 8px', fontSize: 13,
      }}>
        {ltr} — {label}
      </span>
    </span>
  );
}

//  useApi hook 
export function useApi(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    if (!fn) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, deps);

  React.useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

//  Normalize array (handles pagination) 
export function toArr(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}
