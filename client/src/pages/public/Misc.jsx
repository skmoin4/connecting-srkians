import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Compass, QrCode, TriangleAlert } from 'lucide-react';
import { communityApi, eventApi, fdfsApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, LoadingState } from '../../components/ui/Display.jsx';

/** /check-in?type=event|fdfs&id=…&code=… — opened by scanning the organiser's QR. */
export function CheckIn() {
  const [params] = useSearchParams();
  const { status, isAuthenticated } = useAuth();
  const [state, setState] = useState({ phase: 'idle' });
  const ran = useRef(false);
  const type = params.get('type');
  const id = params.get('id');
  const code = params.get('code');
  const back = params.get('slug') ? `/${type === 'fdfs' ? 'fdfs' : 'events'}/${params.get('slug')}` : '/my-events';

  useEffect(() => {
    if (!isAuthenticated || ran.current || !id || !code) return;
    ran.current = true;
    setState({ phase: 'loading' });
    (type === 'fdfs' ? fdfsApi.checkIn(id, code) : eventApi.checkIn(id, code))
      .then(() => setState({ phase: 'done' }))
      .catch((e) => setState({ phase: 'error', message: errorMessage(e) }));
  }, [isAuthenticated, id, code, type]);

  if (status === 'loading') return <LoadingState className="min-h-[60vh]" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `/check-in?${params.toString()}` }} />;

  return (
    <div className="container-page py-16">
      <Seo title="Event check-in" noindex />
      {!id || !code ? (
        <EmptyState icon={QrCode} title="Invalid check-in link" message="Scan the QR code shown by the organiser at the venue." />
      ) : state.phase === 'loading' || state.phase === 'idle' ? (
        <LoadingState label="Checking you in…" />
      ) : state.phase === 'done' ? (
        <EmptyState icon={CheckCircle2} title="You're checked in!" message="Attendance confirmed and points added. Enjoy the show, SRKian!" action={<Button to={back}>Back to listing</Button>} />
      ) : (
        <EmptyState icon={TriangleAlert} title="Check-in failed" message={state.message} action={<Button to={back} variant="secondary">Back</Button>} />
      )}
    </div>
  );
}

/** /join?ref=SRK-XXXX — tracks the click and forwards to registration. */
export function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get('ref');
  useEffect(() => {
    if (ref) {
      try {
        sessionStorage.setItem('srk.ref', ref);
      } catch {
        /* ignore */
      }
      communityApi.referralClick(ref).catch(() => {});
    }
    navigate(`/register${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`, { replace: true });
  }, [ref, navigate]);
  return <LoadingState className="min-h-[50vh]" />;
}

export function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title="Page not found" noindex />
      <p className="display text-[8rem] leading-none text-gold-gradient sm:text-[12rem]">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-fog-100">Picture abhi baaki hai… but not on this page.</h1>
      <p className="mt-2 text-fog-400">The page you're looking for doesn't exist or was moved.</p>
      <div className="mt-6 flex gap-3">
        <Button to="/" icon={Compass}>
          Go home
        </Button>
        <Button to="/cities" variant="secondary">
          Find your city
        </Button>
      </div>
      <Link to="/search" className="mt-4 text-sm text-gold-300 underline">
        Search instead
      </Link>
    </div>
  );
}
