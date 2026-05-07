import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, Building2,
  FileText, GraduationCap, UserCheck, CalendarDays, BarChart3,
  CheckSquare, Briefcase, UserCog, Settings, LogOut, ChevronRight,
  School, BookMarked, ScrollText, NotebookPen, Building,
  FolderOpen, Shield
} from 'lucide-react';

const NAVS = {
  student: [
    { label: 'Asosiy', items: [
      { to: '/student/dashboard',   icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/student/vacancies',   icon: Briefcase,       text: 'Vakansiyalar' },
      { to: '/student/applications',icon: ClipboardList,   text: 'Arizalarim' },
    ]},
    { label: 'Amaliyot', items: [
      { to: '/student/internship',  icon: Building2,       text: 'Amaliyotim' },
      { to: '/student/tasks',       icon: CheckSquare,     text: 'Vazifalar' },
      { to: '/student/daily-log',   icon: NotebookPen,     text: 'Kundalik' },
      { to: '/student/attendance',  icon: CalendarDays,    text: 'Davomat' },
      { to: '/student/report',      icon: BarChart3,       text: 'Hisobot' },
      { to: '/student/documents',   icon: FileText,        text: "Yo'llanma" },
    ]},
  ],
  company_hr: [
    { label: 'Asosiy', items: [
      { to: '/company/dashboard',   icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/company/vacancies',   icon: Briefcase,       text: 'Vakansiyalar' },
      { to: '/company/applications',icon: ClipboardList,   text: 'Arizalar' },
      { to: '/company/documents',   icon: FileText,        text: "Yo'llanmalar" },
      { to: '/company/internships', icon: Users,           text: 'Amaliyotchilar' },
      { to: '/company/mentors',     icon: UserCheck,       text: 'Mentorlar' },
      { to: '/company/logbooks',    icon: BookMarked,      text: 'Kundalik daftarlar' },
    ]},
  ],
  mentor: [
    { label: 'Asosiy', items: [
      { to: '/mentor/dashboard',    icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/mentor/internships',  icon: Users,           text: 'Amaliyotchilar' },
      { to: '/mentor/attendance',   icon: CalendarDays,    text: 'Davomat' },
      { to: '/mentor/tasks',        icon: CheckSquare,     text: 'Vazifalar' },
      { to: '/mentor/reports',      icon: BarChart3,       text: 'Hisobotlar & Baho' },
    ]},
  ],
  supervisor: [
    { label: 'Asosiy', items: [
      { to: '/supervisor/dashboard',    icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/supervisor/applications', icon: Users,           text: 'Talabalarim' },
      { to: '/supervisor/internships',  icon: NotebookPen,     text: 'Baho va kundalik' },
      { to: '/supervisor/reports',      icon: BarChart3,       text: 'Hisobotlar' },
    ]},
  ],
  kafedra: [
    { label: 'Asosiy', items: [
      { to: '/kafedra/dashboard',    icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/kafedra/students',     icon: GraduationCap,   text: 'Talabalar' },
      { to: '/kafedra/applications', icon: ClipboardList,   text: 'Arizalar' },
      { to: '/kafedra/internships',  icon: Users,           text: 'Amaliyotchilar' },
      { to: '/kafedra/orders',       icon: FileText,        text: 'Korxona buyruqlari' },
      { to: '/kafedra/daily-logs',   icon: NotebookPen,     text: 'Kundaliklar' },
      { to: '/kafedra/reports',      icon: BarChart3,       text: 'Hisobotlar' },
    ]},
  ],
  dekanat: [
    { label: 'Asosiy', items: [
      { to: '/dekanat/dashboard',    icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/dekanat/students',     icon: GraduationCap,   text: 'Talabalar' },
      { to: '/dekanat/kafedras',     icon: School,          text: 'Kafedralar' },
      { to: '/dekanat/applications', icon: ClipboardList,   text: 'Arizalar' },
      { to: '/dekanat/internships',  icon: Users,           text: 'Amaliyotchilar' },
      { to: '/dekanat/companies',    icon: Building,        text: 'Korxonalar' },
      { to: '/dekanat/documents',    icon: ScrollText,      text: "Yo'llanmalar" },
      { to: '/dekanat/orders',       icon: FileText,        text: 'Korxona buyruqlari' },
    ]},
  ],
  admin: [
    { label: 'Boshqaruv', items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, text: 'Dashboard' },
      { to: '/admin/users',     icon: Users,           text: 'Foydalanuvchilar' },
      { to: '/admin/companies', icon: Building,        text: 'Korxonalar' },
    ]},
  ],
};

const ROLE_LABELS = {
  student:    'Talaba',
  company_hr: 'Korxona HR',
  mentor:     'Mentor',
  supervisor: 'Amaliyot Rahbar',
  kafedra:    'Kafedra',
  dekanat:    'Dekanat',
  admin:      'Administrator',
};

export default function Layout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sections = NAVS[role] || [];
  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <h2>Amaliyot Tizimi</h2>
          <span>TDIU Platformasi</span>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p>{user?.full_name || user?.email}</p>
            <span>{ROLE_LABELS[role]}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {sections.map(sec => (
            <div key={sec.label}>
              <div className="nav-label">{sec.label}</div>
              {sec.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <Icon size={15} className="nav-icon" />
                    {item.text}
                  </NavLink>
                );
              })}
            </div>
          ))}

          <div className="nav-label" style={{ marginTop: 8 }}>Tizim</div>
          <button
            className="nav-item"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut size={15} className="nav-icon" />
            Chiqish
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <span className="header-title">Talabalar Amaliyoti Tizimi</span>
          <span className="header-date">
            {new Date().toLocaleDateString('uz-UZ', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
