import React, { useState } from 'react';
import { Loading, Empty, PageHeader, useApi, toArr, PersonLink } from '../../components/common';
import { authAPI, appAPI } from '../../api';
import { ArrowLeft, Users, Search } from 'lucide-react';

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

export default function DekanatStudents() {
  const { data: studentsData, loading: l1 } = useApi(() => authAPI.kafedraStudents());
  const { data: appsData,     loading: l2 } = useApi(() => appAPI.list());

  const students = toArr(studentsData);
  const apps     = toArr(appsData);

  const studentStatus = {};
  apps.forEach(a => {
    if (!studentStatus[a.student] || a.status === 'kafedra_approved')
      studentStatus[a.student] = a.status;
  });

  const byGroup = students.reduce((acc, s) => {
    const g = s.student_profile?.group || 'Guruhsiz';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  const [activeGroup, setActiveGroup] = useState(null);
  const [search, setSearch] = useState('');

  const groups = Object.entries(byGroup);
  const activeStudents = activeGroup
    ? (byGroup[activeGroup] || []).filter(s =>
        !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.student_profile?.student_id || '').toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (l1 || l2) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title=" Talabalar"
        subtitle={activeGroup
          ? `${activeGroup} guruhi`
          : `${groups.length} ta guruh · ${students.length} ta talaba`}
        action={activeGroup && (
          <button className="btn btn-outline" onClick={() => { setActiveGroup(null); setSearch(''); }}>
             Guruhlar
          </button>
        )}
      />

      {/* Guruhlar ro'yxati */}
      {!activeGroup && (
        groups.length === 0
          ? <Empty text="Talaba topilmadi" />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
              {groups.map(([group, gs]) => {
                const total    = gs.length;
                const assigned = gs.filter(s =>
                  ['kafedra_approved','sup_approved','completed'].includes(studentStatus[s.id])
                ).length;
                const pct = total ? Math.round(assigned / total * 100) : 0;
                const dept = gs[0]?.student_profile?.direction || gs[0]?.student_profile?.department || '';

                return (
                  <div
                    key={group}
                    className="card"
                    onClick={() => setActiveGroup(group)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                  >
                    <div style={{ padding: '18px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}> {group}</div>
                          <div className="text-sm text-muted">{total} ta talaba</div>
                          {dept && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{dept}</div>}
                        </div>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: pct === 100 ? '#d1fae5' : '#eff6ff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          color: pct === 100 ? '#065f46' : '#1d4ed8',
                        }}>
                          {pct}%
                        </div>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: '#e5e7eb', marginBottom: 8 }}>
                        <div style={{
                          height: '100%', borderRadius: 3, width: `${pct}%`,
                          background: pct === 100 ? '#10b981' : '#3b82f6',
                        }} />
                      </div>
                      <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#10b981' }}> {assigned} tayyor</span>
                        <span style={{ color: '#9ca3af' }}>{total - assigned} qoldi</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Guruh talabalari */}
      {activeGroup && (
        <div className="card">
          <div className="card-header" style={{ gap: 12 }}>
            <h3>{activeGroup} — talabalar ro'yxati</h3>
            <input
              className="form-control"
              style={{ maxWidth: 240, padding: '5px 10px', fontSize: 13 }}
              placeholder="Ism yoki ID bo'yicha qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talaba</th>
                  <th>Student ID</th>
                  <th>Yunalish</th>
                  <th>Kurs</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Talaba topilmadi</td></tr>
                  : activeStudents.map((s, idx) => {
                    const st = studentStatus[s.id] || '';
                    return (
                      <tr key={s.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td><PersonLink userId={s.id} name={s.full_name} role="student" /></td>
                        <td className="text-sm text-muted">{s.student_profile?.student_id || '—'}</td>
                        <td className="text-sm text-muted" style={{ maxWidth: 180 }}>
                          {s.student_profile?.direction || s.student_profile?.department || '—'}
                        </td>
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
    </div>
  );
}
