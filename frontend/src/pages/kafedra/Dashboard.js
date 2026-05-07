import React from 'react';
import { StatCard, Loading, PageHeader, useApi, toArr, Badge } from '../../components/common';
import { internAPI, appAPI, reportAPI } from '../../api';
import { ClipboardList, CheckCircle, FileText, AlertCircle } from 'lucide-react';

export default function KafedraDashboard() {
  const { data: ints, loading: l1 } = useApi(() => internAPI.list());
  const { data: apps, loading: l2 } = useApi(() => appAPI.list({ status: 'hr_approved' }));
  const { data: reps, loading: l3 } = useApi(() => reportAPI.list());

  const internships = toArr(ints);
  const applications = toArr(apps);
  const reports = toArr(reps);

  if (l1 || l2 || l3) return <Loading />;

  const active    = internships.filter(i => i.status === 'active').length;
  const pending   = internships.filter(i => i.status === 'pending').length;
  const submitted = reports.filter(r => r.status === 'submitted').length;

  return (
    <div className="page">
      <PageHeader title="Kafedra paneli" subtitle="Kafedra amaliyot boshqaruvi" />
      <div className="stats-grid">
        <StatCard icon={ClipboardList} value={applications.length} label="Kutayotgan arizalar" color="yellow" />
        <StatCard icon={CheckCircle}   value={active}             label="Faol amaliyot"          color="green"  />
        <StatCard icon={FileText}      value={pending}            label="Yo'llanma kutmoqda"      color="blue"   />
        <StatCard icon={AlertCircle}   value={submitted}          label="Ko'rib chiqilmagan hisobot" color="orange" />
      </div>

      <div className="card mt-4">
        <div className="card-header"><h3>Amaliyotchilar holati</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Talaba</th><th>Korxona</th><th>Holat</th><th>Davomiyligi</th></tr>
            </thead>
            <tbody>
              {internships.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Amaliyotchi topilmadi</td></tr>
              ) : internships.slice(0, 10).map(i => (
                <tr key={i.id}>
                  <td><strong>{i.student_name}</strong></td>
                  <td className="text-sm text-muted">{i.company_name}</td>
                  <td><Badge status={i.status} /></td>
                  <td className="text-sm text-muted">{i.start_date} — {i.end_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
