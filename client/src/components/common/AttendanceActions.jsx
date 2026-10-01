import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Star, X } from 'lucide-react';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { useRequireAuth } from './Actions.jsx';

/**
 * Interested / Going / Cancel controls for an event or FDFS.
 * `mutate(id, status)` is eventApi.attendance or fdfsApi.join.
 */
export function AttendanceActions({ item, mutate, queryKey, goingLabel = "I'm Going" }) {
  const qc = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const m = useMutation({
    mutationFn: (status) => mutate(item._id, status),
    onSuccess: (d) => {
      toast.success(
        d.status === 'GOING' ? "You're in! We'll remind you before it starts." : d.status === 'INTERESTED' ? 'Marked as interested' : 'Registration cancelled'
      );
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['me', 'registrations'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const act = (s) => requireAuth() && m.mutate(s);
  const status = item.myStatus;
  const reg = item.registration || { open: true };

  if (status === 'ATTENDED') {
    return (
      <Button variant="outline" icon={Check} disabled>
        Attended
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {status === 'GOING' ? (
        <Button variant="outline" icon={Check} onClick={() => act('CANCELLED')} loading={m.isPending && m.variables === 'CANCELLED'} title="Cancel registration">
          You're going
        </Button>
      ) : (
        <Button icon={Check} onClick={() => act('GOING')} disabled={!reg.open} loading={m.isPending && m.variables === 'GOING'}>
          {reg.open ? goingLabel : reg.reason}
        </Button>
      )}
      {status !== 'GOING' &&
        (status === 'INTERESTED' ? (
          <Button variant="secondary" icon={X} onClick={() => act('CANCELLED')} loading={m.isPending && m.variables === 'CANCELLED'}>
            Not interested
          </Button>
        ) : (
          <Button variant="secondary" icon={Star} onClick={() => act('INTERESTED')} disabled={['CANCELLED', 'COMPLETED'].includes(item.status)} loading={m.isPending && m.variables === 'INTERESTED'}>
            I'm Interested
          </Button>
        ))}
    </div>
  );
}
