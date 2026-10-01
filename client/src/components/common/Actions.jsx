import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Flag, Mail, Share2 } from 'lucide-react';
import { communityApi, fanClubApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { REPORT_REASONS } from '../../constants/index.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Input, Select, Textarea } from '../ui/Form.jsx';

/** Redirects guests to login and returns false; true when signed in. */
export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  return () => {
    if (isAuthenticated) return true;
    toast.info('Sign in to continue');
    navigate('/login', { state: { from: location.pathname } });
    return false;
  };
}

export function ShareButton({ title, text, url, variant = 'secondary', size = 'md', className }) {
  const toast = useToast();
  const share = async () => {
    const shareUrl = url || window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <Button variant={variant} size={size} icon={Share2} onClick={share} className={className}>
      Share
    </Button>
  );
}

export function ReportButton({ targetType, targetId, label = 'Report', className }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => communityApi.report({ targetType, targetId, reason, details }),
    onSuccess: () => {
      toast.success('Report submitted. Our moderators will review it.');
      setOpen(false);
      setReason('');
      setDetails('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth() && setOpen(true)}
        className={className || 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-fog-500 hover:text-crimson-400'}
      >
        <Flag className="size-3.5" aria-hidden /> {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report to moderators"
        description="Reports are private. False reports may lead to account action."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!reason}>
              Submit report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Choose a reason" options={Object.entries(REPORT_REASONS).map(([value, label]) => ({ value, label }))} />
          <Textarea label="Details (optional)" value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what's wrong" />
        </div>
      </Modal>
    </>
  );
}

/** Internal contact form so admins never have to expose personal phone numbers. */
export function ContactAdminButton({ fanClub, variant = 'secondary', size = 'md', className, label = 'Contact Admin' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', message: '' });
  const requireAuth = useRequireAuth();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => fanClubApi.contact(fanClub._id, form),
    onSuccess: (_d) => {
      toast.success('Message sent to the fan club admin. You will be notified when they respond.');
      setOpen(false);
      setForm({ name: user?.fullName || '', subject: '', message: '' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={Mail}
        className={className}
        onClick={() => {
          if (!requireAuth()) return;
          setForm((f) => ({ ...f, name: f.name || user?.fullName || '' }));
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Contact ${fanClub.name}`}
        description="Your message goes to the verified admin through the platform. Your email is never shared."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => m.mutate()} loading={m.isPending} disabled={form.name.length < 2 || form.subject.length < 3 || form.message.length < 10}>
              Send message
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Your name" required value={form.name} onChange={set('name')} maxLength={80} />
          <Input label="Subject" required value={form.subject} onChange={set('subject')} maxLength={150} placeholder="e.g. Joining the KING FDFS" />
          <Textarea label="Message" required value={form.message} onChange={set('message')} maxLength={2000} rows={5} hint="At least 10 characters" />
        </div>
      </Modal>
    </>
  );
}
