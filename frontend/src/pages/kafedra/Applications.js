import React, { useState } from 'react';
import { Badge, Loading, Empty, Modal, PageHeader, Tabs, useApi, toArr, PersonLink } from '../../components/common';
import { appAPI, authAPI } from '../../api';
import { Check, X, Download, UserCheck } from 'lucide-react';

const downloadBlob = async (apiFn, filename) => {
  try {
    const res = await apiFn();
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch { alert('Yuklab bo\'lmadi'); }
};

export default function KafedraApplications() {
  const { data, loading, refetch } = useApi(() => appAPI.list());
  const { data: supData } = useApi(() => authAPI.supervisors());
  const supervisors = toArr(supData);

  const [tab, setTab] = useState('hr_approved');
  const all = toArr(data);
  const applications = tab === 'all' ? all : all.filter(a => a.status === tab);
  const counts = all.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  const byGroup = applications.reduce((acc, app) => {
    const g = app.student_group || 'Guruhsiz';
    if (!acc[g]) acc[g] = [];
    acc[g].push(app);
    return acc;
  }, {});

  // Batch modal: har bir talabaga alohida supervisor
  const [batchModal, setBatchModal] = useState(null);
  const [supervisorMap, setSupervisorMap] = useState({});
  const [batchNote, setBatchNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const openBatch = (group, apps) => {
    const hrApproved = apps.filter(a => a.status === 'hr_approved');
    if (!hrApproved.length) return;
    setBatchModal({ group, apps: hrApproved });
    const initMap = {};
    hrApproved.forEach(a => { initMap[a.id] = ''; });
    setSupervisorMap(initMap);
    setBatchNote('');
    setProgress({ done: 0, total: 0 });
  };

  // Barcha talabaga bir xil supervisor biriktirish (shortcut)
  const applyToAll = (supId) => {
    const newMap = {};
    Object.keys(supervisorMap).forEach(id => { newMap[id] = supId; });
    setSupervisorMap(newMap);
  };

  // Har bir talabani alohida tasdiqlash
  const batchApprove = async () => {
    if (!batchModal) return;
    setSubmitting(true);
    setProgress({ done: 0, total: batchModal.apps.length });
    let done = 0;
    let errors = 0;
    for (const app of batchModal.apps) {
      try {
        const supId = supervisorMap[app.id];
        await appAPI.kafedraApprove(app.id, {
          note: batchNote,
          ...(supId ? { supervisor_id: supId } : {}),
        });
        done++;
        setProgress(p => ({ ...p, done }));
      } catch { errors++; }
    }
    setSubmitting(false);
    setBatchModal(null);
    refetch();
    if (errors > 0) alert(`${done} ta tasdiqlandi, ${errors} ta xato.`);
  };

  const rejectOne = async () => {
    setRejectSubmitting(true);
    try {
      await appAPI.kafedraReject(rejectModal.id, { note: rejectNote });
      setRejectModal(null); setRejectNote('');
      refetch();
    } finally { setRejectSubmitting(false); }
  };

  const TABS = [
    { key: 'hr_approved',      label: 'HR tasdiqladi — kutilmoqda', count: counts.hr_approved || 0 },
    { key: 'kafedra_approved', label: 'Kafedra tasdiqladi',         count: counts.kafedra_approved || 0 },
    { key: 'completed',        label: "Yo'llanma yaratildi",        count: counts.completed || 0 },
    { key: 'all',              label: 'Hammasi',                    count: all.length },
  ];

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Arizalar"
        subtitle="Talabalar arizalarini ko'rib chiqing va har biriga amaliyot rahbar biriktiring"
      />

      <div className="card mb-3">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {Object.keys(byGroup).length === 0
        ? <Empty text="Ariza topilmadi" />
        : Object.entries(byGroup).map(([group, apps]) => {
          const hrCount = apps.filter(a => a.status === 'hr_approved').length;
          return (
            <div key={group} className="card mb-4">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3>{group} guruhi</h3>
                  <span className="text-sm text-muted">
                    {apps.length} ta ariza
                    {hrCount > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· {hrCount} ta tasdiq kutmoqda</span>}
                  </span>
                </div>
                {hrCount > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openBatch(group, apps)}
                  >
                    <UserCheck size={13}/> Rahbar biriktir va tasdiqlash
                  </button>
                )}
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Talaba</th>
                      <th>Vakansiya / Korxona</th>
                      <th>Holat</th>
                      <th>Rahbar</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map(app => (
                      <tr key={app.id}>
                        <td>
                          <PersonLink userId={app.student} name={app.student_name} role="student" />
                        </td>
                        <td className="text-sm">
                          <div>{app.vacancy_title}</div>
                          <div className="text-muted">{app.company_name}</div>
                          {app.company_has_contract === false && (
                            <div style={{ fontSize: 11, color: '#f59e0b' }}>Shartnomasi yo'q</div>
                          )}
                        </td>
                        <td><Badge status={app.status} /></td>
                        <td className="text-sm">
                          {app.assigned_supervisor_name
                            ? <PersonLink userId={app.assigned_supervisor_id} name={app.assigned_supervisor_name} role="supervisor" />
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {app.company_has_contract === false && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => downloadBlob(
                                  () => appAPI.requestLetter(app.id),
                                  `rozilik_xati_${app.student_name}.pdf`
                                )}
                                title="Rozilik xati"
                              >
                                <Download size={12}/> Rozilik
                              </button>
                            )}
                            {app.status === 'hr_approved' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => { setRejectModal(app); setRejectNote(''); }}
                              >
                                <X size={12}/> Rad
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

      {/* Batch approve modal — har bir talabaga alohida rahbar */}
      {batchModal && (
        <Modal
          open={true}
          onClose={() => !submitting && setBatchModal(null)}
          title={`${batchModal.group} — Amaliyot rahbar biriktirish`}
          footer={!submitting ? (
            <>
              <button className="btn btn-ghost" onClick={() => setBatchModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={batchApprove}>
                <Check size={13}/> {batchModal.apps.length} ta arizani tasdiqlash
              </button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Tasdiqlanmoqda... {progress.done}/{progress.total}
            </span>
          )}
        >
          {/* Hammaga bir xil rahbar biriktirish tugmasi */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Barcha talabalarga bir xil rahbar (ixtiyoriy):
            </div>
            <div className="flex gap-2">
              <select
                className="form-control"
                style={{ fontSize: 12 }}
                defaultValue=""
                onChange={e => applyToAll(e.target.value)}
              >
                <option value="">— Tanlang —</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}{s.supervisor_profile?.department ? ` (${s.supervisor_profile.department})` : ''}
                  </option>
                ))}
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => applyToAll('')}>Tozala</button>
            </div>
          </div>

          {/* Har bir talaba — o'z rahbari */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Har bir talabaga alohida rahbar:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {batchModal.apps.map(app => (
              <div key={app.id} style={{
                padding: '10px 12px',
                border: `1px solid ${supervisorMap[app.id] ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 8,
                background: supervisorMap[app.id] ? '#f0fdf4' : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{app.student_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{app.company_name}</div>
                  </div>
                  <select
                    className="form-control"
                    style={{ flex: 1, minWidth: 180, fontSize: 12 }}
                    value={supervisorMap[app.id] || ''}
                    onChange={e => setSupervisorMap(p => ({ ...p, [app.id]: e.target.value }))}
                  >
                    <option value="">— Rahbar tanlanmagan —</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}{s.supervisor_profile?.department ? ` (${s.supervisor_profile.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {supervisorMap[app.id] && (
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={11}/>
                    {supervisors.find(s => String(s.id) === String(supervisorMap[app.id]))?.full_name}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Kafedra izohi (ixtiyoriy)</label>
            <textarea
              className="form-control" rows={2}
              value={batchNote}
              onChange={e => setBatchNote(e.target.value)}
              placeholder="Kafedra majlisi qaroriga asosan..."
            />
          </div>
        </Modal>
      )}

      {/* Rad etish */}
      {rejectModal && (
        <Modal open={true} title="Arizani rad etish" onClose={() => setRejectModal(null)}>
          <p style={{ marginBottom: 10 }}>
            <strong>{rejectModal.student_name}</strong> arizasi rad etiladi.
          </p>
          <textarea
            className="form-control" rows={3}
            placeholder="Sababi..."
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <button className="btn btn-danger" onClick={rejectOne} disabled={rejectSubmitting}>
              <X size={13}/> Rad etish
            </button>
            <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Bekor</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
