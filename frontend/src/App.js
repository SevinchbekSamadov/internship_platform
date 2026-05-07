import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student
import StudentDashboard from './pages/student/Dashboard';
import StudentVacancies from './pages/student/Vacancies';
import StudentApplications from './pages/student/Applications';
import StudentInternship from './pages/student/Internship';
import StudentTasks from './pages/student/Tasks';
import StudentDailyLog from './pages/student/DailyLog';
import StudentAttendance from './pages/student/Attendance';
import StudentReport from './pages/student/Report';
import StudentDocuments from './pages/student/Documents';

// Company HR
import CompanyDashboard from './pages/company/Dashboard';
import CompanyVacancies from './pages/company/Vacancies';
import CompanyApplications from './pages/company/Applications';
import CompanyDocuments from './pages/company/Documents';
import CompanyInternships from './pages/company/Internships';
import CompanyMentors from './pages/company/Mentors';
import CompanyLogbooks from './pages/company/Logbooks';

// Mentor
import MentorDashboard from './pages/mentor/Dashboard';
import MentorInternships from './pages/mentor/Internships';
import MentorAttendance from './pages/mentor/Attendance';
import MentorTasks from './pages/mentor/Tasks';
import MentorReports from './pages/mentor/Reports';

// Supervisor
import SupervisorDashboard from './pages/supervisor/Dashboard';
import SupervisorApplications from './pages/supervisor/Applications';
import SupervisorInternships from './pages/supervisor/Internships';
import SupervisorReports from './pages/supervisor/Reports';

// Dekanat
import DekanatDashboard from './pages/dekanat/Dashboard';
import DekanatStudents from './pages/dekanat/Students';
import DekanatKafedras from './pages/dekanat/Kafedras';
import DekanatOrders from './pages/dekanat/Orders';
import DekanatApplications from './pages/dekanat/Applications';
import DekanatInternships from './pages/dekanat/Internships';
import DekanatCompanies from './pages/dekanat/Companies';
import DekanatDocuments from './pages/dekanat/Documents';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCompanies from './pages/admin/Companies';

// Kafedra
import KafedraDashboard from './pages/kafedra/Dashboard';
import KafedraStudents from './pages/kafedra/Students';
import KafedraApplications from './pages/kafedra/Applications';
import KafedraInternships from './pages/kafedra/Internships';
import KafedraDailyLogs from './pages/kafedra/DailyLogs';
import KafedraReports from './pages/kafedra/Reports';
import KafedraOrders from './pages/kafedra/Orders';

const ROLE_HOME = {
  student: '/student/dashboard',
  company_hr: '/company/dashboard',
  mentor: '/mentor/dashboard',
  supervisor: '/supervisor/dashboard',
  dekanat: '/dekanat/dashboard',
  kafedra: '/kafedra/dashboard',
  admin: '/admin/dashboard',
};

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <span>Yuklanmoqda...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student */}
          <Route path="/student" element={<Guard roles={['student']}><Layout role="student" /></Guard>}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="vacancies" element={<StudentVacancies />} />
            <Route path="applications" element={<StudentApplications />} />
            <Route path="internship" element={<StudentInternship />} />
            <Route path="tasks" element={<StudentTasks />} />
            <Route path="daily-log" element={<StudentDailyLog />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="report" element={<StudentReport />} />
            <Route path="documents" element={<StudentDocuments />} />
          </Route>

          {/* Company HR */}
          <Route path="/company" element={<Guard roles={['company_hr']}><Layout role="company_hr" /></Guard>}>
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="vacancies" element={<CompanyVacancies />} />
            <Route path="applications" element={<CompanyApplications />} />
            <Route path="documents" element={<CompanyDocuments />} />
            <Route path="internships" element={<CompanyInternships />} />
            <Route path="mentors" element={<CompanyMentors />} />
            <Route path="logbooks" element={<CompanyLogbooks />} />
          </Route>

          {/* Mentor */}
          <Route path="/mentor" element={<Guard roles={['mentor']}><Layout role="mentor" /></Guard>}>
            <Route path="dashboard" element={<MentorDashboard />} />
            <Route path="internships" element={<MentorInternships />} />
            <Route path="attendance" element={<MentorAttendance />} />
            <Route path="tasks" element={<MentorTasks />} />
            <Route path="reports" element={<MentorReports />} />
          </Route>

          {/* Supervisor */}
          <Route path="/supervisor" element={<Guard roles={['supervisor']}><Layout role="supervisor" /></Guard>}>
            <Route path="dashboard" element={<SupervisorDashboard />} />
            <Route path="applications" element={<SupervisorApplications />} />
            <Route path="internships" element={<SupervisorInternships />} />
            <Route path="reports" element={<SupervisorReports />} />
          </Route>

          {/* Dekanat */}
          <Route path="/dekanat" element={<Guard roles={['dekanat']}><Layout role="dekanat" /></Guard>}>
            <Route path="dashboard" element={<DekanatDashboard />} />
            <Route path="students" element={<DekanatStudents />} />
            <Route path="kafedras" element={<DekanatKafedras />} />
            <Route path="orders" element={<DekanatOrders />} />
            <Route path="applications" element={<DekanatApplications />} />
            <Route path="internships" element={<DekanatInternships />} />
            <Route path="companies" element={<DekanatCompanies />} />
            <Route path="documents" element={<DekanatDocuments />} />
          </Route>

          {/* Kafedra */}
          <Route path="/kafedra" element={<Guard roles={['kafedra']}><Layout role="kafedra" /></Guard>}>
            <Route path="dashboard" element={<KafedraDashboard />} />
            <Route path="students" element={<KafedraStudents />} />
            <Route path="applications" element={<KafedraApplications />} />
            <Route path="internships" element={<KafedraInternships />} />
            <Route path="orders" element={<KafedraOrders />} />
            <Route path="daily-logs" element={<KafedraDailyLogs />} />
            <Route path="reports" element={<KafedraReports />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<Guard roles={['admin']}><Layout role="admin" /></Guard>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="companies" element={<AdminCompanies />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
