import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, TriangleAlert } from 'lucide-react';
import { authApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { LoadingState } from '../../components/ui/Display.jsx';
import { password as passwordRule } from '../../validations/schemas.js';
import AuthShell from './AuthShell.jsx';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.forgot({ email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a secure reset link.">
      <Seo title="Forgot password" noindex />
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto size-10 text-gold-400" aria-hidden />
          <p className="mt-4 text-fog-200">If an account exists for {email}, a reset link is on its way. It expires in 30 minutes.</p>
          <Button to="/login" variant="secondary" className="mt-6">
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>
            Send reset link
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-gold-300 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const check = passwordRule.safeParse(pw);
    if (!check.success) return setError(check.error.issues[0].message);
    if (pw !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await authApi.reset({ token, password: pw });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Set a new password">
      <Seo title="Reset password" noindex />
      {!token ? (
        <p className="text-center text-fog-300">
          This reset link is incomplete. <Link to="/forgot-password" className="text-gold-300 underline">Request a new one</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Input label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} hint="8+ characters with a letter and a number" />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { isAuthenticated, refreshUser } = useAuth();
  const [state, setState] = useState(token ? 'loading' : 'missing');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .verifyEmail({ token })
      .then(() => {
        setState('done');
        if (isAuthenticated) refreshUser().catch(() => {});
      })
      .catch((e) => {
        setState('error');
        setMsg(errorMessage(e));
      });
  }, [token, isAuthenticated, refreshUser]);

  return (
    <AuthShell title="Email verification">
      <Seo title="Verify email" noindex />
      <div className="text-center">
        {state === 'loading' && <LoadingState label="Verifying…" className="py-4" />}
        {state === 'done' && (
          <>
            <CheckCircle2 className="mx-auto size-10 text-emerald-400" aria-hidden />
            <p className="mt-4 text-fog-200">Your email is verified. Thanks!</p>
            <Button to={isAuthenticated ? '/dashboard' : '/login'} className="mt-6">
              Continue
            </Button>
          </>
        )}
        {(state === 'error' || state === 'missing') && (
          <>
            <TriangleAlert className="mx-auto size-10 text-crimson-400" aria-hidden />
            <p className="mt-4 text-fog-200">{msg || 'This verification link is invalid.'}</p>
            <p className="mt-2 text-sm text-fog-400">You can request a new link from Settings → Security.</p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
