import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';

/**
 * Announcement composer. `targets` = [{ value, label, field?, options? }] — the caller decides
 * which scopes are allowed (club admins: FAN_CLUB/EVENT/FDFS; moderators: CITY; super admin: all).
 * The server re-validates the target and the author's authority.
 */
export function AnnouncementFormModal({ open, onClose, targets, defaults = {} }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({});
  useEffect(() => {
    if (open) setF({ title: '', body: '', link: '', target: targets[0]?.value, targetId: '', pinned: false, notify: true, ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const t = targets.find((x) => x.value === f.target) || targets[0];

  const m = useMutation({
    mutationFn: () =>
      announcementApi.create({
        title: f.title,
        body: f.body || undefined,
        link: f.link || undefined,
        target: f.target,
        pinned: f.pinned,
        notify: f.notify,
        ...(t?.field ? { [t.field]: f.targetId || t.fixedId } : {}),
      }),
    onSuccess: () => {
      toast.success(f.notify ? 'Announcement published and members notified' : 'Announcement published');
      qc.invalidateQueries({ queryKey: ['managed-announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const needsPick = t?.field && !t.fixedId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New announcement"
      description="Announcements are official notices — not posts. Keep them short and useful."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!f.title || f.title.length < 3 || (needsPick && !f.targetId)}>
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Audience" value={f.target || ''} onChange={(e) => setF((s) => ({ ...s, target: e.target.value, targetId: '' }))} options={targets.map(({ value, label }) => ({ value, label }))} />
          {needsPick && <Select label="Which one?" value={f.targetId || ''} onChange={set('targetId')} placeholder="Select" options={t.options || []} />}
        </div>
        <Input label="Title" required maxLength={150} value={f.title || ''} onChange={set('title')} placeholder="e.g. KING FDFS registrations are now open" />
        <Textarea label="Details" rows={4} maxLength={2000} value={f.body || ''} onChange={set('body')} />
        <Input label="Link (optional)" value={f.link || ''} onChange={set('link')} placeholder="/fdfs/king-nashik" hint="Internal path, e.g. /fdfs/king-nashik" />
        <Switch label="Pin to top" checked={f.pinned} onChange={(v) => setF((s) => ({ ...s, pinned: v }))} />
        <Switch label="Send notification" description="Respects each member's notification preferences" checked={f.notify} onChange={(v) => setF((s) => ({ ...s, notify: v }))} />
      </div>
    </Modal>
  );
}
