import React, { useState } from 'react';
import { Badge, Loading, Empty, Modal, PageHeader, useApi, toArr } from '../../components/common';
import { reportAPI } from '../../api';
import { Check, X } from 'lucide-react';

export default function KafedraReports() {
  const { data, loading, refetch } = useApi(() => reportAPI.list());
  const [rejectModal, setRejectModal] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reports = toArr(data).filter(r => r.status === 'submitted');

  const approve = async (report) => {
    setSubmitting(true);
    try {
      await reportAPI.kafedraApprove(report.id, { comment: '' });
      refetch();
    } finally { setSubmitting(false); }
  };

  const reject = async () => {
    setSubmitting(true);
    try {
      await reportAPI.kafedraReject(rejectModal.id, { comment });
      setRejectModal(null);
      setComment('');
      refetch();
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Hisobotlar"
        subtitle={`${reports.length} ta ko'rib chiqilmagan hisobot`}
      />

      {reports.length === 0 ? (
        <Empty text="Ko'rib chiqiladigan hisobot yo'q" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(report => (
            <div key={report.id} className="card">
              <div style={{ padding: '15px 18px' }}>
                <div className="flex-between mb-2">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{report.student_name}</div>
                    <div className="text-sm text-muted mt-1">{report.company_name}</div>
                    <div style={{ fontWeight: 500, marginTop: 4 }}>{report.title}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge status={report.status} />
                  </div>
                </div>

                <div className="text-sm text-muted mb-3" style={{ lineHeight: 1.6 }}>
                  {report.content?.slice(0, 200)}{report.content?.length > 200 ? '...' : ''}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {report.reviewed_by_name && (
                    <div className="text-sm" style={{ color: 'green' }}>
                       Rahbar tasdiqladi: {report.reviewed_by_name}
                    </div>
                  )}
                  {report.kafedra_approved && (
                    <div className="text-sm" style={{ color: 'green' }}>
                       Kafedra tasdiqladi
                    </div>
                  )}
                </div>

                {!report.kafedra_approved && (
                  <div className="flex gap-2 mt-3">
                    <button
                      className="btn btn-primary"
                      onClick={() => approve(report)}
                      disabled={submitting}
                    >
                       Tasdiqlash
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => { setRejectModal(report); setComment(''); }}
                    >
                       Rad etish
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <Modal title="Hisobotni rad etish" onClose={() => setRejectModal(null)}>
          <p><strong>{rejectModal.student_name}</strong> hisoboti rad etiladi.</p>
          <textarea
            className="input"
            rows={3}
            placeholder="Rad etish sababi..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <div className="flex gap-2 mt-3">
            <button className="btn btn-danger" onClick={reject} disabled={submitting}>
              Rad etish
            </button>
            <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Bekor</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
