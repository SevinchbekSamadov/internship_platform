import React, { useState } from 'react';
import { Badge, Loading, Empty, Modal, PageHeader, useApi, toArr, PersonLink } from '../../components/common';
import { authAPI, appAPI, companyAPI } from '../../api';
import { Check, X, Building2, UserCheck, ChevronLeft, ArrowLeft } from 'lucide-react';

const STATUS_LABEL = {
  '':               "Ariza yo'q",
  pending:          'Ariza kutmoqda',
  hr_approved:      'HR tasdiqladi',
  hr_rejected:      'HR rad etdi',
  kafedra_approved: 'Kafedra tasdiqladi',
  kafedra_rejected: 'Kafedra rad etdi',
  sup_approved:     'Rahbar tasdiqladi',
  completed:        "Yo'llanma yaratildi",
};
const STATUS_COLOR = {
  '':               '#9ca3af',
  pending:          '#f59e0b',
  hr_approved:      '#3b82f6',
  hr_rejected:      '#ef4444',
  kafedra_approved: '#10b981',
  kafedra_rejected: '#ef4444',
  sup_approved:     '#10b981',
  completed:        '#6b7280',
};

export default function KafedraStudents() {
  const { data: studentsData, loading: l1, refetch } = useApi(() => authAPI.kafedraStudents());
  const { data: appsData,     loading: l2 }           = useApi(() => appAPI.list());
  const { data: vacData }                              = useApi(() => companyAPI.vacancies({ status: 'open' }));
  const { data: supData }                              = useApi(() => authAPI.supervisors());

  const students    = toArr(studentsData);
  const apps        = toArr(appsData);
  const vacancies   = toArr(vacData);
  const supervisors = toArr(supData);

  // Talaba  so'nggi ariza holati
  const studentStatus = {};
  apps.forEach(a => {
    if (!studentStatus[a.student] || a.status === 'kafedra_approved')
      studentStatus[a.student] = a.status;
  });

  // Guruh bo'yicha guruhlash
  const byGroup = students.reduce((acc, s) => {
    const g = s.student_profile?.group || 'Guruhsiz';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  // Tanlangan guruh
  const [activeGroup, setActiveGroup] = useState(null);

  // Amaliyot joyi modal
  const [modal,       setModal]       = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form,        setForm]        = useState({ vacancy_id: '', supervisor_id: '', note: '' });
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState(null);

  const openModal = (groupStudents) => {
    const eligible = groupStudents.filter(s => {
      const st = studentStatus[s.id];
      return !st || st === 'hr_rejected' || st === 'kafedra_rejected';
    });
    setModal({ students: eligible });
    setSelectedIds(eligible.map(s => s.id));
    setForm({ vacancy_id: '', supervisor_id: '', note: '' });
    setResult(null);
  };

  const toggleStudent = id =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const assignPlace = async () => {
    if (!form.vacancy_id || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await appAPI.kafedraAssignPlace({
        student_ids: selectedIds,
        vacancy_id:  form.vacancy_id,
        ...(form.supervisor_id && { supervisor_id: form.supervisor_id }),
        note: form.note || 'Kafedra tomonidan tayinlandi',
      });
      setResult(res.data);
      refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    } finally { setSubmitting(false); }
  };

  const vacByCompany = vacancies.reduce((acc, v) => {
    const cn = v.company_name || 'Korxona';
    if (!acc[cn]) acc[cn] = [];
    acc[cn].push(v);
    return acc;
  }, {});

  if (l1 || l2) return <Loading />;

  const groups = Object.entries(byGroup);
  const activeStudents = activeGroup ? byGroup[activeGroup] || [] : [];
  const eligibleCount  = activeGroup
    ? activeStudents.filter(s => {
        const st = studentStatus[s.id];
        return !st || st === 'hr_rejected' || st === 'kafedra_rejected';
      }).length
    : 0;

  return (
    <div className="page">
      <PageHeader
        title=" Talabalar"
        subtitle={activeGroup ? `${activeGroup} guruhi` : `${groups.length} ta guruh · ${students.length} ta talaba`}
        action={activeGroup && (
          <button className="btn btn-outline" onClick={() => setActiveGroup(null)}>
             Guruhlar ro'yxati
          </button>
        )}
      />

      {/*  Guruhlar ro'yxati  */}
      {!activeGroup && (
        groups.length === 0 ? (
          <Empty text="Kafedrangizda talaba topilmadi. Admin orqali Excel import qiling." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {groups.map(([group, groupStudents]) => {
              const total    = groupStudents.length;
              const assigned = groupStudents.filter(s => studentStatus[s.id] === 'kafedra_approved' || studentStatus[s.id] === 'completed').length;
              const noApp    = groupStudents.filter(s => !studentStatus[s.id]).length;
              const pct      = total ? Math.round(assigned / total * 100) : 0;

              return (
                <div
                  key={group}
                  className="card"
                  onClick={() => setActiveGroup(group)}
                  style={{ cursor: 'pointer', transition: 'box-shadow .15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                  <div style={{ padding: '20px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}> {group}</div>
                        <div className="text-sm text-muted mt-1">{total} ta talaba</div>
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: pct === 100 ? '#d1fae5' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: pct === 100 ? '#065f46' : '#1d4ed8',
                      }}>
                        {pct}%
                      </div>
                    </div>

                    {/* Progress */}
                    <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', marginBottom: 10 }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: pct === 100 ? '#10b981' : '#3b82f6',
                        width: `${pct}%`, transition: 'width .3s',
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#10b981' }}> {assigned} tayyor</span>
                      <span style={{ color: noApp > 0 ? '#f59e0b' : '#9ca3af' }}>
                        {noApp > 0 ? ` ${noApp} joysiz` : ' Hammasi tayyor'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/*  Guruh talabalari  */}
      {activeGroup && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{activeGroup} guruhi</h3>
              <span className="text-sm text-muted">{activeStudents.length} ta talaba</span>
            </div>
            {eligibleCount > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => openModal(activeStudents)}
              >
                 Amaliyot joyi biriktirish ({eligibleCount} ta)
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talaba</th>
                  <th>Student ID</th>
                  <th>Kurs</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((s, idx) => {
                  const st = studentStatus[s.id] || '';
                  return (
                    <tr key={s.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>
                        <PersonLink userId={s.id} name={s.full_name} role="student" />
                      </td>
                      <td className="text-sm text-muted">{s.student_profile?.student_id || '—'}</td>
                      <td className="text-sm">{s.student_profile?.course || '—'}-kurs</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[st] }}>
                           {STATUS_LABEL[st] || st}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/*  Amaliyot joyi modal  */}
      {modal && (
        <Modal
          open={true}
          onClose={() => { setModal(null); setResult(null); }}
          title={` ${activeGroup} — Amaliyot joyi biriktirish`}
          footer={!result ? (
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Bekor</button>
              <button
                className="btn btn-primary"
                onClick={assignPlace}
                disabled={submitting || !form.vacancy_id || selectedIds.length === 0}
              >
                {submitting ? '...' : ` ${selectedIds.length} ta talabaga biriktirish`}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => { setModal(null); setResult(null); }}>
              Yopish
            </button>
          )}
        >
          {result ? (
            <div>
              <div className="alert alert-success">
                 <strong>{result.created_count}</strong> ta talabaga amaliyot joyi biriktirildi.
              </div>
              <p className="text-sm text-muted mt-2">
                Dekanat endi yo'llanma yarata oladi.
              </p>
            </div>
          ) : (
            <>
              {/* Talabalar */}
              <div className="form-group">
                <label className="form-label">
                  Talabalar ({modal.students.length} ta joysiz)
                </label>
                <div style={{
                  maxHeight: 160, overflowY: 'auto',
                  border: '1px solid #e5e7eb', borderRadius: 6,
                }}>
                  {modal.students.map(s => (
                    <label key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer', fontSize: 13,
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <span style={{ flex: 1 }}><strong>{s.full_name}</strong></span>
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        {s.student_profile?.student_id}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vakansiya */}
              <div className="form-group">
                <label className="form-label">Amaliyot joyi (Korxona / Vakansiya) *</label>
                <select
                  className="form-control"
                  value={form.vacancy_id}
                  onChange={e => setForm(p => ({ ...p, vacancy_id: e.target.value }))}
                >
                  <option value="">— Vakansiya tanlang —</option>
                  {Object.entries(vacByCompany).map(([company, vacs]) => (
                    <optgroup key={company} label={company}>
                      {vacs.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.title}
                          {v.available_slots != null ? ` (${v.available_slots} joy)` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Rahbar */}
              <div className="form-group">
                <label className="form-label">Amaliyot rahbar (ixtiyoriy)</label>
                <select
                  className="form-control"
                  value={form.supervisor_id}
                  onChange={e => setForm(p => ({ ...p, supervisor_id: e.target.value }))}
                >
                  <option value="">— Tanlang —</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                      {s.supervisor_profile?.department ? ` — ${s.supervisor_profile.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Izoh */}
              <div className="form-group">
                <label className="form-label">Izoh</label>
                <input
                  className="form-control"
                  value={form.note}
                  placeholder="Kafedra yig'ilishi asosida tayinlandi"
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                />
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
