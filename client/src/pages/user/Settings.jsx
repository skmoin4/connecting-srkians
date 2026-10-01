import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, userApi } from '../../api/endpoints.js';
import { errorMessage, setAccessToken } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { LocationSelector } from '../../components/common/LocationSelector.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Tabs } from '../../components/ui/Display.jsx';
import { password as passwordRule } from '../../validations/schemas.js';
import { pushSupported, requestPushPermission } from '../../services/pwa.js';

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'location', label: 'Location' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'security', label: 'Security' },
  { value: 'account', label: 'Account' },
];

function useSave(fn, successMsg) {
  const { setUser } = useAuth();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d) => {
      if (d?.user) setUser(d.user);
      toast.success(successMsg);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

function ProfileTab({ user }) {
  const [f, setF] = useState({
    fullName: user.fullName || '',
    bio: user.bio || '',
    favouriteMovie: user.favouriteMovie || '',
    favouriteDialogue: user.favouriteDialogue || '',
    instagram: user.instagram || '',
    profilePhoto: user.profilePhoto || null,
  });
  const save = useSave(userApi.update, 'Profile updated');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ ...f, profilePhoto: f.profilePhoto || null });
      }}
    >
      <ImageUpload label="Profile photo" value={f.profilePhoto} onChange={(v) => setF((s) => ({ ...s, profilePhoto: v }))} folder="avatars" aspect="aspect-square w-32" rounded="rounded-full" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" value={f.fullName} onChange={set('fullName')} maxLength={80} />
        <Input label="Username" value={`@${user.username}`} disabled hint="Usernames can't be changed" />
        <Input label="Favourite SRK movie" value={f.favouriteMovie} onChange={set('favouriteMovie')} maxLength={80} />
        <Input label="Instagram" value={f.instagram} onChange={set('instagram')} placeholder="yourhandle" maxLength={40} />
      </div>
      <Input label="Favourite dialogue" value={f.favouriteDialogue} onChange={set('favouriteDialogue')} maxLength={200} />
      <Textarea label="Bio" value={f.bio} onChange={set('bio')} maxLength={300} rows={3} hint={`${f.bio.length}/300 · Complete your profile (photo, bio, movie) to earn +10 points`} />
      <Button type="submit" loading={save.isPending}>
        Save profile
      </Button>
    </form>
  );
}

function LocationTab({ user }) {
  const [loc, setLoc] = useState({ country: user.country?._id || '', state: user.state?._id || '', city: user.city?._id || '' });
  const save = useSave(userApi.updateLocation, 'Your city has been updated');
  return (
    <div className="space-y-5">
      <p className="text-sm text-fog-400">
        Your primary city decides which community, events and FDFS alerts you see. Current: <strong className="text-fog-100">{user.city?.name || 'none'}</strong>
      </p>
      <LocationSelector value={loc} onChange={setLoc} />
      <Button onClick={() => save.mutate({ country: loc.country, state: loc.state, city: loc.city })} disabled={!loc.city || loc.city === user.city?._id} loading={save.isPending}>
        Change city
      </Button>
    </div>
  );
}

function PrivacyTab({ user }) {
  const [p, setP] = useState({ ...user.privacy });
  const save = useSave(userApi.updatePrivacy, 'Privacy settings saved');
  const toggle = (k) => (v) => setP((s) => ({ ...s, [k]: v }));
  return (
    <div>
      <p className="mb-2 text-sm text-fog-400">Your email and phone are never shown publicly.</p>
      <div className="divide-y divide-white/5">
        <Switch label="Public profile" description="When off, only your name and photo are visible." checked={p.publicProfile} onChange={toggle('publicProfile')} />
        <Switch label="Show my city" checked={p.showCity} onChange={toggle('showCity')} />
        <Switch label="Show my Instagram" checked={p.showInstagram} onChange={toggle('showInstagram')} />
        <Switch label="Show fan club memberships" checked={p.showFanClubs} onChange={toggle('showFanClubs')} />
        <Switch label="Show events I attended" checked={p.showEventAttendance} onChange={toggle('showEventAttendance')} />
      </div>
      <Button className="mt-5" onClick={() => save.mutate(p)} loading={save.isPending}>
        Save privacy
      </Button>
    </div>
  );
}

function NotificationsTab({ user }) {
  const [p, setP] = useState({ ...user.notificationPreferences });
  const save = useSave(userApi.updateNotificationPrefs, 'Notification preferences saved');
  const toast = useToast();
  const toggle = (k) => (v) => setP((s) => ({ ...s, [k]: v }));
  return (
    <div>
      <p className="mb-2 text-sm text-fog-400">Choose what you hear about. Security and account messages are always delivered.</p>
      <div className="divide-y divide-white/5">
        <Switch label="FDFS alerts" description="New FDFS in your city, theatre & timing updates" checked={p.fdfs} onChange={toggle('fdfs')} />
        <Switch label="Event alerts" description="New events by your clubs, reminders" checked={p.events} onChange={toggle('events')} />
        <Switch label="City alerts" description="Announcements for your city" checked={p.city} onChange={toggle('city')} />
        <Switch label="Fan club alerts" description="Club announcements and membership updates" checked={p.fanClub} onChange={toggle('fanClub')} />
        <Switch label="Admin messages" description="Replies to your contact requests" checked={p.adminMessages} onChange={toggle('adminMessages')} />
        <Switch label="System alerts" description="Badges, points and platform news" checked={p.system} onChange={toggle('system')} />
        <Switch
          label="Push notifications"
          description={pushSupported() ? 'Browser push (requires the platform to enable Firebase Cloud Messaging)' : 'Not supported in this browser'}
          checked={p.push}
          disabled={!pushSupported()}
          onChange={async (v) => {
            if (v) {
              const perm = await requestPushPermission();
              if (perm !== 'granted') return toast.error('Browser notifications are blocked for this site.');
            }
            toggle('push')(v);
          }}
        />
      </div>
      <Button className="mt-5" onClick={() => save.mutate(p)} loading={save.isPending}>
        Save preferences
      </Button>
    </div>
  );
}

function SecurityTab({ user }) {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const change = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword }),
    onSuccess: (d) => {
      setAccessToken(d.accessToken);
      setF({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed. Other devices were signed out.');
    },
    onError: (e) => setErr(errorMessage(e)),
  });
  const resend = useMutation({ mutationFn: authApi.resendVerification, onSuccess: () => toast.success('Verification email sent'), onError: (e) => toast.error(errorMessage(e)) });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-850 p-4 text-sm">
        <span>
          Email: <strong className="text-fog-100">{user.email}</strong> {user.emailVerified ? <span className="text-emerald-300">· verified</span> : <span className="text-amber-300">· not verified</span>}
        </span>
        {!user.emailVerified && (
          <Button size="sm" variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend verification
          </Button>
        )}
      </div>
      <form
        className="max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr('');
          const check = passwordRule.safeParse(f.newPassword);
          if (!check.success) return setErr(check.error.issues[0].message);
          if (f.newPassword !== f.confirm) return setErr('Passwords do not match');
          change.mutate();
        }}
      >
        <h3 className="font-semibold text-fog-100">Change password</h3>
        <Input label="Current password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} />
        <Input label="New password" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} hint="8+ characters with a letter and a number" />
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={err} />
        <Button type="submit" loading={change.isPending} disabled={!f.currentPassword || !f.newPassword}>
          Update password
        </Button>
      </form>
    </div>
  );
}

function AccountTab() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const del = useMutation({
    mutationFn: () => authApi.deleteAccount({ password: pw }),
    onSuccess: async () => {
      toast.success('Your account has been deleted.');
      await logout().catch(() => {});
      navigate('/');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="rounded-xl border border-crimson-500/25 bg-crimson-500/5 p-5">
      <h3 className="font-semibold text-crimson-400">Delete account</h3>
      <p className="mt-1 text-sm text-fog-300">This anonymises your profile, removes you from fan clubs and cancels your registrations. It can't be undone.</p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={() => del.mutate()} loading={del.isPending} danger title="Delete your account?" confirmLabel="Delete forever">
        <p className="mb-4 text-sm text-fog-300">Enter your password to confirm.</p>
        <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      </ConfirmDialog>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  const Comp = { profile: ProfileTab, location: LocationTab, privacy: PrivacyTab, notifications: NotificationsTab, security: SecurityTab, account: AccountTab }[tab] || ProfileTab;
  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <Seo title="Settings" noindex />
      <p className="eyebrow mb-2">Account</p>
      <h1 className="display mb-6 text-5xl text-fog-100">Settings</h1>
      <Tabs className="mb-6" tabs={TABS} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} />
      <div className="card p-5 sm:p-7">
        <Comp key={tab} user={user} />
      </div>
    </div>
  );
}
