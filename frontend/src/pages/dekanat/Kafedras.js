import React, { useState } from 'react';
import { Loading, Empty, PageHeader, useApi, toArr, PersonLink } from '../../components/common';
import { authAPI, appAPI, internAPI } from '../../api';
import { ArrowLeft, Users, Building2, ChevronRight } from 'lucide-react';

export default function DekanatKafedras() {
  const { data: usersData, loading: l1 } = useApi(() => authAPI.list({ role: 'kafedra' }));
  const { data: studData,  loading: l2 } = useApi(() => authAPI.list({ role: 'student' }));
  const { data: appsData }               = useApi(() => appAPI.list());
  const { data: intsData }               = useApi(() => internAPI.list());

  const kafedras  = toArr(usersData);
  const students  = toArr(studData);
  const apps      = toArr(appsData);
  const internships = toArr(intsData);

  const [active, setActive] = useState(null); // tanlangan kafedra user

  // Kafedra bo'limlari bo'yicha talabalarni hisoblash
  const getKafedraStats = (kUser) => {
    const dept = kUser.kafedra_profile?.department || '';
    const deptStudents = students.filter(s =>
      (s.student_profile?.department || s.student_profile?.direction || '') === dept
    );
    const deptApps = apps.filter(a =>
      deptStudents.some(s => s.id === a.student)
    );
    const deptInts = internships.filter(i =>
      deptStudents.some(s => s.id === i.student)
    );
    return {
      students:  deptStudents.length,
      apps:      deptApps.length,
      approved:  deptApps.filter(a => a.status === 'kafedra_approved').length,
      active:    deptInts.filter(i => i.status === 'active').length,
      completed: deptInts.filter(i => i.status === 'completed').length,
      deptStudents,
      dept,
    };
  };

  const activeStats = active ? getKafedraStats(active) : null;

  if (l1 || l2) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Kafedralar"
        subtitle={active
          ? `${active.kafedra_profile?.department || ''} kafedrasi`
          : `${kafedras.length} ta kafedra`}
        action={active && (
          <button className="btn btn-outline" onClick={() => setActive(null)}>
             Kafedralar
          </button>
        )}
      />

      {/* Kafedralar ro'yxati */}
      {!active && (
        kafedras.length === 0
          ? <Empty text="Kafedra topilmadi" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {kafedras.map(k => {
                const stats = getKafedraStats(k);
                return (
                  <div
                    key={k.id}
                    className="card"
                    onClick={() => setActive(k)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                  >
                    <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                           {k.kafedra_profile?.department || 'Noma\'lum kafedra'}
                        </div>
                        <div className="text-sm text-muted mt-1">
                          Mudiri: <PersonLink userId={k.id} name={k.full_name} role="kafedra" />
                        </div>
                        {k.kafedra_profile?.position && (
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>{k.kafedra_profile.position}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {[
                          { v: stats.students,  l: 'Talaba',     c: '#3b82f6' },
                          { v: stats.approved,  l: 'Tayyor',     c: '#10b981' },
                          { v: stats.active,    l: 'Faol amaliyot', c: '#8b5cf6' },
                          { v: stats.completed, l: 'Yakunlangan', c: '#6b7280' },
                        ].map(({ v, l, c }) => (
                          <div key={l} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: 18, color: '#9ca3af' }}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Kafedra detallari */}
      {active && activeStats && (
        <div>
          {/* Statistika kartalar */}
          <div className="stats-grid mb-4">
            {[
              { icon: '', v: activeStats.students,  l: 'Jami talaba',    c: 'blue'   },
              { icon: '', v: activeStats.approved,  l: 'Yo\'llanmaga tayyor', c: 'green' },
              { icon: '', v: activeStats.active,    l: 'Faol amaliyot',  c: 'cyan'   },
              { icon: '', v: activeStats.completed, l: 'Yakunlangan',    c: 'yellow' },
            ].map(({ icon, v, l, c }) => (
              <div key={l} className="stat-card">
                <div className={`stat-icon ${c}`}>{icon}</div>
                <div>
                  <div className="stat-val">{v}</div>
                  <div className="stat-lbl">{l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Kafedra ma'lumotlari */}
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="card">
              <div className="card-header"><h3>Kafedra ma'lumotlari</h3></div>
              <div className="card-body">
                {[
                  ['Kafedra', activeStats.dept],
                  ['Mudiri', active.full_name],
                  ['Lavozim', active.kafedra_profile?.position || '—'],
                  ['Email', active.email],
                  ['Telefon', active.phone || '—'],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#9ca3af', minWidth: 80 }}>{lbl}</span>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Guruhlar */}
            <div className="card">
              <div className="card-header"><h3>Guruhlar</h3></div>
              <div className="card-body">
                {(() => {
                  const byGroup = activeStats.deptStudents.reduce((acc, s) => {
                    const g = s.student_profile?.group || 'Guruhsiz';
                    acc[g] = (acc[g] || 0) + 1;
                    return acc;
                  }, {});
                  const entries = Object.entries(byGroup);
                  return entries.length === 0
                    ? <span className="text-muted">Talaba topilmadi</span>
                    : entries.map(([g, cnt]) => (
                      <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
                        <span> {g}</span>
                        <strong>{cnt} ta talaba</strong>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>

          {/* Talabalar jadvali */}
          <div className="card">
            <div className="card-header"><h3> Talabalar ro'yxati</h3></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Talaba</th><th>Guruh</th><th>Kurs</th><th>Email</th></tr>
                </thead>
                <tbody>
                  {activeStats.deptStudents.length === 0
                    ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Talaba topilmadi</td></tr>
                    : activeStats.deptStudents
                        .sort((a, b) => (a.student_profile?.group || '').localeCompare(b.student_profile?.group || ''))
                        .map((s, i) => (
                      <tr key={s.id}>
                        <td className="text-muted">{i + 1}</td>
                        <td><PersonLink userId={s.id} name={s.full_name} role="student" /></td>
                        <td className="text-sm">{s.student_profile?.group || '—'}</td>
                        <td className="text-sm">{s.student_profile?.course || '—'}-kurs</td>
                        <td className="text-sm text-muted">{s.email}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
