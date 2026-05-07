import React, { useState } from 'react';
import { Badge, Loading, Empty, Modal, PageHeader, useApi, toArr } from '../../components/common';
import { reportAPI, internAPI } from '../../api';
import { Star, Check, X } from 'lucide-react';

export default function MentorReports() {
  const { data, loading, refetch } = useApi(() => reportAPI.list());
  const { data: intsData }         = useApi(() => internAPI.list());
  const [selected, setSelected]    = useState(null);
  const [grade, setGrade]          = useState('');
  const [comment, setComment]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reports    = toArr(data);
  const internships = toArr(intsData);

  const getInternship = (r) => internships.find(i => i.id === r.internship);

  const submitted = reports.filter(r => r.status === 'submitted');
  const others    = reports.filter(r => r.status !== 'submitted');

  const giveGrade = async () => {
    if (!grade) return;
    setSubmitting(true);
    try {
      const intern = getInternship(selected);
      if (intern && grade) {
        await internAPI.setMentorGrade(intern.id, { grade, comment });
      }
      setSelected(null); setGrade(''); setComment('');
      refetch();
    } catch (e) {
      alert(e.response?.data?.error || 'Xatolik');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Amaliyot hisobotlari"
        subtitle={`${submitted.length} ta baho kutmoqda`}
      />

      {submitted.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 style={{ color: '#f59e0b' }}> Baho kutilmoqda ({submitted.length} ta)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {submitted.map(r => {
              const intern = getInternship(r);
              return (
                <div key={r.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                      <div className="text-sm text-muted">{r.title}</div>
                      {intern?.mentor_grade && (
                        <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                           Bahongiz: <strong>{intern.mentor_grade}</strong>
                        </div>
                      )}
                    </div>
                    {!intern?.mentor_grade && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setSelected(r); setGrade(''); setComment(''); }}
                      >
                         Baho qo'yish
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
                    {r.content?.slice(0, 200)}{r.content?.length > 200 ? '...' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Barcha hisobotlar</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Talaba</th><th>Hisobot nomi</th><th>Holat</th><th>Mentor bahosi</th></tr>
              </thead>
              <tbody>
                {others.map(r => {
                  const intern = getInternship(r);
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.student_name}</strong></td>
                      <td className="text-sm">{r.title}</td>
                      <td><Badge status={r.status} /></td>
                      <td className="text-sm">
                        {intern?.mentor_grade
                          ? <strong style={{ color: '#10b981' }}>{intern.mentor_grade}</strong>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reports.length === 0 && <Empty text="Hali hisobot topilmadi" />}

      {/* Baho berish modali */}
      {selected && (
        <Modal
          open={true}
          onClose={() => setSelected(null)}
          title="Mentor bahosi qo'yish"
          footer={<>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Bekor</button>
            <button
              className="btn btn-primary"
              onClick={giveGrade}
              disabled={submitting || !grade}
            >
              {submitting ? '...' : ' Baho qo\'yish'}
            </button>
          </>}
        >
          <div className="alert alert-info mb-3" style={{ fontSize: 13 }}>
            <strong>{selected.student_name}</strong> — {selected.title}
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 1.6 }}>
            {selected.content?.slice(0, 300)}{selected.content?.length > 300 ? '...' : ''}
          </p>
          <div className="form-group">
            <label className="form-label">Mentor bahosi (0–100) *</label>
            <input
              type="number"
              className="form-control"
              min={0} max={100}
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="Masalan: 90"
            />
            <small className="text-muted">Bu baho talabaning amaliyot faoliyatiga asoslanadi</small>
          </div>
          <div className="form-group">
            <label className="form-label">Izoh (ixtiyoriy)</label>
            <textarea
              className="form-control"
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Talaba haqida fikr-mulohaza..."
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
