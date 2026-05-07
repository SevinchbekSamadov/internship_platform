import React, { useState } from 'react';
import { Badge, Loading, Empty, PageHeader, useApi, toArr } from '../../components/common';
import { orderAPI } from '../../api';
import { Download, CheckCircle, Clock } from 'lucide-react';

export default function DekanatOrders() {
  const { data, loading } = useApi(() => orderAPI.list());
  const [downloading, setDownloading] = useState(null);
  const orders = toArr(data);

  const download = async (order) => {
    setDownloading(order.id);
    try {
      const res = await orderAPI.download(order.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `buyruq_${order.student_name}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('Yuklab bo\'lmadi'); }
    finally { setDownloading(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Korxona buyruqlari"
        subtitle={`${orders.length} ta buyruq — korxonalardan yuborilgan`}
      />

      {orders.length === 0 ? (
        <Empty text="Hali buyruq yuborilmagan" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Talaba</th>
                  <th>Korxona</th>
                  <th>Amaliyot muddati</th>
                  <th>Mentor</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.student_name}</strong>
                      {o.internship_info?.group && (
                        <div className="text-sm text-muted">{o.internship_info.group}</div>
                      )}
                    </td>
                    <td className="text-sm">{o.company_name}</td>
                    <td className="text-sm text-muted">
                      {o.internship_info?.start_date} — {o.internship_info?.end_date}
                    </td>
                    <td className="text-sm text-muted">
                      {o.internship_info?.mentor || '—'}
                    </td>
                    <td>
                      {o.status === 'sent' ? (
                        <span style={{ color: '#16a34a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12}/> Yuborildi
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12}/> Qoralama
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => download(o)}
                        disabled={downloading === o.id}
                      >
                        <Download size={13}/> {downloading === o.id ? '...' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
