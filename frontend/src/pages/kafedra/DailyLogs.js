import React from 'react';
import { Loading, Empty, PageHeader, useApi, toArr } from '../../components/common';
import { logAPI } from '../../api';
import { Check, Clock } from 'lucide-react';

export default function KafedraDailyLogs() {
  const { data, loading } = useApi(() => logAPI.list());
  const logs = toArr(data);

  const approved   = logs.filter(l => l.approved_by_mentor && l.approved_by_supervisor).length;
  const pending    = logs.filter(l => !l.approved_by_mentor || !l.approved_by_supervisor).length;

  if (loading) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Kundaliklar"
        subtitle={`${logs.length} ta kundalik · ${approved} ta tasdiqlangan · ${pending} ta kutilmoqda`}
      />

      <div className="alert alert-info mb-4" style={{ fontSize: 13 }}>
        ℹ Kundaliklar <strong>Mentor</strong> va <strong>Amaliyot Rahbar</strong> tomonidan tasdiqlanadi.
        Kafedra kundaliklar holatini monitoring qilishi mumkin.
      </div>

      {logs.length === 0 ? (
        <Empty text="Kundalik topilmadi" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Soat</th>
                  <th>Tavsif</th>
                  <th>Mentor</th>
                  <th>Amaliyot Rahbar</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-sm">{log.date}</td>
                    <td className="text-sm">{log.hours_worked}h</td>
                    <td style={{ maxWidth: 260, fontSize: 13 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: log.approved_by_mentor ? '#10b981' : '#9ca3af', fontSize: 13 }}>
                        {log.approved_by_mentor ? '' : ''}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: log.approved_by_supervisor ? '#10b981' : '#9ca3af', fontSize: 13 }}>
                        {log.approved_by_supervisor ? '' : ''}
                      </span>
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
