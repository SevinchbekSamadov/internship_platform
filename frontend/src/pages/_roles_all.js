import React, { useState } from 'react';
import { Badge, StatCard, Loading, Empty, Modal, Progress, PageHeader, Tabs, InfoRow, useApi, toArr } from '../components/common';
import { appAPI, internAPI, taskAPI, logAPI, attAPI, reportAPI, authAPI, docAPI, companyAPI, logbookAPI } from '../api';
import { PersonLink, ExcelImportPanel, GradeBadge } from '../components/common';
import {
  Users, FileText, CheckSquare, ClipboardList, BarChart3,
  CalendarDays, Building2, Briefcase, BookOpen, TrendingUp,
  Clock, CheckCircle, XCircle, AlertCircle, Award,
  Check, X, Send, Download, Eye, Save, Plus, UserCheck, UserX,
  Upload, Star, ArrowLeft, RefreshCw, Search, BookMarked,
  GraduationCap, School, ScrollText, Shield, Info, Printer
} from 'lucide-react';

// 
// MENTOR PAGES
// 

export function MentorDashboard() {
  const { data: ints, loading } = useApi(() => internAPI.list());
  const internships = toArr(ints);
  const active = internships.filter(i => i.status === 'active').length;

  if (loading) return <Loading />;
  return (
    <div className="page">
      <PageHeader title="Mentor paneli" subtitle="O'z talabalarim holati" />
      <div className="stats-grid">
        <StatCard icon={Users} value={internships.length} label="Jami talabalar" color="blue" />
        <StatCard icon={CheckCircle} value={active} label="Faol amaliyot" color="green" />
        <StatCard icon={Clock} value={internships.filter(i => i.status === 'pending').length} label="Kutilmoqda" color="yellow" />
        <StatCard icon={Award} value={internships.filter(i => i.status === 'completed').length} label="Yakunlangan" color="cyan" />
      </div>
      <div className="card">
        <div className="card-header"><h3>Talabalarim</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Talaba</th><th>Lavozim</th><th>Holat</th><th>Jarayon</th></tr></thead>
            <tbody>
              {internships.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Talaba topilmadi</td></tr>
              ) : internships.map(i => (
                <tr key={i.id}>
                  <td><strong>{i.student_name}</strong></td>
                  <td className="text-sm text-muted">{i.position}</td>
                  <td><Badge status={i.status} /></td>
                  <td style={{ minWidth: 120 }}><Progress value={i.progress_percent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MentorInternships() {
  const { data, loading, refetch } = useApi(() => internAPI.list());
  const [logModal, setLogModal] = useState(null);
  const { data: logsData, refetch: refetchLogs } = useApi(
    logModal ? () => logAPI.list({ internship: logModal.id }) : null,
    [logModal?.id]
  );

  const internships = toArr(data);

  const approveLog = async (logId) => {
    await logAPI.approve(logId, { comment: '' });
    refetchLogs();
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Amaliyotchilar" subtitle="Barcha amaliyotchilar ro'yxati" />
      {internships.length === 0 ? <Empty text="Hozircha amaliyotchi yo'q" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {internships.map(i => (
            <div key={i.id} className="card">
              <div style={{ padding: '15px 18px' }}>
                <div className="flex-between mb-3">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{i.student_name}</div>
                    <div className="text-sm text-muted mt-1">{i.position} · {i.start_date} — {i.end_date}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge status={i.status} />
                    <button className="btn btn-outline btn-sm" onClick={() => setLogModal(i)}><BookOpen size={13}/> Kundalik</button>
                  </div>
                </div>
                {i.status === 'active' && <Progress value={i.progress_percent} />}
                {i.mentor_grade && (
                  <div className="alert alert-success mt-3"> Mentor bahosi: <strong>{i.mentor_grade}</strong> — Hisobot orqali qo'yildi</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!logModal} onClose={() => setLogModal(null)} title={` ${logModal?.student_name} — Kundalik`}>
        {toArr(logsData).length === 0 ? (
          <Empty text="Hali kundalik yozilmagan" />
        ) : toArr(logsData).map(log => (
          <div key={log.id} style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex-between mb-2">
              <div>
                <strong style={{ fontSize: 13 }}>{log.date}</strong>
                <span className="text-sm text-muted" style={{ marginLeft: 8 }}> {log.hours_worked}h</span>
              </div>
              {!log.approved_by_mentor && (
                <button className="btn btn-success btn-sm" onClick={() => approveLog(log.id)}><Check size={13}/> Tasdiqlash</button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{log.description}</p>
            <div className="flex gap-3" style={{ fontSize: 12 }}>
              <span style={{ color: log.approved_by_mentor ? '#16a34a' : '#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                {log.approved_by_mentor ? <Check size={11}/> : <Clock size={11}/>} Mentor
              </span>
              <span style={{ color: log.approved_by_supervisor ? '#16a34a' : '#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                {log.approved_by_supervisor ? <Check size={11}/> : <Clock size={11}/>} Amaliyot Rahbar
              </span>
            </div>
            {log.mentor_comment && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display:'flex', gap:4 }}>
                <Info size={11} style={{flexShrink:0, marginTop:1}}/> {log.mentor_comment}
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}

export function MentorAttendance() {
  const { data: ints } = useApi(() => internAPI.list());
  const { data, loading, refetch } = useApi(() => attAPI.list());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [marking, setMarking] = useState(false);

  const internships = toArr(ints).filter(i => i.status === 'active');
  const attendance = toArr(data);
  const todayAtt = attendance.filter(a => a.date === date);

  const markAll = async (status) => {
    setMarking(true);
    try {
      const records = internships.map(i => ({ internship_id: i.id, status }));
      await attAPI.bulkMark({ records, date });
      refetch();
    } finally { setMarking(false); }
  };

  const markOne = async (internshipId, status) => {
    await attAPI.bulkMark({ records: [{ internship_id: internshipId, status }], date });
    refetch();
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Davomat" subtitle="Kunlik yo'qlama belgilash" />

      <div className="card mb-4">
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn btn-success btn-sm" disabled={marking} onClick={() => markAll('present')}><Check size={13}/><Check size={13}/> Hammasi keldi</button>
          <button className="btn btn-danger btn-sm" disabled={marking} onClick={() => markAll('absent')}><X size={13}/><X size={13}/> Hammasi kelmadi</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Talaba</th><th>{date} holati</th><th>Kirish vaqti</th><th>Amal</th></tr></thead>
            <tbody>
              {internships.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Faol talaba yo'q</td></tr>
              ) : internships.map(i => {
                const att = todayAtt.find(a => a.internship === i.id);
                return (
                  <tr key={i.id}>
                    <td><strong>{i.student_name}</strong></td>
                    <td>{att ? <Badge status={att.status} /> : <span className="text-muted text-sm">Belgilanmagan</span>}</td>
                    <td className="text-sm">{att?.check_in || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => markOne(i.id, 'present')}></button>
                        <button className="btn btn-warning btn-sm" onClick={() => markOne(i.id, 'late')}></button>
                        <button className="btn btn-danger btn-sm" onClick={() => markOne(i.id, 'absent')}></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MentorTasks() {
  const { data: ints } = useApi(() => internAPI.list());
  const { data, loading, refetch } = useApi(() => taskAPI.list());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ internship: '', title: '', description: '', due_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const internships = toArr(ints);
  const tasks = toArr(data);

  const save = async () => {
    setSubmitting(true);
    try { await taskAPI.create(form); setShowModal(false); setForm({ internship: '', title: '', description: '', due_date: '' }); refetch(); }
    finally { setSubmitting(false); }
  };

  const approve = async (id) => { await taskAPI.approve(id, {}); refetch(); };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Vazifalar" subtitle="Talabalar vazifalarini boshqarish"
        action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Vazifa berish</button>} />

      {tasks.length === 0 ? <Empty text="Hozircha vazifa yo'q" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map(t => (
            <div key={t.id} className="card">
              <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                  <div className="text-sm text-muted mt-1">{t.description}</div>
                  <div className="text-sm text-muted mt-2"> Muddat: {t.due_date}</div>
                  {t.student_note && <div className="alert alert-info mt-2"> Talaba: {t.student_note}</div>}
                </div>
                <div className="flex gap-2" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Badge status={t.status} />
                  {t.status === 'done' && (
                    <button className="btn btn-success btn-sm" onClick={() => approve(t.id)}><Check size={13}/> Tasdiqlash</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yangi vazifa berish"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Bekor</button>
          <button className="btn btn-primary" disabled={submitting} onClick={save}>
            {submitting ? '...' : ' Saqlash'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Talaba</label>
          <select className="form-control" value={form.internship} onChange={e => setForm(p => ({ ...p, internship: e.target.value }))}>
            <option value="">— Tanlang —</option>
            {internships.map(i => <option key={i.id} value={i.id}>{i.student_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Vazifa nomi</label>
          <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tavsif</label>
          <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Muddat</label>
          <input type="date" className="form-control" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

// 
// SUPERVISOR (ILMIY RAHBAR) PAGES
// 

export function SupervisorDashboard() {
  const { data: ints, loading } = useApi(() => internAPI.list());
  const { data: reps }          = useApi(() => reportAPI.list());
  const internships = toArr(ints);
  const reports     = toArr(reps);
  const pendingReports = reports.filter(r => r.status === 'submitted').length;

  if (loading) return <Loading />;
  return (
    <div className="page">
      <PageHeader title="Amaliyot Rahbar paneli" subtitle="Biriktirilgan talabalarim" />
      <div className="stats-grid">
        <StatCard icon={Users} value={internships.length}                                      label="Talabalarim"    color="blue"   />
        <StatCard icon={CheckCircle} value={internships.filter(i => i.status === 'active').length}   label="Faol amaliyot"  color="green"  />
        <StatCard icon={Award} value={internships.filter(i => i.status === 'completed').length} label="Yakunlangan"   color="cyan"   />
        <StatCard icon={AlertCircle} value={pendingReports}                                          label="Hisobot kutmoqda" color="yellow" />
      </div>
      {pendingReports > 0 && (
        <div className="alert alert-warning mb-4">
           <strong>{pendingReports} ta hisobot</strong> sizning tasdiqlashingizni kutmoqda.
        </div>
      )}
      <div className="card">
        <div className="card-header"><h3>Talabalarim holati</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Talaba</th><th>Korxona</th><th>Mentor</th><th>Holat</th><th>Jarayon</th></tr></thead>
            <tbody>
              {internships.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Talaba biriktirilmagan</td></tr>
              ) : internships.map(i => (
                <tr key={i.id}>
                  <td><PersonLink userId={i.student} name={i.student_name} role="student" /></td>
                  <td className="text-sm">{i.company_name}</td>
                  <td className="text-sm">
                    <PersonLink userId={i.mentor_user_id || i.mentor} name={i.mentor_name || '—'} role="mentor" />
                  </td>
                  <td><Badge status={i.status} /></td>
                  <td style={{ minWidth: 120 }}><Progress value={i.progress_percent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SupervisorApplications() {
  // Supervisor endi arizalarni tasdiqlamaydi.
  // Bu sahifada o'ziga biriktirilgan talabalar va ularning holati ko'rinadi.
  const { data, loading } = useApi(() => internAPI.list());
  const internships = toArr(data);

  const byStatus = {
    pending:   internships.filter(i => i.status === 'pending'),
    active:    internships.filter(i => i.status === 'active'),
    completed: internships.filter(i => i.status === 'completed'),
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Mening talabalarim"
        subtitle="Kafedra tomonidan biriktirilgan talabalar"
      />
      {internships.length === 0 ? (
        <Empty text="Sizga hali talaba biriktirilmagan. Kafedra tomonidan tayinlanadi." />
      ) : (
        <>
          {[
            { key: 'pending',   label: "Yo'llanma kutmoqda", color: '#f59e0b' },
            { key: 'active',    label: 'Faol amaliyot',       color: '#10b981' },
            { key: 'completed', label: 'Yakunlangan',         color: '#6b7280' },
          ].map(({ key, label, color }) => byStatus[key].length > 0 && (
            <div key={key} className="card mb-3">
              <div className="card-header">
                <h3 style={{ color }}>{label} ({byStatus[key].length} ta)</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Talaba</th><th>Korxona</th><th>Lavozim</th><th>Mentor</th><th>Davr</th></tr>
                  </thead>
                  <tbody>
                    {byStatus[key].map(i => (
                      <tr key={i.id}>
                        <td><PersonLink userId={i.student} name={i.student_name} role="student" /></td>
                        <td className="text-sm">{i.company_name}</td>
                        <td className="text-sm text-muted">{i.position}</td>
                        <td className="text-sm">
                          <PersonLink userId={i.mentor_user_id || i.mentor} name={i.mentor_name || '—'} role="mentor" />
                        </td>
                        <td className="text-sm text-muted">{i.start_date} — {i.end_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function SupervisorInternships() {
  const { data, loading, refetch } = useApi(() => internAPI.list());
  const [tab, setTab] = useState('all');
  const [logModal, setLogModal] = useState(null);
  const [logComment, setLogComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: logsData, refetch: refetchLogs } = useApi(
    logModal ? () => logAPI.list({ internship: logModal.id }) : null,
    [logModal?.id]
  );

  const internships = toArr(data);
  const counts = internships.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
  const filtered = tab === 'all' ? internships : internships.filter(i => i.status === tab);

  const approveLog = async (logId) => {
    await logAPI.supervisorApprove(logId, { comment: logComment });
    setLogComment('');
    refetchLogs();
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Amaliyotchilar" subtitle="O'zimga biriktirilgan talabalar" />
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'all', label: 'Hammasi', count: internships.length },
            { key: 'active', label: 'Faol', count: counts.active || 0 },
            { key: 'completed', label: 'Yakunlangan', count: counts.completed || 0 },
          ]} active={tab} onChange={setTab} />
        </div>
        {filtered.length === 0 ? <Empty text="Talaba topilmadi" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Talaba</th><th>Korxona</th><th>Lavozim</th><th>Holat</th><th>Yakuniy baho</th><th>Amal</th></tr></thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td><PersonLink userId={i.student} name={i.student_name} role="student" /></td>
                    <td className="text-sm">{i.company_name}</td>
                    <td className="text-sm text-muted">{i.position}</td>
                    <td><Badge status={i.status} /></td>
                    <td>
                      {i.final_grade
                        ? <GradeBadge score={i.final_grade} letter={i.final_grade_letter} />
                        : <span className="text-muted" style={{ fontSize: 12 }}>— hisobotdan keyin</span>}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => { setLogModal(i); setLogComment(''); }}>
                         Kundalik
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!logModal} onClose={() => setLogModal(null)} title={` ${logModal?.student_name} — Kundaliklar`}>
        {toArr(logsData).length === 0 ? (
          <Empty text="Hali kundalik yozilmagan" />
        ) : toArr(logsData).map(log => (
          <div key={log.id} style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex-between mb-1">
              <div>
                <strong style={{ fontSize: 13 }}>{log.date}</strong>
                <span className="text-sm text-muted" style={{ marginLeft: 8 }}> {log.hours_worked}h</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{log.description}</p>
            <div className="flex gap-3" style={{ fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: log.approved_by_mentor ? '#16a34a' : '#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                {log.approved_by_mentor ? <Check size={11}/> : <Clock size={11}/>} Mentor
              </span>
              <span style={{ color: log.approved_by_supervisor ? '#16a34a' : '#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
                {log.approved_by_supervisor ? <Check size={11}/> : <Clock size={11}/>} Rahbar (siz)
              </span>
            </div>
            {!log.approved_by_supervisor && (
              log.approved_by_mentor ? (
                <div className="flex gap-2 mt-2">
                  <input
                    className="form-control"
                    style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                    placeholder="Izoh (ixtiyoriy)"
                    value={logComment}
                    onChange={e => setLogComment(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => approveLog(log.id)}>
                     Tasdiqlash
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11}/> Avval mentor tasdiqlashi kutilmoqda
                </div>
              )
            )}
            {log.supervisor_comment && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}> {log.supervisor_comment}</div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  );
}

export function SupervisorReports() {
  const { data, loading, refetch } = useApi(() => reportAPI.list());
  const { data: intsData } = useApi(() => internAPI.list());
  const [selected, setSelected] = useState(null);
  const [supGrade, setSupGrade] = useState('');
  const [finalGrade, setFinalGrade] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState('approve');

  const reports = toArr(data);
  const internships = toArr(intsData);

  const getInternship = (report) =>
    internships.find(i => i.id === report.internship);

  const doAction = async () => {
    setSubmitting(true);
    try {
      if (action === 'approve') {
        // Hisobotni tasdiqlash + baho
        await reportAPI.approve(selected.id, { grade: supGrade, comment });
        // Amaliyot rahbar bahosi va yakuniy baho
        const intern = getInternship(selected);
        if (intern) {
          if (supGrade) await internAPI.setSupervisorGrade(intern.id, { grade: supGrade, comment });
          if (finalGrade) await internAPI.setFinalGrade(intern.id, { grade: finalGrade });
        }
      } else {
        await reportAPI.reject(selected.id, { comment });
      }
      setSelected(null); refetch();
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Hisobotlar" subtitle="Talabalar yakuniy hisobotlari" />
      {reports.length === 0 ? <Empty text="Hisobot topilmadi" /> : (
        reports.map(r => (
          <div key={r.id} className="card mb-4">
            <div className="card-header">
              <div>
                <h3>{r.title}</h3>
                <span className="text-sm text-muted">{r.student_name} · {r.company_name}</span>
              </div>
              <div className="flex gap-2">
                <Badge status={r.status} />
                {r.status === 'submitted' && (
                  <>
                    <button className="btn btn-success btn-sm" onClick={() => { setSelected(r); setAction('approve'); setGrade(''); setComment(''); }}><Check size={13}/> Tasdiqlash</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setSelected(r); setAction('reject'); setComment(''); }}><X size={13}/> Rad</button>
                  </>
                )}
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>{r.content?.slice(0, 300)}</p>
              {r.grade && <div className="alert alert-success mt-3"> Baho: <strong>{r.grade}</strong></div>}
            </div>
          </div>
        ))
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={action === 'approve' ? ' Hisobotni tasdiqlash va baho qo\'yish' : ' Rad etish'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Bekor</button>
          <button className={`btn ${action === 'approve' ? 'btn-success' : 'btn-danger'}`}
            disabled={submitting} onClick={doAction}>
            {submitting ? '...' : action === 'approve' ? 'Tasdiqlash' : 'Rad etish'}
          </button>
        </>}>
        {action === 'approve' && (() => {
          const intern = selected ? getInternship(selected) : null;
          return (
            <>
              <div className="alert alert-info mb-3" style={{ fontSize: 13 }}>
                <strong>{selected?.student_name}</strong> — {selected?.title}
              </div>
              {intern?.mentor_grade && (
                <div className="alert alert-success mb-3" style={{ fontSize: 13 }}>
                   Mentor bahosi: <strong>{intern.mentor_grade}</strong>
                </div>
              )}
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mening bahom — amaliyot rahbar (0–100) *</label>
                  <input type="number" className="form-control" min={0} max={100}
                    value={supGrade} onChange={e => setSupGrade(e.target.value)}
                    placeholder="Masalan: 88" />
                </div>
                <div className="form-group">
                  <label className="form-label">Yakuniy baho (0–100)</label>
                  <input type="number" className="form-control" min={0} max={100}
                    value={finalGrade} onChange={e => setFinalGrade(e.target.value)}
                    placeholder="Avtomatik hisoblanadi" />
                  <small className="text-muted">Bo'sh qolsa, amaliyot rahbar bahosi yakuniy sanaladi</small>
                </div>
              </div>
            </>
          );
        })()}
        <div className="form-group">
          <label className="form-label">Izoh</label>
          <textarea className="form-control" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

// 
// DEKANAT PAGES
// 

export function DekanatDashboard() {
  const { data: ints, loading } = useApi(() => internAPI.list());
  const { data: apps } = useApi(() => appAPI.list({ status: 'sup_approved' }));
  const internships = toArr(ints);
  const pendingDocs = toArr(apps).length;

  if (loading) return <Loading />;
  return (
    <div className="page">
      <PageHeader title="Dekanat paneli" subtitle="Umumiy holat" />
      <div className="stats-grid">
        <StatCard icon={Briefcase} value={internships.length} label="Jami amaliyotlar" color="blue" />
        <StatCard icon={CheckCircle} value={internships.filter(i => i.status === 'active').length} label="Faol" color="green" />
        <StatCard icon={FileText} value={pendingDocs} label="Yo'llanma kutmoqda" color="yellow" />
        <StatCard icon={Award} value={internships.filter(i => i.status === 'completed').length} label="Yakunlangan" color="cyan" />
      </div>
      {pendingDocs > 0 && (
        <div className="alert alert-warning">
           <strong>{pendingDocs} ta amaliyot</strong> uchun yo'llanma yaratilishi kerak. "Amaliyotchilar" bo'limiga o'ting.
        </div>
      )}
    </div>
  );
}

export function DekanatApplications() {
  const { data, loading, refetch } = useApi(() => appAPI.list());
  const apps = toArr(data);

  const [tab, setTab] = useState('kafedra_approved');
  // groupModal: { group, apps } — shu guruh uchun yo'llanma
  const [groupModal, setGroupModal] = useState(null);
  const [form, setForm] = useState({ start_date: '', end_date: '', position: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const counts = apps.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
  const filtered = tab === 'all' ? apps : apps.filter(a => a.status === tab);

  const byGroup = filtered.reduce((acc, a) => {
    const key = a.student_group || 'Guruhsiz';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const openGroupModal = (group, groupApps) => {
    const readyApps = groupApps.filter(a =>
      ['kafedra_approved','sup_approved','dekan_approved'].includes(a.status)
    );
    if (readyApps.length === 0) return alert("Bu guruhda yo'llanmaga tayyor ariza yo'q");
    setGroupModal({ group, apps: readyApps });
    // Lavozimni birinchi arizadan olamiz
    setForm({ start_date: '', end_date: '', position: readyApps[0]?.vacancy_title || '' });
    setErr('');
  };

  const createGroupYollanma = async () => {
    if (!groupModal) return;
    setSubmitting(true); setErr('');
    try {
      const res = await docAPI.batchCreateYollanma({
        application_ids: groupModal.apps.map(a => a.id),
        start_date: form.start_date,
        end_date: form.end_date,
        position: form.position,
      });
      setGroupModal(null);
      refetch();
      alert(res.data.message);
    } catch (e) {
      setErr(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title=" Arizalar — guruhlar bo'yicha"
        subtitle="Kafedra tasdiqlagan arizalardan guruh bo'yicha yo'llanma yarating"
      />

      <div className="card mb-3">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'all',              label: 'Hammasi',          count: apps.length },
            { key: 'kafedra_approved', label: 'Kafedra  — tayyor', count: counts.kafedra_approved || 0 },
            { key: 'sup_approved',     label: 'Rahbar  (eski)',   count: counts.sup_approved || 0 },
            { key: 'hr_approved',      label: 'HR ',             count: counts.hr_approved || 0 },
            { key: 'completed',        label: 'Yakunlandi',       count: counts.completed || 0 },
          ]} active={tab} onChange={setTab} />
        </div>
      </div>

      {Object.keys(byGroup).length === 0
        ? <Empty text="Ariza topilmadi" />
        : Object.entries(byGroup).map(([group, groupApps]) => {
          const readyCount = groupApps.filter(a =>
            ['kafedra_approved','sup_approved','dekan_approved'].includes(a.status)).length;
          return (
            <div key={group} className="card mb-4">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3>{group} guruhi</h3>
                  <span className="text-sm text-muted">
                    {groupApps.length} ta ariza
                    {readyCount > 0 && <strong style={{ color: '#10b981', marginLeft: 6 }}>· {readyCount} ta tayyor</strong>}
                  </span>
                </div>
                {readyCount > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openGroupModal(group, groupApps)}
                  >
                     {readyCount} ta yo'llanma yaratish
                  </button>
                )}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Talaba</th>
                      <th>Korxona / Vakansiya</th>
                      <th>Amaliyot rahbar</th>
                      <th>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupApps.map(a => (
                      <tr key={a.id}>
                        <td>
                          <PersonLink userId={a.student} name={a.student_name} role="student" />
                        </td>
                        <td className="text-sm">
                          <div>{a.company_name}</div>
                          <div className="text-muted">{a.vacancy_title}</div>
                        </td>
                        <td className="text-sm">
                          {a.assigned_supervisor_name
                            ? <PersonLink
                                userId={a.assigned_supervisor_id}
                                name={a.assigned_supervisor_name}
                                role="supervisor"
                              />
                            : <span style={{ color: '#f59e0b' }}> Biriktirilmagan</span>}
                        </td>
                        <td><Badge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      }

      {/* Guruh yo'llanma modali */}
      {groupModal && (
        <Modal
          open={true}
          onClose={() => setGroupModal(null)}
          title={` ${groupModal.group} — yo'llanma yaratish`}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setGroupModal(null)}>Bekor</button>
            <button
              className="btn btn-primary"
              disabled={submitting || !form.start_date || !form.end_date}
              onClick={createGroupYollanma}
            >
              {submitting ? '...' : ` ${groupModal.apps.length} ta yo'llanma yaratish`}
            </button>
          </>}
        >
          {err && <div className="alert alert-error mb-3">{err}</div>}

          {/* Talabalar preview */}
          <div style={{ marginBottom: 14 }}>
            <div className="text-sm text-muted mb-2">Yo'llanma beriladigan talabalar:</div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              {groupModal.apps.map(a => (
                <div key={a.id} style={{
                  padding: '6px 12px', borderBottom: '1px solid #f3f4f6',
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13
                }}>
                  <span><strong>{a.student_name}</strong></span>
                  <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a.company_name}
                    {a.assigned_supervisor_name && (
                      <span style={{ color: '#10b981', marginLeft: 6 }}>
                        · {a.assigned_supervisor_name}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Umumiy ma'lumotlar — butun guruh uchun */}
          <div className="form-group">
            <label className="form-label">Amaliyot lavozimi</label>
            <input className="form-control" value={form.position}
              placeholder="Masalan: Dasturchi-intern"
              onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Boshlanish sanasi *</label>
              <input type="date" className="form-control" value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tugash sanasi *</label>
              <input type="date" className="form-control" value={form.end_date}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="alert alert-info" style={{ fontSize: 12 }}>
            ℹ Amaliyot rahbar kafedra tomonidan biriktirilgan. Dekanat o'zgartira olmaydi.
          </div>
        </Modal>
      )}
    </div>
  );
}

export function DekanatInternships() {
  const { data, loading, refetch } = useApi(() => internAPI.list());
  const { data: supsData } = useApi(() => authAPI.supervisors());
  const [supModal, setSupModal] = useState(null);
  const [supId, setSupId] = useState('');
  const [docModal, setDocModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('all');

  const internships = toArr(data);
  const supervisors = toArr(supsData);
  const counts = internships.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
  const filtered = tab === 'all' ? internships : internships.filter(i => i.status === tab);

  const assignSup = async () => {
    setSubmitting(true);
    try {
      await internAPI.assignSupervisor(supModal.id, { supervisor_id: supId });
      setSupModal(null); setSupId(''); refetch();
    } finally { setSubmitting(false); }
  };

  const sendDoc = async (docId) => {
    try {
      await docAPI.send(docId);
      refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Amaliyotchilar" subtitle="Barcha talabalar ro'yxati" />
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'all', label: 'Hammasi', count: internships.length },
            { key: 'pending', label: 'Kutilmoqda', count: counts.pending || 0 },
            { key: 'active', label: 'Faol', count: counts.active || 0 },
            { key: 'completed', label: 'Yakunlangan', count: counts.completed || 0 },
          ]} active={tab} onChange={setTab} />
        </div>
        {filtered.length === 0 ? <Empty text="Talaba topilmadi" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Talaba</th><th>Korxona</th><th>Amaliyot rahbar</th><th>Yo'llanma</th><th>Holat</th><th>Amal</th></tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td><strong>{i.student_name}</strong></td>
                    <td className="text-sm">{i.company_name}</td>
                    <td>
                      {i.supervisor_name
                        ? <span className="text-sm">{i.supervisor_name}</span>
                        : <button className="btn btn-ghost btn-sm" onClick={() => { setSupModal(i); setSupId(''); }}>+ Biriktir</button>}
                    </td>
                    <td>
                      {i.document
                        ? i.document.status === 'dekan_approved'
                          ? <button className="btn btn-primary btn-sm" onClick={() => sendDoc(i.document.id)}><Send size={13}/> Yuborish</button>
                          : <span className="badge badge-green"> {i.document.status === 'sent' ? 'Yuborildi' : i.document.status === 'company_accepted' ? 'Qabul qilindi' : 'Mavjud'}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td><Badge status={i.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        {i.status === 'active' && (
                          <Progress value={i.progress_percent} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!supModal} onClose={() => setSupModal(null)} title="Amaliyot rahbar biriktirish"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSupModal(null)}>Bekor</button>
          <button className="btn btn-primary" disabled={!supId || submitting} onClick={assignSup}>
            {submitting ? '...' : ' Biriktirish'}
          </button>
        </>}>
        <p className="text-sm text-muted mb-4">Talaba: <strong>{supModal?.student_name}</strong></p>
        <div className="form-group">
          <label className="form-label">Amaliyot rahbarni tanlang</label>
          <select className="form-control" value={supId} onChange={e => setSupId(e.target.value)}>
            <option value="">— Tanlang —</option>
            {supervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}

export function DekanatCompanies() {
  const { data, loading, refetch } = useApi(() => import('../api').then(m => m.companyAPI.list()));
  const companies = toArr(data);

  const approve = async (id) => {
    await import('../api').then(m => m.companyAPI.approve(id));
    refetch();
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Korxonalar" />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Korxona</th><th>Soha</th><th>Shartnoma</th><th>Holat</th><th>Amal</th></tr></thead>
            <tbody>
              {companies.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Korxona topilmadi</td></tr>
              ) : companies.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="text-sm">{c.industry}</td>
                  <td>{c.has_contract ? <span className="badge badge-green"></span> : <span className="badge badge-gray"></span>}</td>
                  <td><Badge status={c.status} /></td>
                  <td>
                    {c.status === 'pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => approve(c.id)}><Check size={13}/> Tasdiqlash</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DekanatDocuments() {
  const { data, loading, refetch } = useApi(() => docAPI.list());
  const [detailModal, setDetailModal] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [batchSending, setBatchSending] = useState(null);
  const [tab, setTab] = useState('dekan_approved');

  const mediaUrl = p => p?.startsWith('http') ? p : `http://localhost:8000${p}`;

  const docs = toArr(data);
  const counts = docs.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});

  // Guruh bo'yicha guruhlash
  const filtered = tab === 'all' ? docs : docs.filter(d => d.status === tab);
  const byGroup = filtered.reduce((acc, d) => {
    const g = d.student_group || 'Guruhsiz';
    if (!acc[g]) acc[g] = [];
    acc[g].push(d);
    return acc;
  }, {});

  // Batch yuborish
  const batchSend = async (group, groupDocs) => {
    const toSend = groupDocs.filter(d => d.status === 'dekan_approved');
    if (!toSend.length) return alert('Yuborish uchun hujjat yo\'q');
    setBatchSending(group);
    try {
      const res = await docAPI.batchSend({ doc_ids: toSend.map(d => d.id) });
      alert(res.data.message);
      refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    } finally { setBatchSending(null); }
  };

  // PDF yuklab olish
  const downloadFile = async (apiFn, filename) => {
    setDownloading(filename);
    try {
      const res = await apiFn();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.error || 'Yuklab bo\'lmadi');
    } finally { setDownloading(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Yo'llanmalar" subtitle="Guruh bo'yicha yo'llanma hujjatlari" />

      <div className="card mb-3">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'dekan_approved', label: 'Yuborilmagan',    count: counts.dekan_approved || 0 },
            { key: 'sent',           label: 'Yuborilgan',       count: counts.sent || 0 },
            { key: 'company_accepted', label: 'Qabul qilindi', count: counts.company_accepted || 0 },
            { key: 'rejected',       label: 'Rad etildi',       count: counts.rejected || 0 },
            { key: 'all',            label: 'Hammasi',          count: docs.length },
          ]} active={tab} onChange={setTab} />
        </div>
      </div>

      {Object.keys(byGroup).length === 0
        ? <Empty text="Yo'llanma topilmadi" />
        : Object.entries(byGroup).map(([group, groupDocs]) => {
          const canSend = groupDocs.filter(d => d.status === 'dekan_approved');
          return (
            <div key={group} className="card mb-4">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>{group} guruhi</h3>
                  <span className="text-sm text-muted">{groupDocs.length} ta yo'llanma</span>
                </div>
                {canSend.length > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => batchSend(group, groupDocs)}
                    disabled={batchSending === group}
                  >
                    {batchSending === group ? '...' : ` ${canSend.length}<Send size={14}/> tasini yuborish`}
                  </button>
                )}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Talaba</th>
                      <th>Korxona</th>
                      <th>Davr</th>
                      <th>Holat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupDocs.map(d => (
                      <tr key={d.id} style={{ cursor: 'pointer' }}>
                        <td onClick={() => setDetailModal(d)}>
                          <strong>{d.student_name}</strong>
                        </td>
                        <td className="text-sm" onClick={() => setDetailModal(d)}>
                          {d.company_name}
                        </td>
                        <td className="text-sm text-muted" onClick={() => setDetailModal(d)}>
                          {d.internship_data
                            ? `${d.internship_data.start_date} — ${d.internship_data.end_date}`
                            : '—'}
                        </td>
                        <td onClick={() => setDetailModal(d)}>
                          <Badge status={d.status} />
                        </td>
                        <td>
                          <div className="flex gap-1" style={{ flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setDetailModal(d)}
                              title="Batafsil"
                            ></button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => downloadFile(
                                () => docAPI.downloadYollanma(d.id),
                                `yollanma_${d.student_name}.pdf`
                              )}
                              disabled={downloading === `yollanma_${d.student_name}.pdf`}
                              title="Yo'llanma PDF"
                            >
                              {downloading === `yollanma_${d.student_name}.pdf` ? '' : ' Yo\'llanma'}
                            </button>
                            {d.internship_data?.mentor_name && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => downloadFile(
                                  () => docAPI.downloadBuyruq(d.id),
                                  `buyruq_${d.student_name}.pdf`
                                )}
                                disabled={downloading === `buyruq_${d.student_name}.pdf`}
                                title="Buyruq PDF"
                              >
                                {downloading === `buyruq_${d.student_name}.pdf` ? '' : ' Buyruq'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      }

      {/* Detail modal */}
      {detailModal && (
        <Modal
          open={true}
          onClose={() => setDetailModal(null)}
          title={` Yo'llanma — ${detailModal.student_name}`}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* QR kod */}
            {detailModal.qr_code && (
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <img
                  src={mediaUrl(detailModal.qr_code)}
                  alt="QR"
                  style={{ width: 120, height: 120, border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>QR kod</div>
              </div>
            )}

            {/* Ma'lumotlar */}
            <div style={{ flex: 1, fontSize: 13 }}>
              {[
                ['Talaba',        detailModal.student_name],
                ['Guruh',         detailModal.student_group || '—'],
                ['Korxona',       detailModal.company_name],
                ['Lavozim',       detailModal.internship_data?.position || '—'],
                ['Boshlanish',    detailModal.internship_data?.start_date || '—'],
                ['Tugash',        detailModal.internship_data?.end_date || '—'],
                ['Amaliyot rahbar', detailModal.internship_data?.supervisor_name || '—'],
                ['Mentor',        detailModal.internship_data?.mentor_name || '—'],
                ['Holat',         detailModal.status_display || detailModal.status],
                ['Yaratilgan',    new Date(detailModal.created_at).toLocaleDateString('uz-UZ')],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', gap: 8, marginBottom: 6, borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                  <span style={{ color: '#9ca3af', minWidth: 110 }}>{lbl}</span>
                  <strong>{val}</strong>
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, wordBreak: 'break-all' }}>
                ID: {detailModal.unique_id}
              </div>
            </div>
          </div>

          {/* Yuklab olish tugmalari */}
          <div className="flex gap-2 mt-4" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => downloadFile(
                () => docAPI.downloadYollanma(detailModal.id),
                `yollanma_${detailModal.student_name}.pdf`
              )}
              disabled={!!downloading}
            >
              {downloading ? '' : ' Yo\'llanma PDF'}
            </button>
            {detailModal.internship_data?.mentor_name && (
              <button
                className="btn btn-outline"
                onClick={() => downloadFile(
                  () => docAPI.downloadBuyruq(detailModal.id),
                  `buyruq_${detailModal.student_name}.pdf`
                )}
                disabled={!!downloading}
              >
                {downloading ? '' : ' Buyruq PDF'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// 
// ADMIN PAGES
// 

export function AdminDashboard() {
  const { data: stats, loading } = useApi(() => reportAPI.analytics());

  if (loading) return <Loading />;
  const s = stats || {};

  return (
    <div className="page">
      <PageHeader title="Admin paneli" subtitle="Tizim statistikasi" />
      <div className="stats-grid">
        <StatCard icon={Briefcase}    value={s.internships?.total || 0}     label="Jami amaliyot"  color="blue"   />
        <StatCard icon={CheckCircle}  value={s.internships?.active || 0}    label="Faol"           color="green"  />
        <StatCard icon={Award}        value={s.internships?.completed || 0} label="Yakunlangan"    color="cyan"   />
        <StatCard icon={BarChart3}    value={s.avg_grade || 0}              label="O'rtacha baho"  color="yellow" />
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { data, loading, refetch } = useApi(() => authAPI.list());
  const [roleFilter, setRoleFilter] = useState('student');
  const [groupFilter, setGroupFilter] = useState('');
  const [showImport, setShowImport] = useState(false);

  const users = toArr(data);
  const students = users.filter(u => u.role === 'student');

  // Guruhlar va yunalishlar
  const groups = [...new Set(
    students.map(u => u.student_profile?.group).filter(Boolean)
  )].sort();
  const directions = [...new Set(
    students.map(u => u.student_profile?.direction).filter(Boolean)
  )].sort();

  const filtered = roleFilter === 'student'
    ? students.filter(u => !groupFilter || u.student_profile?.group === groupFilter)
    : users.filter(u => u.role === roleFilter);

  const ROLES = [
    { key: 'student', label: 'Talabalar' },
    { key: 'supervisor', label: 'Amaliyot Rahbarlar' },
    { key: 'kafedra', label: 'Kafedra' },
    { key: 'dekanat', label: 'Dekanat' },
    { key: 'company_hr', label: 'Korxona HR' },
    { key: 'mentor', label: 'Mentorlar' },
    { key: 'admin', label: 'Adminlar' },
  ];

  // Guruh bo'yicha statistika
  const byGroup = students.reduce((acc, u) => {
    const g = u.student_profile?.group || 'Guruhsiz';
    if (!acc[g]) acc[g] = [];
    acc[g].push(u);
    return acc;
  }, {});

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Foydalanuvchilar"
        subtitle={`Jami: ${users.length} ta`}
        action={
          <button className="btn btn-primary" onClick={() => setShowImport(p => !p)}>
             Excel import
          </button>
        }
      />

      {showImport && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Talabalarni Excel orqali import qilish</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}></button>
          </div>
          <div className="card-body">
            <ExcelImportPanel
              onImport={authAPI.importStudents}
              templateCols={['Ism Familya', 'Email', 'Student ID', 'Guruh', 'Kurs', 'Kafedra/Yunalish', 'Fakultet']}
            />
          </div>
        </div>
      )}

      {/* Guruh statistikasi */}
      {Object.keys(byGroup).length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><h3>Guruhlar bo'yicha</h3></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px' }}>
            {Object.entries(byGroup).map(([group, members]) => (
              <button
                key={group}
                className={`btn btn-sm ${groupFilter === group ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setGroupFilter(g => g === group ? '' : group); setRoleFilter('student'); }}
              >
                 {group} <span style={{ marginLeft: 4, opacity: 0.7 }}>({members.length})</span>
              </button>
            ))}
            {groupFilter && (
              <button className="btn btn-ghost btn-sm" onClick={() => setGroupFilter('')}> Barcha guruhlar</button>
            )}
          </div>
        </div>
      )}

      {/* Rol filtri */}
      <div className="card mb-3">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs
            tabs={ROLES.map(r => ({
              key: r.key,
              label: r.label,
              count: users.filter(u => u.role === r.key).length,
            }))}
            active={roleFilter}
            onChange={r => { setRoleFilter(r); setGroupFilter(''); }}
          />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0
          ? <Empty text="Foydalanuvchi topilmadi" />
          : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ism</th><th>Email</th><th>Telefon</th>
                  {roleFilter === 'student' && <><th>Guruh</th><th>Yunalish</th><th>Kurs</th></>}
                  {['supervisor','kafedra'].includes(roleFilter) && <><th>Kafedra</th><th>Lavozim</th></>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <PersonLink userId={u.id} name={u.full_name || u.email} role={u.role} />
                    </td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td className="text-sm">{u.phone || '—'}</td>
                    {roleFilter === 'student' && <>
                      <td className="text-sm">{u.student_profile?.group || '—'}</td>
                      <td className="text-sm text-muted">{u.student_profile?.direction || '—'}</td>
                      <td className="text-sm">{u.student_profile?.course || '—'}-kurs</td>
                    </>}
                    {['supervisor','kafedra'].includes(roleFilter) && <>
                      <td className="text-sm">{u.supervisor_profile?.department || u.kafedra_profile?.department || '—'}</td>
                      <td className="text-sm text-muted">{u.supervisor_profile?.position || u.kafedra_profile?.position || '—'}</td>
                    </>}
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

export function AdminCompanies() {
  const { data, loading, refetch } = useApi(() => companyAPI.list());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: '', inn: '', industry: '', city: '', address: '', phone: '', email: '',
    hr_first_name: '', hr_last_name: '', hr_email: '', hr_password: '', hr_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState(null);

  const companies = toArr(data);
  const contracted = companies.filter(c => c.has_contract);
  const noContract = companies.filter(c => !c.has_contract);

  const approve = async (id) => { await companyAPI.approve(id); refetch(); };
  const reject  = async (id) => { await companyAPI.reject(id);  refetch(); };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const createCompany = async () => {
    setSubmitting(true); setErr(''); setCreated(null);
    try {
      const res = await companyAPI.adminCreate(form);
      setCreated(res.data);
      setForm({
        company_name: '', inn: '', industry: '', city: '', address: '', phone: '', email: '',
        hr_first_name: '', hr_last_name: '', hr_email: '', hr_password: '', hr_phone: '',
      });
      refetch();
    } catch (e) {
      setErr(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Korxonalar"
        subtitle={`${contracted.length} ta shartnomali · ${noContract.length} ta shartnomasi yo'q`}
        action={
          <button className="btn btn-primary" onClick={() => { setShowForm(p => !p); setCreated(null); setErr(''); }}>
            + Shartnomali korxona qo'shish
          </button>
        }
      />

      {/* Yangi korxona formi */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Shartnomali korxona qo'shish</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}></button>
          </div>
          <div className="card-body">
            {err && <div className="alert alert-error mb-3">{err}</div>}
            {created && (
              <div className="alert alert-success mb-3" style={{ fontSize: 13 }}>
                 <strong>{created.company?.name}</strong> qo'shildi!<br />
                HR login: <code>{created.hr_email}</code> | Parol: <code>{created.hr_password}</code>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <h4 style={{ marginBottom: 12, color: '#374151' }}>Korxona ma'lumotlari</h4>
                <div className="form-group">
                  <label className="form-label">Korxona nomi *</label>
                  <input className="form-control" value={form.company_name} onChange={f('company_name')} placeholder="TechSolutions Uz" />
                </div>
                <div className="form-group">
                  <label className="form-label">INN</label>
                  <input className="form-control" value={form.inn} onChange={f('inn')} placeholder="123456789" />
                </div>
                <div className="form-group">
                  <label className="form-label">Soha</label>
                  <input className="form-control" value={form.industry} onChange={f('industry')} placeholder="Axborot texnologiyalari" />
                </div>
                <div className="form-group">
                  <label className="form-label">Shahar</label>
                  <input className="form-control" value={form.city} onChange={f('city')} placeholder="Toshkent" />
                </div>
                <div className="form-group">
                  <label className="form-label">Manzil</label>
                  <input className="form-control" value={form.address} onChange={f('address')} placeholder="Yunusobod, 1-ko'cha" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-control" value={form.phone} onChange={f('phone')} placeholder="+998901234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={form.email} onChange={f('email')} placeholder="info@company.uz" />
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: 12, color: '#374151' }}>HR foydalanuvchi</h4>
                <div className="form-group">
                  <label className="form-label">Ismi *</label>
                  <input className="form-control" value={form.hr_first_name} onChange={f('hr_first_name')} placeholder="Malika" />
                </div>
                <div className="form-group">
                  <label className="form-label">Familyasi *</label>
                  <input className="form-control" value={form.hr_last_name} onChange={f('hr_last_name')} placeholder="Rahimova" />
                </div>
                <div className="form-group">
                  <label className="form-label">HR Email *</label>
                  <input type="email" className="form-control" value={form.hr_email} onChange={f('hr_email')} placeholder="hr@company.uz" />
                </div>
                <div className="form-group">
                  <label className="form-label">Parol *</label>
                  <input type="text" className="form-control" value={form.hr_password} onChange={f('hr_password')} placeholder="hr123456" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-control" value={form.hr_phone} onChange={f('hr_phone')} placeholder="+998901234567" />
                </div>
              </div>
            </div>
            <div className="alert alert-info mt-2" style={{ fontSize: 12 }}>
               Bu korxona <strong>shartnomali</strong> sifatida kiritiladi — talabalar bevosita ariza yuborishi mumkin.
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-primary"
                onClick={createCompany}
                disabled={submitting || !form.company_name || !form.hr_email || !form.hr_password}
              >
                {submitting ? ' Saqlanmoqda...' : ' Korxona qo\'shish'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Bekor</button>
            </div>
          </div>
        </div>
      )}

      {/* Shartnomali korxonalar */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>Shartnomali korxonalar ({contracted.length} ta)</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Korxona</th><th>Soha</th><th>Shahar</th><th>HR</th><th>Holat</th></tr></thead>
            <tbody>
              {contracted.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', padding:16, color:'#9ca3af' }}>Shartnomali korxona yo'q</td></tr>
                : contracted.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td className="text-sm text-muted">{c.industry || '—'}</td>
                    <td className="text-sm text-muted">{c.city || '—'}</td>
                    <td className="text-sm text-muted">{c.hr_name}</td>
                    <td><Badge status={c.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shartnomasi yo'q — tasdiqlash kerak */}
      <div className="card">
        <div className="card-header">
          <h3>Ro'yxatdan o'tgan — tasdiqlash kerak ({noContract.filter(c => c.status === 'pending').length} ta)</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Korxona</th><th>INN</th><th>Soha</th><th>Holat</th><th>Amal</th></tr></thead>
            <tbody>
              {noContract.length === 0
                ? <tr><td colSpan={5} style={{ textAlign:'center', padding:16, color:'#9ca3af' }}>Ro'yxatda yo'q</td></tr>
                : noContract.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: 11, color: '#f59e0b' }}>Shartnomasi yo'q</div>
                    </td>
                    <td className="text-sm text-muted">{c.inn}</td>
                    <td className="text-sm text-muted">{c.industry || '—'}</td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      {c.status === 'pending' && (
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => approve(c.id)}><Check size={13}/> Tasdiqlash</button>
                          <button className="btn btn-danger btn-sm" onClick={() => reject(c.id)}><X size={13}/> Rad</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
