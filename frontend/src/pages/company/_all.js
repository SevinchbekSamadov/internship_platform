import React, { useState } from 'react';
import { Badge, StatCard, Loading, Empty, Modal, Progress, PageHeader, Tabs, useApi, toArr } from '../../components/common';
import { companyAPI, appAPI, internAPI, docAPI, logbookAPI, authAPI, orderAPI } from '../../api';
import { Check, X, Send, Download, Eye, Plus, FileText, UserCheck, Upload, RefreshCw, ClipboardList, Clock, Users, CheckCircle, Award, Briefcase, AlertCircle } from 'lucide-react';

//  Dashboard 
export function CompanyDashboard() {
  const { data: company, loading } = useApi(() => companyAPI.my());
  const { data: apps } = useApi(() => appAPI.list());
  const { data: ints } = useApi(() => internAPI.list());

  const applications = toArr(apps);
  const internships = toArr(ints);
  const pending = applications.filter(a => a.status === 'pending').length;

  if (loading) return <Loading />;
  if (!company) return (
    <div className="page"><Empty text="Korxona profili topilmadi. Admin bilan bog'laning." /></div>
  );

  return (
    <div className="page">
      <PageHeader title={company.name} subtitle="Korxona paneli" />
      <div className="stats-grid">
        <StatCard icon={ClipboardList} value={applications.length} label="Jami arizalar" color="blue" />
        <StatCard icon={Clock} value={pending} label="Yangi arizalar" color="yellow" />
        <StatCard icon={Users} value={internships.length} label="Amaliyotchilar" color="green" />
        <StatCard icon={CheckCircle} value={internships.filter(i => i.status === 'active').length} label="Faol amaliyot" color="cyan" />
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-header"><h3>Korxona ma'lumotlari</h3></div>
          <div className="card-body text-sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><span className="text-muted" style={{ width: 120, display: 'inline-block' }}>Soha:</span><strong>{company.industry}</strong></div>
              <div><span className="text-muted" style={{ width: 120, display: 'inline-block' }}>Manzil:</span>{company.address}</div>
              <div><span className="text-muted" style={{ width: 120, display: 'inline-block' }}>Shartnoma:</span>
                {company.has_contract
                  ? <span className="badge badge-green"> Mavjud</span>
                  : <span className="badge badge-yellow"> Yo'q</span>}
              </div>
              <div><span className="text-muted" style={{ width: 120, display: 'inline-block' }}>Holat:</span><Badge status={company.status} /></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Yangi arizalar</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {applications.filter(a => a.status === 'pending').slice(0, 5).map(a => (
              <div key={a.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <strong>{a.student_name}</strong>
                <span className="text-muted" style={{ marginLeft: 8 }}> {a.vacancy_title}</span>
              </div>
            ))}
            {applications.filter(a => a.status === 'pending').length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Yangi ariza yo'q</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

//  Vacancies 
export function CompanyVacancies() {
  const { data, loading, refetch } = useApi(() => companyAPI.vacancies());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requirements: '', slots: 1, duration_weeks: 8, is_paid: false, salary: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSubmitting(true); setErr('');
    try {
      await companyAPI.createVacancy(form);
      setShowModal(false);
      setForm({ title: '', description: '', requirements: '', slots: 1, duration_weeks: 8, is_paid: false, salary: '' });
      refetch();
    } catch (e) { setErr(e.response?.data?.detail || 'Xatolik'); }
    finally { setSubmitting(false); }
  };

  const vacancies = toArr(data);
  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Vakansiyalar" subtitle={`${vacancies.length} ta vakansiya`}
        action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>+<Plus size={14}/> Yangi vakansiya</button>} />

      {vacancies.length === 0 ? <Empty text="Hali vakansiya yaratilmagan" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vacancies.map(v => (
            <div key={v.id} className="card">
              <div style={{ padding: '15px 18px' }}>
                <div className="flex-between mb-3">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{v.title}</div>
                    <div className="text-sm text-muted mt-1"> {v.duration_weeks} hafta ·  {v.available_slots}/{v.slots} joy</div>
                  </div>
                  <Badge status={v.status} />
                </div>
                <p className="text-sm text-muted">{v.description?.slice(0, 150)}</p>
                {v.is_paid && v.salary && (
                  <div style={{ marginTop: 8, color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>
                     {Number(v.salary).toLocaleString()} so'm/oy
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yangi vakansiya"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Bekor</button>
          <button className="btn btn-primary" disabled={submitting} onClick={save}>
            {submitting ? 'Saqlanmoqda...' : ' Saqlash'}
          </button>
        </>}>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="form-group">
          <label className="form-label">Vakansiya nomi *</label>
          <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tavsif *</label>
          <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Talablar</label>
          <textarea className="form-control" rows={2} value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} />
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Bo'sh joylar</label>
            <input type="number" className="form-control" min={1} value={form.slots} onChange={e => setForm(p => ({ ...p, slots: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Davomiyligi (hafta)</label>
            <input type="number" className="form-control" min={1} value={form.duration_weeks} onChange={e => setForm(p => ({ ...p, duration_weeks: e.target.value }))} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" checked={form.is_paid} onChange={e => setForm(p => ({ ...p, is_paid: e.target.checked }))} />
          Haq to'lanadigan amaliyot
        </label>
        {form.is_paid && (
          <div className="form-group">
            <label className="form-label">Oylik to'lov (so'm)</label>
            <input type="number" className="form-control" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} />
          </div>
        )}
      </Modal>
    </div>
  );
}

//  Applications 
export function CompanyApplications() {
  const { data: companyData } = useApi(() => companyAPI.my());
  const { data, loading, refetch } = useApi(() => appAPI.list());
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const company = companyData || {};
  const hasContract = company.has_contract;
  const apps = toArr(data);
  const counts = apps.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
  const filtered = tab === 'all' ? apps : apps.filter(a => a.status === tab);

  const doAction = async () => {
    setSubmitting(true);
    try {
      if (action === 'approve') await appAPI.hrApprove(selected.id, { note });
      else await appAPI.hrReject(selected.id, { note });
      setSelected(null); setNote(''); refetch();
    } finally { setSubmitting(false); }
  };

  const downloadLetter = async (app) => {
    setDownloading(app.id);
    try {
      const res = await appAPI.requestLetter(app.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rozilik_xati_${app.student_name}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('Yuklab bo\'lmadi'); }
    finally { setDownloading(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Arizalar" subtitle="Vakansiyalarga kelgan arizalar" />

      {/* Shartnoma yo'q ogohlantirish */}
      {hasContract === false && (
        <div className="alert alert-warning mb-4" style={{ fontSize: 13 }}>
           <strong>Universitetingiz bilan rasmiy shartnoma yo'q.</strong><br />
          Talabani tasdiqlaganda <strong>Rozilik xati</strong> yaratiladi va kafedaga yuboriladi.
          Kafedra so'rov xati asosida arizani ko'rib chiqadi.
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'pending',      label: 'Yangi',         count: counts.pending || 0 },
            { key: 'hr_approved',  label: 'Tasdiqlandi',   count: counts.hr_approved || 0 },
            { key: 'hr_rejected',  label: 'Rad etildi',    count: counts.hr_rejected || 0 },
            { key: 'all',          label: 'Hammasi',       count: apps.length },
          ]} active={tab} onChange={setTab} />
        </div>
        {filtered.length === 0 ? <Empty text="Ariza topilmadi" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Talaba</th><th>Vakansiya</th><th>Sana</th><th>Holat</th><th>Amal</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.student_name}</strong>
                      {!hasContract && a.status === 'hr_approved' && (
                        <div style={{ fontSize: 11, color: '#f59e0b' }}> Rozilik xati yuborildi</div>
                      )}
                    </td>
                    <td>{a.vacancy_title}</td>
                    <td className="text-sm text-muted">{new Date(a.created_at).toLocaleDateString('uz-UZ')}</td>
                    <td><Badge status={a.status} /></td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {a.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => { setSelected(a); setAction('approve'); setNote(''); }}> Qabul</button>
                            <button className="btn btn-danger btn-sm" onClick={() => { setSelected(a); setAction('reject'); setNote(''); }}><X size={13}/> Rad</button>
                          </>
                        )}
                        {!hasContract && a.status === 'hr_approved' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => downloadLetter(a)}
                            disabled={downloading === a.id}
                            title="Rozilik xati PDF"
                          >
                            {downloading === a.id ? '' : ' So\'rov xati'}
                          </button>
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

      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={action === 'approve' ? ' Arizani tasdiqlash' : ' Arizani rad etish'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Bekor</button>
          <button className={`btn ${action === 'approve' ? 'btn-success' : 'btn-danger'}`}
            disabled={submitting} onClick={doAction}>
            {submitting ? '...' : action === 'approve' ? 'Tasdiqlash' : 'Rad etish'}
          </button>
        </>}>

        {action === 'approve' && !hasContract && (
          <div className="alert alert-warning mb-3" style={{ fontSize: 13 }}>
             <strong>Rozilik xati avtomatik yaratiladi.</strong><br />
            Tasdiqlagandan so'ng PDF yuklab olib kafedaga yuborishingiz mumkin.
          </div>
        )}

        <p className="text-sm text-muted mb-3">
          Talaba: <strong>{selected?.student_name}</strong>
        </p>
        <div className="form-group">
          <label className="form-label">Izoh</label>
          <textarea className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

//  Internships
export function CompanyInternships() {
  const { data, loading, refetch } = useApi(() => internAPI.list());
  const { data: mentorsData } = useApi(() => companyAPI.mentors());
  const { data: ordersData, refetch: refetchOrders } = useApi(() => orderAPI.list());
  const [mentorModal, setMentorModal] = useState(null);
  const [mentorId, setMentorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderCreating, setOrderCreating] = useState(null);
  const [orderDownloading, setOrderDownloading] = useState(null);

  const internships = toArr(data);
  const mentors = toArr(mentorsData);
  const orders = toArr(ordersData);
  // Buyruq yuborilgan internship IDlari
  const sentOrderIds = new Set(orders.filter(o => o.status === 'sent').map(o => o.internship));

  const assignMentor = async () => {
    setSubmitting(true);
    try {
      await internAPI.assignMentor(mentorModal.id, { mentor_id: mentorId });
      setMentorModal(null); setMentorId(''); refetch();
    } finally { setSubmitting(false); }
  };

  const activate = async (id) => {
    await internAPI.activate(id);
    refetch();
  };

  const createOrder = async (internshipId) => {
    setOrderCreating(internshipId);
    try {
      await orderAPI.createAndSend({ internship_id: internshipId });
      refetchOrders();
      alert('Buyruq yaratildi va universitetga yuborildi!');
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setOrderCreating(null); }
  };

  const downloadOrder = async (internshipId) => {
    const order = orders.find(o => o.internship === internshipId && o.status === 'sent');
    if (!order) return;
    setOrderDownloading(internshipId);
    try {
      const res = await orderAPI.download(order.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `buyruq_${order.student_name}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('Yuklab bo\'lmadi'); }
    finally { setOrderDownloading(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Amaliyotchilar" subtitle={`${internships.length} ta talaba`} />

      {internships.length === 0 ? <Empty text="Hozircha amaliyotchi yo'q" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {internships.map(i => (
            <div key={i.id} className="card">
              <div style={{ padding: '15px 18px' }}>
                <div className="flex-between mb-3">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{i.student_name}</div>
                    <div className="text-sm text-muted mt-1">{i.position}</div>
                  </div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <Badge status={i.status} />
                    {i.status === 'pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => activate(i.id)}>Faollashtir</button>
                    )}
                    <button className="btn btn-outline btn-sm"
                      onClick={() => { setMentorModal(i); setMentorId(''); }}>
                      Mentor
                    </button>
                    {/* Buyruq yaratish — amaliyot active bo'lganda */}
                    {i.status === 'active' && (
                      sentOrderIds.has(i.id) ? (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => downloadOrder(i.id)}
                          disabled={orderDownloading === i.id}
                          title="Buyruq PDF yuklab olish"
                        >
                          {orderDownloading === i.id ? '...' : 'Buyruq PDF'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => createOrder(i.id)}
                          disabled={orderCreating === i.id}
                          title="Buyruq yaratib universitetga yuborish"
                        >
                          {orderCreating === i.id ? '...' : 'Buyruq yaratish'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-muted mb-3" style={{ flexWrap: 'wrap' }}>
                  <span>{i.start_date} — {i.end_date}</span>
                  {i.mentor_name
                    ? <span style={{ color: 'var(--success)' }}>Mentor: {i.mentor_name}</span>
                    : <span style={{ color: 'var(--warning)' }}>Mentor biriktirilmagan</span>}
                  {i.supervisor_name && <span>Rahbar: {i.supervisor_name}</span>}
                  {sentOrderIds.has(i.id) && (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Buyruq yuborildi</span>
                  )}
                </div>

                {i.status === 'active' && <Progress value={i.progress_percent} />}

                {i.final_grade && (
                  <div className="alert alert-success mt-3">
                     Yakuniy baho: <strong>{i.final_grade} ({i.final_grade_letter})</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!mentorModal} onClose={() => setMentorModal(null)}
        title={` Mentor tayinlash — ${mentorModal?.student_name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setMentorModal(null)}>Bekor</button>
          <button className="btn btn-primary" disabled={!mentorId || submitting} onClick={assignMentor}>
            {submitting ? '...' : ' Tayinlash'}
          </button>
        </>}>
        {mentors.length === 0 ? (
          <div className="alert alert-warning"> Avval "Mentorlar" bo'limida mentor qo'shing.</div>
        ) : (
          <div className="form-group">
            <label className="form-label">Mentorni tanlang</label>
            <select className="form-control" value={mentorId} onChange={e => setMentorId(e.target.value)}>
              <option value="">— Tanlang —</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.user_name} — {m.position}</option>)}
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}

//  Documents (Yo'llanmalar) 
export function CompanyDocuments() {
  const { data, loading, refetch } = useApi(() => docAPI.list());
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [qrModal, setQrModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('sent');

  const mediaUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8000${path}`;

  const docs = toArr(data);
  const counts = docs.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});
  const filtered = tab === 'all' ? docs : docs.filter(d => d.status === tab);

  const accept = async (id) => {
    try {
      await docAPI.companyAccept(id);
      refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    }
  };

  const reject = async () => {
    setSubmitting(true);
    try {
      await docAPI.companyReject(rejectModal, { note: rejectNote });
      setRejectModal(null); setRejectNote(''); refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Yo'llanmalar" subtitle="Dekanatdan kelgan yo'llanma hujjatlari" />

      {docs.filter(d => d.status === 'sent').length > 0 && (
        <div className="alert alert-warning mb-4">
           <strong>{docs.filter(d => d.status === 'sent').length} ta yo'llanma</strong> sizning tasdiqlashingizni kutmoqda!
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={[
            { key: 'sent', label: 'Kutilmoqda', count: counts.sent || 0 },
            { key: 'company_accepted', label: 'Qabul qilingan', count: counts.company_accepted || 0 },
            { key: 'rejected', label: 'Rad etilgan', count: counts.rejected || 0 },
            { key: 'all', label: 'Hammasi', count: docs.length },
          ]} active={tab} onChange={setTab} />
        </div>

        {filtered.length === 0 ? (
          <Empty text={tab === 'sent' ? "Kutilayotgan yo'llanma yo'q" : "Yo'llanma topilmadi"} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            {filtered.map(d => (
              <div key={d.id} style={{
                border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px',
                background: d.status === 'sent' ? '#fffbeb' : '#fff'
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {d.qr_code && (
                    <img
                      src={mediaUrl(d.qr_code)}
                      alt="QR kod"
                      onClick={() => setQrModal(d)}
                      style={{ width: 80, height: 80, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }}
                      title="QR kodni ko'rish"
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="flex-between mb-3">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{d.student_name}</div>
                        <div className="text-sm text-muted mt-1">
                          {d.internship_data?.position && <span> {d.internship_data.position} · </span>}
                          {d.internship_data?.start_date && (
                            <span> {d.internship_data.start_date} — {d.internship_data.end_date}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <Badge status={d.status} />
                        {d.qr_code && (
                          <button className="btn btn-outline btn-sm" onClick={() => setQrModal(d)}> QR</button>
                        )}
                        {d.status === 'sent' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => accept(d.id)}> Qabul qilish</button>
                            <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(d.id); setRejectNote(''); }}><X size={13}/> Rad etish</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted">
                       {d.unique_id?.slice(0, 8)}...
                      {d.sent_at && <span style={{ marginLeft: 12 }}> Yuborildi: {new Date(d.sent_at).toLocaleDateString('uz-UZ')}</span>}
                      {d.accepted_at && <span style={{ marginLeft: 12, color: 'var(--success)' }}> Qabul: {new Date(d.accepted_at).toLocaleDateString('uz-UZ')}</span>}
                    </div>
                    {d.reject_note && (
                      <div className="alert alert-error mt-2" style={{ fontSize: 13 }}>Sabab: {d.reject_note}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Yo'llanmani rad etish"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Bekor</button>
          <button className="btn btn-danger" disabled={submitting} onClick={reject}>
            {submitting ? '...' : 'Rad etish'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Rad etish sababi</label>
          <textarea className="form-control" rows={3} value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Masalan: joy to'ldi, talablar mos emas..." />
        </div>
      </Modal>

      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Yo'llanma QR Kodi">
        {qrModal && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <img
              src={mediaUrl(qrModal.qr_code)}
              alt="QR kod"
              style={{ width: 240, height: 240, margin: '0 auto 16px', display: 'block', border: '2px solid #e5e7eb', borderRadius: 10 }}
            />
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{qrModal.student_name}</div>
            <div className="text-sm text-muted mb-3">{qrModal.company_name}</div>
            {qrModal.internship_data && (
              <div className="text-sm text-muted mb-3">
                 {qrModal.internship_data.position} ·  {qrModal.internship_data.start_date} — {qrModal.internship_data.end_date}
              </div>
            )}
            <Badge status={qrModal.status} />
            <div className="text-sm text-muted mt-3" style={{ fontSize: 11 }}>
              Bu QR kodni skaner qilib yo'llanmaning haqiqiyligini tekshirish mumkin
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

//  Mentors 
export function CompanyMentors() {
  const { data, loading, refetch } = useApi(() => companyAPI.mentors());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_email: '', position: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const mentors = toArr(data);

  const save = async () => {
    setSubmitting(true); setErr('');
    try {
      await companyAPI.createMentor(form);
      setShowModal(false);
      setForm({ user_email: '', position: '' });
      refetch();
    } catch (e) { setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Xatolik'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Mentorlar" subtitle={`${mentors.length} ta mentor`}
        action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Mentor qo'shish</button>} />

      {mentors.length === 0 ? <Empty text="Hali mentor yo'q" /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ism</th><th>Email</th><th>Lavozim</th></tr>
              </thead>
              <tbody>
                {mentors.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.user_name}</strong></td>
                    <td className="text-sm text-muted">{m.user_email}</td>
                    <td className="text-sm">{m.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Mentor qo'shish"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Bekor</button>
          <button className="btn btn-primary" disabled={submitting} onClick={save}>
            {submitting ? '...' : ' Saqlash'}
          </button>
        </>}>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="alert alert-info mb-3">
          ℹ Mentor avval tizimda ro'yxatdan o'tgan bo'lishi kerak (mentor roli bilan).
        </div>
        <div className="form-group">
          <label className="form-label">Mentor email</label>
          <input type="email" className="form-control" placeholder="mentor@company.uz"
            value={form.user_email} onChange={e => setForm(p => ({ ...p, user_email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Lavozimi</label>
          <input className="form-control" placeholder="Senior Developer"
            value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}


//  Logbooks 
export function CompanyLogbooks() {
  const { data, loading, refetch } = useApi(() => logbookAPI.list());
  const [rejectModal, setRejectModal] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const logbooks = toArr(data);
  const pending  = logbooks.filter(lb => lb.status === 'pending');
  const others   = logbooks.filter(lb => lb.status !== 'pending');

  const approve = async (lb) => {
    setSubmitting(true);
    try { await logbookAPI.hrApprove(lb.id, {}); refetch(); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    setSubmitting(true);
    try { await logbookAPI.hrReject(rejectModal.id, { note }); setRejectModal(null); setNote(''); refetch(); }
    finally { setSubmitting(false); }
  };

  const downloadPdf = async (lb) => {
    setDownloading(lb.id);
    try {
      const res = await logbookAPI.download(lb.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kundalik_daftar_${lb.student_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Yuklab olishda xatolik'); }
    finally { setDownloading(null); }
  };

  const statusColor = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', draft: '#9ca3af' };
  const statusLabel = { pending: 'Tasdiq kutilmoqda', approved: 'Tasdiqlandi', rejected: 'Rad etildi', draft: 'Qoralama' };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Kundalik daftarlar" subtitle={`${pending.length} ta tasdiq kutilmoqda`} />
      {logbooks.length === 0 ? <Empty text="Hali kundalik daftar yuborilmagan" /> : (
        <>
          {pending.length > 0 && (
            <div className="card mb-4">
              <div className="card-header"><h3>Tasdiq kutilayotganlar</h3></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Talaba</th><th>Kundaliklar</th><th>Soat</th><th>Amallar</th></tr></thead>
                  <tbody>
                    {pending.map(lb => (
                      <tr key={lb.id}>
                        <td><strong>{lb.student_name}</strong></td>
                        <td>{lb.total_logs} ta</td>
                        <td>{lb.total_hours}h</td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => downloadPdf(lb)}
                              disabled={downloading === lb.id}
                            >
                              {downloading === lb.id ? '' : ' Ko\'rish'}
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => approve(lb)} disabled={submitting}><Check size={13}/> Tasdiqlash</button>
                            <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(lb); setNote(''); }}><X size={13}/> Rad</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="card">
              <div className="card-header"><h3>Barcha daftarlar</h3></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Talaba</th><th>Kundaliklar</th><th>Soat</th><th>Holat</th><th>Amal</th></tr></thead>
                  <tbody>
                    {others.map(lb => (
                      <tr key={lb.id}>
                        <td><strong>{lb.student_name}</strong></td>
                        <td>{lb.total_logs} ta</td>
                        <td>{lb.total_hours}h</td>
                        <td><span style={{ color: statusColor[lb.status], fontWeight: 600, fontSize: 12 }}> {statusLabel[lb.status]}</span></td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => downloadPdf(lb)}
                            disabled={downloading === lb.id}
                          >
                            {downloading === lb.id ? '' : ' Yuklab olish'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {rejectModal && (
        <Modal open={true} title="Rad etish" onClose={() => setRejectModal(null)}>
          <textarea className="form-control" rows={3} placeholder="Sababi..." value={note} onChange={e => setNote(e.target.value)} style={{ marginTop: 10 }} />
          <div className="flex gap-2 mt-3">
            <button className="btn btn-danger" onClick={reject} disabled={submitting}><X size={13}/> Rad etish</button>
            <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Bekor</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
