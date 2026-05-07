import React, { useState } from 'react';
import { Badge, Loading, Empty, Modal, Progress, PageHeader, useApi, toArr, GradeBadge } from '../../components/common';
import { internAPI, authAPI } from '../../api';
import { UserCheck, Check, X, ChevronLeft } from 'lucide-react';

export default function KafedraInternships() {
  const { data, loading, refetch } = useApi(() => internAPI.list());
  const { data: supData } = useApi(() => authAPI.supervisors());
  const supervisors = toArr(supData);

  const [assignModal, setAssignModal] = useState(null);
  const [supervisorId, setSupervisorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const internships = toArr(data);

  const [successMsg, setSuccessMsg] = useState('');

  const assignSupervisor = async () => {
    if (!supervisorId) return;
    setSubmitting(true);
    try {
      const res = await internAPI.kafedraAssignSupervisor(assignModal.id, { supervisor_id: String(supervisorId) });
      setSuccessMsg(res.data.message || 'Tayinlandi');
      setTimeout(() => {
        setAssignModal(null);
        setSupervisorId('');
        setSuccessMsg('');
        refetch();
      }, 1200);
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik yuz berdi');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader title="Amaliyotchilar" subtitle="Kafedra talabalarining amaliyotlari" />

      {internships.length === 0 ? (
        <Empty text="Amaliyotchi topilmadi" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {internships.map(i => (
            <div key={i.id} className="card">
              <div style={{ padding: '15px 18px' }}>
                <div className="flex-between mb-2">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{i.student_name}</div>
                    <div className="text-sm text-muted mt-1">
                      {i.company_name} · {i.position}
                    </div>
                    <div className="text-sm text-muted">
                      {i.start_date} — {i.end_date}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge status={i.status} />
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setAssignModal(i); setSupervisorId(String(i.supervisor || '')); setSuccessMsg(''); }}
                    >
                       Rahbar biriktir
                    </button>
                  </div>
                </div>

                {i.supervisor_name && (
                  <div className="text-sm" style={{ marginTop: 6 }}>
                    <span className="text-muted">Amaliyot rahbar: </span>
                    <strong>{i.supervisor_name}</strong>
                  </div>
                )}
                {i.mentor_name && (
                  <div className="text-sm mt-1">
                    <span className="text-muted">Mentor: </span>
                    <strong>{i.mentor_name}</strong>
                  </div>
                )}

                {i.status === 'active' && (
                  <div style={{ marginTop: 10 }}>
                    <Progress value={i.progress_percent} />
                  </div>
                )}

                {i.final_grade && (
                  <div className="mt-3">
                    <span className="text-sm text-muted">Yakuniy baho: </span>
                    <GradeBadge score={i.final_grade} letter={i.final_grade_letter} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {assignModal && (
        <Modal open={true} title="Amaliyot rahbar biriktirish" onClose={() => { setAssignModal(null); setSuccessMsg(''); }}>
          {successMsg ? (
            <div className="alert alert-success" style={{ textAlign: 'center', fontSize: 15 }}>
               {successMsg}
            </div>
          ) : (
            <>
              <p className="mb-3">
                <strong>{assignModal.student_name}</strong> uchun amaliyot rahbar tanlang:
              </p>
              {assignModal.supervisor_name && (
                <div className="alert alert-info mb-3" style={{ fontSize: 13 }}>
                  Hozirgi rahbar: <strong>{assignModal.supervisor_name}</strong>
                </div>
              )}
              <select
                className="form-control"
                value={supervisorId}
                onChange={e => setSupervisorId(e.target.value)}
              >
                <option value="">— Rahbarni tanlang —</option>
                {supervisors.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.full_name}
                    {s.supervisor_profile?.department ? ` — ${s.supervisor_profile.department}` : ''}
                  </option>
                ))}
              </select>
              {supervisors.length === 0 && (
                <div className="text-sm text-muted mt-2"> Yuklanmoqda...</div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-primary"
                  onClick={assignSupervisor}
                  disabled={submitting || !supervisorId}
                >
                  {submitting ? ' Saqlanmoqda...' : ' Biriktirish'}
                </button>
                <button className="btn btn-outline" onClick={() => { setAssignModal(null); setSuccessMsg(''); }}>
                  Bekor
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
