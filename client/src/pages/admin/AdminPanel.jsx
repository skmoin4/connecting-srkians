import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BarChart3,
  CalendarDays,
  Clapperboard,
  Film,
  Flag,
  Globe,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
} from 'lucide-react';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { AdminAnalytics, AdminAuditLogs, AdminDashboard, AdminModerators, AdminUsers } from './AdminOverview.jsx';
import { AdminAnnouncements, AdminBadges, AdminEvents, AdminFanClubs, AdminLocations, AdminReports, AdminSettings } from './AdminManage.jsx';
import { AdminMoments, AdminMovies } from './AdminFandom.jsx';

/**
 * Admin & moderator panel. Moderators see a reduced menu; the server additionally scopes every
 * moderator query to their assigned cities and rejects super-admin-only endpoints.
 */
export default function AdminPanel() {
  const { user, isSuperAdmin } = useAuth();
  const dash = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard, staleTime: 60 * 1000 });
  const c = dash.data?.cards || {};

  const nav = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/fan-clubs', label: 'Fan clubs', icon: UsersRound, badge: c.pendingFanClubs },
    { to: '/admin/reports', label: 'Reports', icon: Flag, badge: c.openReports },
    { to: '/admin/events', label: 'Events', icon: CalendarDays },
    { to: '/admin/fdfs', label: 'FDFS', icon: Clapperboard },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    isSuperAdmin && { to: '/admin/users', label: 'Users', icon: Users },
    isSuperAdmin && { to: '/admin/moderators', label: 'Moderators', icon: ShieldCheck },
    isSuperAdmin && { to: '/admin/cities', label: 'Cities', icon: MapPin },
    isSuperAdmin && { to: '/admin/states', label: 'States', icon: Map },
    isSuperAdmin && { to: '/admin/countries', label: 'Countries', icon: Globe },
    isSuperAdmin && { to: '/admin/movies', label: 'Films', icon: Film },
    isSuperAdmin && { to: '/admin/moments', label: 'Moments', icon: Sparkles },
    isSuperAdmin && { to: '/admin/badges', label: 'Badges', icon: Award },
    isSuperAdmin && { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
    isSuperAdmin && { to: '/admin/settings', label: 'Site settings', icon: Settings },
  ].filter(Boolean);

  const superOnly = (el) => (isSuperAdmin ? el : <Navigate to="/admin" replace />);
  const subtitle = isSuperAdmin ? 'Super admin' : `City moderator · ${(user.moderatedCities || []).map((m) => m.name).join(', ') || 'no cities assigned'}`;

  return (
    <>
      <Seo title="Admin" noindex />
      <Routes>
        <Route element={<DashboardLayout title={isSuperAdmin ? 'Admin panel' : 'Moderator panel'} subtitle={subtitle} nav={nav} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="fan-clubs" element={<AdminFanClubs />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="events" element={<AdminEvents kind="events" />} />
          <Route path="fdfs" element={<AdminEvents kind="fdfs" />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="users" element={superOnly(<AdminUsers />)} />
          <Route path="moderators" element={superOnly(<AdminModerators />)} />
          <Route path="cities" element={superOnly(<AdminLocations kind="cities" />)} />
          <Route path="states" element={superOnly(<AdminLocations kind="states" />)} />
          <Route path="countries" element={superOnly(<AdminLocations kind="countries" />)} />
          <Route path="movies" element={superOnly(<AdminMovies />)} />
          <Route path="moments" element={superOnly(<AdminMoments />)} />
          <Route path="badges" element={superOnly(<AdminBadges />)} />
          <Route path="audit-logs" element={superOnly(<AdminAuditLogs />)} />
          <Route path="settings" element={superOnly(<AdminSettings />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </>
  );
}
