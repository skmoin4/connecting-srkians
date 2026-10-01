import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, UserPlus } from 'lucide-react';
import { fanClubApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/Modal.jsx';
import { useRequireAuth } from './Actions.jsx';

/** Join / leave a fan club. `club.myMembership` is either a status string or { status }. */
export function JoinClubButton({ club, size = 'md', className }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [confirm, setConfirm] = useState(false);
  const status = typeof club.myMembership === 'string' ? club.myMembership : club.myMembership?.status;
  const isOwner = user && (club.admin?._id || club.admin) === user._id;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fan-club'] });
    qc.invalidateQueries({ queryKey: ['fan-clubs'] });
    qc.invalidateQueries({ queryKey: ['me', 'fan-clubs'] });
  };
  const join = useMutation({
    mutationFn: () => fanClubApi.join(club._id),
    onSuccess: (d) => {
      toast.success(d.status === 'ACTIVE' ? `Welcome to ${club.name}!` : 'Request sent — the admin will review it.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const leave = useMutation({
    mutationFn: () => fanClubApi.leave(club._id),
    onSuccess: () => {
      toast.info(`You left ${club.name}`);
      setConfirm(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isOwner) return <Button size={size} variant="outline" to="/fan-club/dashboard" className={className}>Manage</Button>;
  if (club.membershipType === 'CLOSED' && status !== 'ACTIVE') {
    return (
      <Button size={size} variant="secondary" disabled className={className}>
        Closed
      </Button>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <>
        <Button size={size} variant="outline" icon={Check} className={className} onClick={() => setConfirm(true)} aria-label={`Member of ${club.name}. Leave club`}>
          Joined
        </Button>
        <ConfirmDialog
          open={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => leave.mutate()}
          loading={leave.isPending}
          danger
          title={`Leave ${club.name}?`}
          message="You'll stop receiving this club's announcements and event alerts."
          confirmLabel="Leave club"
        />
      </>
    );
  }
  if (status === 'PENDING') {
    return (
      <Button size={size} variant="secondary" icon={Clock} className={className} onClick={() => leave.mutate()} loading={leave.isPending} title="Cancel request">
        Requested
      </Button>
    );
  }
  return (
    <Button size={size} icon={UserPlus} className={className} loading={join.isPending} onClick={() => requireAuth() && join.mutate()}>
      {club.membershipType === 'APPROVAL_REQUIRED' ? 'Request' : 'Join Club'}
    </Button>
  );
}
