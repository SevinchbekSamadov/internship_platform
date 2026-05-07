import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge, StatCard, Loading, Empty, Modal, Progress, PageHeader, Tabs, InfoRow, useApi, toArr, PersonLink, GradeBadge } from '../../components/common';
import { Check, X, Clock, CheckCircle, AlertCircle, Send, Download, BookOpen, FileText, CalendarDays, Upload, Eye, Info, Plus, Briefcase, Award, CalendarCheck, Search, UserCheck, Pencil } from 'lucide-react';
import { companyAPI, appAPI, internAPI, taskAPI, logAPI, attAPI, reportAPI, docAPI, logbookAPI } from '../../api';

//  Dashboard 
export function StudentDashboard() {
  const { user } = useAuth();
  const { data: ints, loading } = useApi(() => internAPI.list());
  const { data: tasks } = useApi(() => taskAPI.list({ status: 'pending' }));
  const { data: attSum } = useApi(() => attAPI.summary({}));

  const internships = toArr(ints);
  const active = internships.find(i => i.status === 'active');
  const pendingTasks = toArr(tasks).slice(0, 5);
  const att = attSum || {};

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title={` Xush kelibsiz, ${user?.full_name?.split(' ')[0] || 'Talaba'}!`}
        subtitle="Bugungi holatingiz"
      />
      <div className="stats-grid">
        <StatCard icon={Briefcase}    value={internships.length}    label="Amaliyotlarim"  color="blue" />
        <StatCard icon={CheckCircle}  value={att.present || 0}       label="Kelgan kunlar"  color="green" />
        <StatCard icon={X}            value={att.absent || 0}        label="Kelmagan kunlar" color="red" />
        <StatCard icon={CalendarCheck} value={`${att.rate || 0}%`}  label="Davomat foizi"  color="cyan" />
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3>Joriy amaliyot</h3>
            <Link to="/student/internship" style={{ fontSize: 12, color: 'var(--primary)' }}>Batafsil </Link>
          </div>
          <div className="card-body">
            {active ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{active.company_name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{active.position}</div>
                <Badge status={active.status} />
                <div style={{ marginTop: 14 }}>
                  <div className="flex-between text-sm text-muted" style={{ marginBottom: 4 }}>
                    <span>Jarayon</span><strong>{active.progress_percent}%</strong>
                  </div>
                  <Progress value={active.progress_percent} />
                </div>
                <div className="flex gap-3 mt-3 text-sm text-muted">
                  <span> {active.start_date}</span>
                  <span> {active.end_date}</span>
                </div>
                {active.mentor_name && (
                  <div className="mt-3 text-sm text-muted">
                     Mentor: <strong>{active.mentor_name}</strong>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}></div>
                <p className="text-muted text-sm" style={{ marginBottom: 14 }}>Faol amaliyot yo'q</p>
                <Link to="/student/vacancies" className="btn btn-primary btn-sm">Vakansiyalar</Link>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Vazifalar</h3>
            <Link to="/student/tasks" style={{ fontSize: 12, color: 'var(--primary)' }}>Hammasi </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {pendingTasks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                 Barcha vazifalar bajarilgan!
              </div>
            ) : pendingTasks.map(t => (
              <div key={t.id} style={{ padding: '11px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                  <div className="text-sm text-muted mt-1"> {t.due_date}</div>
                </div>
                <Badge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><h3>Tez harakatlar</h3></div>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap' }}>
          <Link to="/student/vacancies" className="btn btn-outline"><Search size={13}/> Vakansiyalar</Link>
          <Link to="/student/daily-log" className="btn btn-outline"><BookOpen size={13}/> Kundalik yozish</Link>
          <Link to="/student/attendance" className="btn btn-outline"><CalendarDays size={13}/> Davomat</Link>
          <Link to="/student/report" className="btn btn-outline"><FileText size={13}/> Hisobot</Link>
        </div>
      </div>
    </div>
  );
}

//  Vacancies 
export function StudentVacancies() {
  const { data, loading, refetch } = useApi(() => companyAPI.vacancies({ status: 'open' }));
  const { data: appsData } = useApi(() => appAPI.list());
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(null);
  const [letter, setLetter] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const myApps = toArr(appsData);
  // Talabaning ariza yuborgan vakansiyalari IDlari
  const appliedVacancyIds = new Set(myApps.map(a => a.vacancy));

  const vacancies = toArr(data).filter(v =>
    !search || v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Xato xabarini kelgan formatga qarab aniqlash
  const extractError = (e) => {
    const d = e.response?.data;
    if (!d) return 'Server bilan bog\'lanishda xatolik';
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d[0];
    if (d.detail) return d.detail;
    if (d.error) return d.error;
    if (d.non_field_errors) return d.non_field_errors[0];
    const firstKey = Object.keys(d)[0];
    if (firstKey) {
      const val = d[firstKey];
      return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
    }
    return 'Xatolik yuz berdi';
  };

  const apply = async () => {
    if (!letter.trim()) { setErr('Motivatsiya xati yozing'); return; }
    setSubmitting(true); setErr('');
    try {
      await appAPI.create({ vacancy: applying.id, cover_letter: letter });
      setApplying(null); setLetter('');
      setMsg('Ariza muvaffaqiyatli yuborildi!');
      setTimeout(() => setMsg(''), 4000);
      refetch();
    } catch (e) {
      setErr(extractError(e));
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Vakansiyalar" subtitle="Amaliyot uchun bo'sh joylar" />
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <input className="form-control" placeholder=" Qidirish..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
        </div>
      </div>

      {vacancies.length === 0 ? <Empty text="Vakansiya topilmadi" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vacancies.map(v => (
            <div key={v.id} className="card">
              <div style={{ padding: '16px 18px' }}>
                <div className="flex-between mb-4">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{v.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>{v.company_name}</div>
                    {v.company_has_contract === false && (
                      <span style={{ fontSize: 11, color: '#f59e0b', marginTop: 2, display: 'inline-block' }}>
                        Shartnomasi yo'q — Rozilik xati talab qilinadi
                      </span>
                    )}
                  </div>
                  {appliedVacancyIds.has(v.id) ? (
                    <span className="badge badge-green" style={{ fontSize: 12 }}>
                      <Check size={11}/> Ariza yuborildi
                    </span>
                  ) : (
                    <button className="btn btn-primary" onClick={() => { setApplying(v); setLetter(''); setErr(''); }}>
                      <FileText size={13}/> Ariza yuborish
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted mb-4" style={{ lineHeight: 1.6 }}>
                  {v.description?.slice(0, 180)}{v.description?.length > 180 ? '...' : ''}
                </p>
                <div className="flex gap-4 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
                  <span>{v.duration_weeks} hafta</span>
                  <span>{v.available_slots} bo'sh joy</span>
                  {v.is_paid && v.salary && (
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                      {Number(v.salary).toLocaleString()} so'm/oy
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!applying} onClose={() => setApplying(null)} title={`Ariza — ${applying?.title}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setApplying(null)}>Bekor</button>
          <button className="btn btn-primary" disabled={submitting || !letter.trim()} onClick={apply}>
            {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </>}>
        {applying?.company_has_contract === false && (
          <div className="alert alert-warning mb-3" style={{ fontSize: 12 }}>
            Bu korxona bilan universitetda rasmiy shartnoma yo'q.
            Ariza qabul qilinsa, korxona HR <strong>Rozilik xati</strong> chiqaradi
            va kafedra tekshirib tasdiqlaydi.
          </div>
        )}
        {err && <div className="alert alert-error">{err}</div>}
        <div className="alert alert-info mb-4">
           <strong>{applying?.company_name}</strong> ·  {applying?.duration_weeks} hafta
        </div>
        <div className="form-group">
          <label className="form-label">Motivatsion xat (ixtiyoriy)</label>
          <textarea className="form-control" rows={4}
            placeholder="Nega bu amaliyotni tanlayapsiz? Qanday ko'nikmalaringiz bor?"
            value={letter} onChange={e => setLetter(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

//  Applications 
export function StudentApplications() {
  const { data, loading } = useApi(() => appAPI.list());
  const apps = toArr(data);

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Arizalarim" subtitle="Yuborgan arizalar holati" />
      <div className="card">
        {apps.length === 0 ? <Empty text="Hali ariza yubormagansiz" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Korxona</th><th>Vakansiya</th><th>Sana</th><th>Holat</th><th>Izoh</th></tr>
              </thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.company_name}</strong></td>
                    <td>{a.vacancy_title}</td>
                    <td className="text-sm text-muted">{new Date(a.created_at).toLocaleDateString('uz-UZ')}</td>
                    <td><Badge status={a.status} /></td>
                    <td className="text-sm text-muted">{a.hr_note || a.sup_note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

//  Internship 
export function StudentInternship() {
  const { data, loading } = useApi(() => internAPI.list());
  const internships = toArr(data);
  const active = internships.find(i => i.status === 'active') || internships[0];
  const [tab, setTab] = useState('tasks');
  const { data: tasks } = useApi(active ? () => taskAPI.list({ internship: active.id }) : null, [active?.id]);

  if (loading) return <Loading />;
  if (!active) return (
    <div className="page"><Empty text="Faol amaliyot yo'q. Vakansiyadan ariza yuboring." /></div>
  );

  return (
    <div className="page">
      <PageHeader title="Amaliyotim" subtitle="Joriy amaliyot jarayoni" />

      <div className="card mb-4">
        <div className="card-header"><h3>Ma'lumotlar</h3></div>
        <div className="card-body">
          <div className="grid-2">
            <div>
              <InfoRow label="Korxona" value={active.company_name} />
              <InfoRow label="Lavozim" value={active.position} />
              <InfoRow label="Mentor" value={
                active.mentor
                  ? <PersonLink userId={active.mentor_user_id || active.mentor} name={active.mentor_name} role="mentor" />
                  : <span style={{color:'#f59e0b'}}> Biriktirilmagan</span>
              } />
              <InfoRow label="Amaliyot rahbar" value={
                active.supervisor
                  ? <PersonLink userId={active.supervisor} name={active.supervisor_name} role="supervisor" />
                  : <span style={{color:'#f59e0b'}}> Biriktirilmagan</span>
              } />
            </div>
            <div>
              <InfoRow label="Boshlanish" value={active.start_date} />
              <InfoRow label="Tugash" value={active.end_date} />
              <InfoRow label="Holat" value={<Badge status={active.status} />} />
              {active.final_grade && (
                <InfoRow label="Yakuniy baho" value={<GradeBadge score={active.final_grade} letter={active.final_grade_letter} />} />
              )}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="flex-between text-sm mb-2">
              <span className="text-muted">Jarayon</span>
              <strong>{active.progress_percent}%</strong>
            </div>
            <Progress value={active.progress_percent} />
          </div>
        </div>
      </div>

      <Tabs tabs={[{ key: 'tasks', label: ' Vazifalar' }]} active={tab} onChange={setTab} />

      <div className="card">
        {toArr(tasks).length === 0 ? <Empty text="Hozircha vazifa yo'q" /> : (
          toArr(tasks).map(t => (
            <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{t.title}</div>
                <div className="text-sm text-muted mt-1">{t.description}</div>
                <div className="text-sm text-muted mt-1"> {t.due_date}</div>
              </div>
              <Badge status={t.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

//  Tasks 
export function StudentTasks() {
  const { data, loading, refetch } = useApi(() => taskAPI.list());
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const tasks = toArr(data);

  const markDone = async () => {
    setSubmitting(true);
    try {
      await taskAPI.markDone(selected.id, { note });
      setSelected(null); setNote(''); refetch();
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  const grouped = tasks.reduce((a, t) => { (a[t.status] = a[t.status] || []).push(t); return a; }, {});
  const order = ['pending', 'done', 'approved'];

  return (
    <div className="page">
      <PageHeader title="Vazifalar" subtitle="Barcha vazifalarim" />

      {tasks.length === 0 ? <Empty text="Hozircha vazifa yo'q" /> : (
        order.map(status => {
          const group = grouped[status];
          if (!group?.length) return null;
          const labels = { pending: ' Kutilayotgan', done: ' Bajarildi', approved: ' Tasdiqlandi' };
          return (
            <div key={status} style={{ marginBottom: 20 }}>
              <div className="flex gap-2 mb-3" style={{ alignItems: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>{labels[status]}</h3>
                <span className="chip">{group.length}</span>
              </div>
              {group.map(t => (
                <div key={t.id} className="card mb-3">
                  <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{t.title}</div>
                      <div className="text-sm text-muted">{t.description}</div>
                      <div className="text-sm text-muted mt-2"> Muddat: <strong>{t.due_date}</strong></div>
                      {t.mentor_note && (
                        <div className="alert alert-info mt-3"> {t.mentor_note}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <Badge status={t.status} />
                      {t.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => { setSelected(t); setNote(''); }}>
                           Bajarildi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Vazifani bajarildi deb belgilash"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Bekor</button>
          <button className="btn btn-success" disabled={submitting} onClick={markDone}>
            {submitting ? 'Saqlanmoqda...' : '<Check size={13}/> Tasdiqlash'}
          </button>
        </>}>
        <p style={{ fontSize: 13, marginBottom: 12 }}><strong>{selected?.title}</strong></p>
        <div className="form-group">
          <label className="form-label">Bajarilish izohi (ixtiyoriy)</label>
          <textarea className="form-control" rows={3} value={note}
            placeholder="Nima qildingiz..." onChange={e => setNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

//  Daily Log 
export function StudentDailyLog() {
  const { user } = useAuth();
  const { data: ints } = useApi(() => internAPI.list());
  const { data, loading, refetch } = useApi(() => logAPI.list());
  const { data: lbData, refetch: refetchLb } = useApi(() => logbookAPI.list());
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState(null); // tahrirlanayotgan log
  const [form, setForm] = useState({ description: '', hours_worked: 8, date: new Date().toISOString().split('T')[0] });
  const [editForm, setEditForm] = useState({ description: '', hours_worked: 8 });
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState('');

  const internships = toArr(ints);
  const active = internships.find(i => i.status === 'active') || internships[0];
  const logs = toArr(data);
  const logbooks = toArr(lbData);
  const logbook = logbooks[0] || null;

  const save = async () => {
    if (!active) return;
    setSubmitting(true); setErr('');
    try {
      await logAPI.create({ ...form, internship: active.id });
      setShowForm(false);
      setForm({ description: '', hours_worked: 8, date: new Date().toISOString().split('T')[0] });
      refetch();
    } catch (e) {
      setErr(e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || 'Bu sana uchun kundalik allaqachon mavjud');
    } finally { setSubmitting(false); }
  };

  const openEdit = (log) => {
    setEditLog(log);
    setEditForm({ description: log.description, hours_worked: log.hours_worked });
  };

  const saveEdit = async () => {
    if (!editLog) return;
    setEditSubmitting(true);
    try {
      await logAPI.update(editLog.id, editForm);
      setEditLog(null);
      refetch();
    } catch (e) {
      alert(e.response?.data?.detail || 'Xatolik yuz berdi');
    } finally { setEditSubmitting(false); }
  };

  const generatePdf = async () => {
    if (!active) return;
    setGenerating(true);
    try {
      await logbookAPI.generate({ internship_id: active.id });
      refetchLb();
      alert("PDF muvaffaqiyatli yaratildi! Korxona HR tasdiqlashini kuting.");
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setGenerating(false); }
  };

  const downloadPdf = async (lbId, studentName) => {
    setDownloading(true);
    try {
      const res = await logbookAPI.download(lbId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kundalik_daftar_${studentName || 'talaba'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Yuklab olishda xatolik');
    } finally { setDownloading(false); }
  };

  if (loading) return <Loading />;

  const lbStatusColor = {
    draft: '#9ca3af', pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444'
  };
  const lbStatusLabel = {
    draft: 'Qoralama', pending: 'HR tasdiqlashi kutilmoqda',
    approved: 'Tasdiqlandi', rejected: 'Rad etildi'
  };

  return (
    <div className="page">
      <PageHeader title="Kundalik" subtitle="Kunlik faoliyat hisoboti"
        action={
          <div className="flex gap-2">
            {active && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                + Yangi yozuv
              </button>
            )}
            {logs.length > 0 && active && (
              <button className="btn btn-outline" onClick={generatePdf} disabled={generating}>
                {generating ? ' Yaratilmoqda...' : ' PDF daftar yaratish'}
              </button>
            )}
          </div>
        }
      />

      {/* PDF logbook holati */}
      {logbook && (
        <div className="card mb-4" style={{
          border: `1.5px solid ${lbStatusColor[logbook.status]}`,
          background: logbook.status === 'approved' ? '#f0fdf4' : '#fffbeb'
        }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}> Kundalik daftar (PDF)</span>
              <span style={{ marginLeft: 10, fontSize: 12, color: lbStatusColor[logbook.status], fontWeight: 600 }}>
                 {lbStatusLabel[logbook.status]}
              </span>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {logbook.total_logs} ta kundalik · {logbook.total_hours} soat
              </div>
              {logbook.hr_note && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>HR izohi: {logbook.hr_note}</div>
              )}
            </div>
            <div className="flex gap-2">
              {logbook.status === 'rejected' && (
                <button className="btn btn-primary btn-sm" onClick={generatePdf} disabled={generating}>
                   Qayta yuborish
                </button>
              )}
              {logbook.status === 'approved' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => downloadPdf(logbook.id, user?.full_name)}
                  disabled={downloading}
                >
                  {downloading ? '...' : ' PDF yuklab olish'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Kundalik yozuv</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}></button>
          </div>
          <div className="card-body">
            {err && <div className="alert alert-error">{err}</div>}
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Sana</label>
                <input type="date" className="form-control" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Ishlagan soat</label>
                <input type="number" className="form-control" min={1} max={12} value={form.hours_worked}
                  onChange={e => setForm(p => ({ ...p, hours_worked: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bugun bajargan ishlarim *</label>
              <textarea className="form-control" rows={5} value={form.description}
                placeholder="Nima qildingiz? Qanday vazifalar bajarildi? Nima o'rgandingiz?"
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary" disabled={submitting} onClick={save}>
                {submitting ? 'Saqlanmoqda...' : ' Saqlash'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 ? <Empty text="Hali kundalik yozilmagan" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.map(log => {
            const bothApproved = log.approved_by_mentor && log.approved_by_supervisor;
            const anyApproved  = log.approved_by_mentor || log.approved_by_supervisor;
            return (
              <div key={log.id} className="card">
                <div className="card-header">
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {new Date(log.date).toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {log.is_auto && <span className="text-sm text-muted" style={{ marginLeft: 8 }}>• Avtomatik</span>}
                  </div>
                  <div className="flex gap-2 align-items-center">
                    <span className="text-sm text-muted">{log.hours_worked}h</span>
                    {bothApproved
                      ? <span className="badge badge-green"><Check size={10}/> Tasdiqlandi</span>
                      : anyApproved
                        ? <span className="badge badge-yellow"><Clock size={10}/> Qisman</span>
                        : <span className="badge badge-yellow"><Clock size={10}/> Kutilmoqda</span>}
                    {!log.approved_by_mentor && !log.approved_by_supervisor && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(log)}
                        style={{ padding: '2px 8px' }}
                        title="Tahrirlash"
                      >
                        <Pencil size={12}/>
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>{log.description}</p>
                  <div style={{
                    display: 'flex', gap: 20, marginTop: 10,
                    padding: '8px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 12
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: log.approved_by_mentor ? '#16a34a' : '#9ca3af', fontWeight: 600, display:'flex', alignItems:'center', gap:4 }}>
                        {log.approved_by_mentor ? <Check size={11}/> : <Clock size={11}/>} Mentor
                      </span>
                      {log.mentor_comment && (
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{log.mentor_comment}</span>
                      )}
                    </div>
                    <span style={{ color: '#e5e7eb', alignSelf: 'center' }}>|</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: log.approved_by_supervisor ? '#16a34a' : '#9ca3af', fontWeight: 600, display:'flex', alignItems:'center', gap:4 }}>
                        {log.approved_by_supervisor ? <Check size={11}/> : <Clock size={11}/>} Amaliyot Rahbar
                      </span>
                      {log.supervisor_comment && (
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{log.supervisor_comment}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kundalik tahrirlash modali */}
      {editLog && (
        <Modal
          open={true}
          title={`Kundalikni tahrirlash — ${editLog.date}`}
          onClose={() => setEditLog(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditLog(null)}>Bekor</button>
            <button
              className="btn btn-primary"
              onClick={saveEdit}
              disabled={editSubmitting || !editForm.description}
            >
              <Check size={13}/> {editSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Ishlagan soat</label>
            <input
              type="number" className="form-control" min={1} max={12}
              value={editForm.hours_worked}
              onChange={e => setEditForm(p => ({ ...p, hours_worked: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bajarilgan ishlar *</label>
            <textarea
              className="form-control" rows={6}
              value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

//  Attendance
export function StudentAttendance() {
  const { data: ints } = useApi(() => internAPI.list());
  const { data, loading, refetch } = useApi(() => attAPI.list());
  const { data: sum, refetch: refetchSum } = useApi(() => attAPI.summary({}));
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);

  const active = toArr(ints).find(i => i.status === 'active');
  const records = toArr(data);
  const today = new Date().toISOString().split('T')[0];
  const todayRec = records.find(r => r.date === today);

  const checkIn = async () => {
    setChecking(true);
    try {
      const res = await attAPI.checkin({ internship_id: active?.id });
      setMsg(` Check-in: ${res.data.time}`);
      refetch(); refetchSum();
    } finally { setChecking(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Davomat" subtitle="Kunlik yo'qlama" />

      <div className="stats-grid">
        <StatCard icon={CalendarDays} value={sum?.total || 0}   label="Jami kunlar" color="blue"  />
        <StatCard icon={CheckCircle}  value={sum?.present || 0} label="Kelgan"      color="green" />
        <StatCard icon={AlertCircle}  value={sum?.absent || 0}  label="Kelmagan"    color="red"   />
        <StatCard icon="" value={`${sum?.rate || 0}%`} label="Davomat foizi" color="cyan" />
      </div>

      {active && (
        <div className="card mb-4">
          <div className="card-header"><h3> Bugungi yo'qlama</h3></div>
          <div className="card-body">
            {msg && <div className="alert alert-success mb-3">{msg}</div>}
            {todayRec ? (
              <div className="flex gap-4 text-sm" style={{ flexWrap: 'wrap' }}>
                <span> {todayRec.date}</span>
                <Badge status={todayRec.status} />
                {todayRec.check_in && <span> Kirish: <strong>{todayRec.check_in}</strong></span>}
                {todayRec.check_out && <span> Chiqish: <strong>{todayRec.check_out}</strong></span>}
              </div>
            ) : (
              <p className="text-sm text-muted mb-3">Bugun hali belgilanmagan</p>
            )}
            <div className="flex gap-3 mt-3">
              <button className="btn btn-success" onClick={checkIn}
                disabled={checking || !!todayRec?.check_in}>
                 Check-in (Keldim)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>Davomat tarixi</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Sana</th><th>Holat</th><th>Kirish</th><th>Chiqish</th><th>Izoh</th></tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Ma'lumot yo'q</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.date}</td>
                  <td><Badge status={r.status} /></td>
                  <td className="text-sm">{r.check_in || '—'}</td>
                  <td className="text-sm">{r.check_out || '—'}</td>
                  <td className="text-sm text-muted">{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//  Documents (Yo'llanma) 
export function StudentDocuments() {
  const { data, loading } = useApi(() => docAPI.list());
  const [qrModal, setQrModal] = useState(null);
  const docs = toArr(data);
  const mediaUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8000${path}`;

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Yo'llanmam" subtitle="Dekanat tomonidan berilgan yo'llanma" />
      {docs.length === 0 ? (
        <Empty text="Hozircha yo'llanma yo'q. Ariza tasdiqlangandan so'ng dekanat yo'llanma yaratadi." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {docs.map(d => (
            <div key={d.id} className="card">
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  {d.qr_code && (
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <img
                        src={mediaUrl(d.qr_code)}
                        alt="QR kod"
                        onClick={() => setQrModal(d)}
                        style={{ width: 110, height: 110, borderRadius: 10, border: '2px solid #e5e7eb', cursor: 'pointer', display: 'block' }}
                        title="Kattalashtirish"
                      />
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, maxWidth: 110 }}>
                        Skaner qiling
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="flex-between mb-3">
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{d.company_name}</div>
                      <Badge status={d.status} />
                    </div>
                    {d.internship_data && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                        <div className="text-sm"> <strong>Lavozim:</strong> {d.internship_data.position}</div>
                        <div className="text-sm"> <strong>Sana:</strong> {d.internship_data.start_date} — {d.internship_data.end_date}</div>
                        {d.internship_data.mentor_name && (
                          <div className="text-sm"> <strong>Mentor:</strong> {d.internship_data.mentor_name}</div>
                        )}
                        {d.internship_data.supervisor_name && (
                          <div className="text-sm"> <strong>Amaliyot rahbar:</strong> {d.internship_data.supervisor_name}</div>
                        )}
                      </div>
                    )}
                    {d.sent_at && (
                      <div className="text-sm text-muted"> Korxonaga yuborildi: {new Date(d.sent_at).toLocaleDateString('uz-UZ')}</div>
                    )}
                    {d.accepted_at && (
                      <div className="text-sm" style={{ color: 'var(--success)', marginTop: 4 }}>
                         Korxona qabul qildi: {new Date(d.accepted_at).toLocaleDateString('uz-UZ')}
                      </div>
                    )}
                    {d.qr_code && (
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setQrModal(d)}>
                         QR kodni ko'rish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Yo'llanma QR Kodi">
        {qrModal && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <img
              src={mediaUrl(qrModal.qr_code)}
              alt="QR kod"
              style={{ width: 260, height: 260, margin: '0 auto 20px', display: 'block', border: '2px solid #e5e7eb', borderRadius: 12 }}
            />
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{qrModal.company_name}</div>
            {qrModal.internship_data && (
              <div className="text-sm text-muted mb-3">
                 {qrModal.internship_data.start_date} — {qrModal.internship_data.end_date}
              </div>
            )}
            <Badge status={qrModal.status} />
            <div className="text-sm text-muted mt-3" style={{ fontSize: 12 }}>
              Bu QR kodni skaner qilib yo'llanmaning haqiqiyligini tekshirish mumkin
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

//  Report 
export function StudentReport() {
  const { data: ints } = useApi(() => internAPI.list());
  const { data, loading, refetch } = useApi(() => reportAPI.list());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', internship: '' });
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [editReport, setEditReport] = useState(null);
  const [editRForm, setEditRForm] = useState({ title: '', content: '' });
  const [editRSubmitting, setEditRSubmitting] = useState(false);

  const internships = toArr(ints);
  const reports = toArr(data);

  // Tanlangan amaliyot
  const selectedInternship = internships.find(i => String(i.id) === String(form.internship));
  const daysDiff = selectedInternship
    ? Math.ceil((new Date(selectedInternship.end_date) - new Date(selectedInternship.start_date)) / 86400000) + 1
    : 0;

  // Tanlangan amaliyot uchun mavjud hisobot
  const existingReport = form.internship
    ? reports.find(r => String(r.internship) === String(form.internship))
    : null;

  const save = async () => {
    if (!form.internship || !form.title || !form.content) return;

    // Agar hisobot allaqachon mavjud bo'lsa — tahrirlashga o'tkazamiz
    if (existingReport) {
      setShowForm(false);
      openEditReport(existingReport);
      return;
    }

    setSubmitting(true);
    try {
      await reportAPI.create(form);
      setShowForm(false);
      setForm({ title: '', content: '', internship: '' });
      refetch();
    } catch (e) {
      const msg = e.response?.data?.internship?.[0]
        || e.response?.data?.detail
        || e.response?.data?.non_field_errors?.[0]
        || 'Xatolik yuz berdi';
      alert(msg);
    } finally { setSubmitting(false); }
  };

  const submit = async (id) => {
    await reportAPI.submit(id);
    refetch();
  };

  const openEditReport = (r) => {
    setEditReport(r);
    setEditRForm({ title: r.title, content: r.content });
  };

  const saveEditReport = async () => {
    if (!editReport) return;
    setEditRSubmitting(true);
    try {
      await reportAPI.update(editReport.id, editRForm);
      setEditReport(null);
      refetch();
    } catch (e) {
      alert(e.response?.data?.detail || 'Xatolik');
    } finally { setEditRSubmitting(false); }
  };

  const downloadPdf = async (report) => {
    setDownloading(report.id);
    try {
      const res = await reportAPI.downloadPdf(report.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisobot_${report.student_name || 'talaba'}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('PDF yuklab bo\'lmadi'); }
    finally { setDownloading(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Yakuniy Hisobot"
        subtitle="Amaliyot bo'yicha to'liq hisobot"
        action={
          !showForm && internships.some(i => i.status === 'active' || i.status === 'completed') && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={14}/> Hisobot yozish
            </button>
          )
        }
      />

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Hisobot yozish</h3>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setShowForm(false)}>
              <X size={14}/>
            </button>
          </div>
          <div className="card-body">
            <div className="alert alert-info mb-4" style={{ fontSize: 12 }}>
              Hisobot bir necha bo'limdan iborat bo'lishi mumkin. Har bo'limni yangi qatorda boshlang.
              Sarlavhali bo'limlar uchun "1. Kirish", "2. Asosiy qism" kabi formatlash tavsiya etiladi.
            </div>

            <div className="form-group">
              <label className="form-label">Amaliyot *</label>
              <select className="form-control" value={form.internship}
                onChange={e => setForm(p => ({ ...p, internship: e.target.value }))}>
                <option value="">— Tanlang —</option>
                {internships.filter(i => ['active','completed'].includes(i.status)).map(i => (
                  <option key={i.id} value={i.id}>
                    {i.company_name} — {i.position} ({i.start_date} — {i.end_date})
                  </option>
                ))}
              </select>
            </div>

            {existingReport && (
              <div className="alert alert-warning mb-3" style={{ fontSize: 13 }}>
                Bu amaliyot uchun hisobot allaqachon mavjud (<Badge status={existingReport.status} />).
                Saqlash bosilganda mavjud hisobotni tahrirlash oynasi ochiladi.
              </div>
            )}

            {selectedInternship && (
              <div className="card mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '10px 14px', display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
                  <span><strong>Korxona:</strong> {selectedInternship.company_name}</span>
                  <span><strong>Muddat:</strong> {selectedInternship.start_date} — {selectedInternship.end_date}</span>
                  <span><strong>Jami kunlar:</strong> {daysDiff} kun</span>
                  <span><strong>Holat:</strong> {selectedInternship.status === 'active' ? 'Faol' : 'Yakunlangan'}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Hisobot sarlavhasi *</label>
              <input className="form-control"
                placeholder="Masalan: Ishlab chiqarish amaliyoti hisoboti — IT Park Uzbekistan"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">
                Hisobot matni *
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                  ({form.content.length} belgi · taxminan {Math.ceil(form.content.length / 2000)} bet)
                </span>
              </label>
              <textarea
                className="form-control"
                rows={16}
                style={{ lineHeight: 1.7 }}
                value={form.content}
                placeholder={
                  `1. Kirish\n` +
                  `Amaliyot maqsadi va vazifalari...\n\n` +
                  `2. Korxona haqida ma'lumot\n` +
                  `Korxona faoliyati, tuzilmasi...\n\n` +
                  `3. Bajarilgan ishlar\n` +
                  `Amaliyot davomida bajarilgan vazifalar...\n\n` +
                  `4. O'rganilgan texnologiyalar\n` +
                  `...\n\n` +
                  `5. Xulosa\n` +
                  `Amaliyotdan olingan xulosalar va tavsiyalar...`
                }
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="btn btn-primary"
                disabled={submitting || !form.internship || !form.title || !form.content}
                onClick={save}
              >
                <Check size={13}/> {submitting ? 'Saqlanmoqda...' : existingReport ? 'Mavjudni tahrirlash' : 'Saqlash'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <Empty text="Hali hisobot yozilmagan" />
      ) : (
        reports.map(r => (
          <div key={r.id} className="card mb-4">
            <div className="card-header">
              <div>
                <h3>{r.title}</h3>
                <span className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString('uz-UZ')}</span>
              </div>
              <div className="flex gap-2 align-items-center">
                <Badge status={r.status} />
                {r.status === 'draft' && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEditReport(r)}
                      title="Tahrirlash"
                    >
                      <Pencil size={13}/> Tahrirlash
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => submit(r.id)}>
                      <Send size={13}/> Yuborish
                    </button>
                  </>
                )}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => downloadPdf(r)}
                  disabled={downloading === r.id}
                  title="PDF yuklab olish"
                >
                  <Download size={13}/> {downloading === r.id ? '...' : 'PDF'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)', whiteSpace: 'pre-line' }}>
                {r.content?.slice(0, 500)}{r.content?.length > 500 ? '...' : ''}
              </p>
              {r.content?.length > 500 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  (Umumiy hajm: {r.content.length} belgi · taxminan {Math.ceil(r.content.length / 2000)} bet)
                </div>
              )}
              {r.grade && (
                <div className="alert alert-success mt-3" style={{ fontSize: 13 }}>
                  <strong>Baho: {r.grade}</strong>
                  {r.reviewer_comment && ` — ${r.reviewer_comment}`}
                </div>
              )}
              {r.kafedra_approved && (
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12}/> Kafedra tasdiqladi
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Hisobot tahrirlash modali */}
      {editReport && (
        <Modal
          open={true}
          title="Hisobotni tahrirlash"
          onClose={() => setEditReport(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditReport(null)}>Bekor</button>
            <button
              className="btn btn-primary"
              onClick={saveEditReport}
              disabled={editRSubmitting || !editRForm.title || !editRForm.content}
            >
              <Check size={13}/> {editRSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </>}
        >
          <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
            Hisobot faqat yuborilmagan (qoralama) holatda tahrirlanishi mumkin.
          </div>
          <div className="form-group">
            <label className="form-label">Sarlavha *</label>
            <input
              className="form-control"
              value={editRForm.title}
              onChange={e => setEditRForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Hisobot matni *
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                ({editRForm.content.length} belgi)
              </span>
            </label>
            <textarea
              className="form-control"
              rows={14}
              style={{ lineHeight: 1.7 }}
              value={editRForm.content}
              onChange={e => setEditRForm(p => ({ ...p, content: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
