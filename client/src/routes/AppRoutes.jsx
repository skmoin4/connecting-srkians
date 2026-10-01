import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import { GuestRoute, ProtectedRoute } from './guards.jsx';
import { LoadingState } from '../components/ui/Display.jsx';
import { ROLES } from '../constants/index.js';

// Route-level code splitting
const Home = lazy(() => import('../pages/public/Home.jsx'));
const About = lazy(() => import('../pages/public/About.jsx'));
const Discover = lazy(() => import('../pages/public/Discover.jsx'));
const Cities = lazy(() => import('../pages/public/Cities.jsx'));
const CityDetail = lazy(() => import('../pages/public/CityDetail.jsx'));
const FanClubs = lazy(() => import('../pages/public/FanClubs.jsx'));
const FanClubDetail = lazy(() => import('../pages/public/FanClubDetail.jsx'));
const FanClubRegister = lazy(() => import('../pages/public/FanClubRegister.jsx'));
const Events = lazy(() => import('../pages/public/Events.jsx'));
const EventDetail = lazy(() => import('../pages/public/EventDetail.jsx'));
const Fdfs = lazy(() => import('../pages/public/Fdfs.jsx'));
const FdfsDetail = lazy(() => import('../pages/public/FdfsDetail.jsx'));
const Leaderboard = lazy(() => import('../pages/public/Leaderboard.jsx'));
const SearchPage = lazy(() => import('../pages/public/Search.jsx'));
const CheckIn = lazy(() => import('../pages/public/CheckIn.jsx'));
const Join = lazy(() => import('../pages/public/Join.jsx'));
const NotFound = lazy(() => import('../pages/public/NotFound.jsx'));
const Legal = lazy(() => import('../pages/legal/Legal.jsx'));
const Contact = lazy(() => import('../pages/legal/Contact.jsx'));

const Login = lazy(() => import('../pages/auth/Login.jsx'));
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail.jsx'));

const Dashboard = lazy(() => import('../pages/user/Dashboard.jsx'));
const Profile = lazy(() => import('../pages/user/Profile.jsx'));
const SettingsPage = lazy(() => import('../pages/user/Settings.jsx'));
const Notifications = lazy(() => import('../pages/user/Notifications.jsx'));
const MyEvents = lazy(() => import('../pages/user/MyEvents.jsx'));
const MyFanClub = lazy(() => import('../pages/user/MyFanClub.jsx'));
const MyBadges = lazy(() => import('../pages/user/MyBadges.jsx'));
const Referrals = lazy(() => import('../pages/user/Referrals.jsx'));

const FanClubPanel = lazy(() => import('../pages/fanclub/FanClubPanel.jsx'));
const AdminPanel = lazy(() => import('../pages/admin/AdminPanel.jsx'));

const Fallback = () => <LoadingState className="min-h-[60vh]" />;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="discover" element={<Discover />} />
          <Route path="cities" element={<Cities />} />
          <Route path="cities/:slug" element={<CityDetail />} />
          <Route path="fan-clubs" element={<FanClubs />} />
          <Route path="fan-clubs/register" element={<FanClubRegister />} />
          <Route path="fan-clubs/:slug" element={<FanClubDetail />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:slug" element={<EventDetail />} />
          <Route path="fdfs" element={<Fdfs />} />
          <Route path="fdfs/:slug" element={<FdfsDetail />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="join" element={<Join />} />
          <Route path="privacy" element={<Legal page="privacy" />} />
          <Route path="terms" element={<Legal page="terms" />} />
          <Route path="community-guidelines" element={<Legal page="guidelines" />} />
          <Route path="copyright" element={<Legal page="copyright" />} />
          <Route path="disclaimer" element={<Legal page="disclaimer" />} />
          <Route path="contact" element={<Contact />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="reset-password" element={<ResetPassword />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="my-events" element={<MyEvents />} />
            <Route path="my-fan-club" element={<MyFanClub />} />
            <Route path="my-badges" element={<MyBadges />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="fan-club/*" element={<FanClubPanel />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.CITY_MODERATOR, ROLES.SUPER_ADMIN]} />}>
            <Route path="admin/*" element={<AdminPanel />} />
            <Route path="moderator/*" element={<AdminPanel />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
