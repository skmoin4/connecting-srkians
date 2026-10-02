import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { fanClubApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { LocationSelector } from '../../components/common/LocationSelector.jsx';
import { ImageUpload } from '../../components/common/ImageUpload.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { EmptyState } from '../../components/ui/Display.jsx';
import { fanClubSchema, toPayload } from '../../validations/schemas.js';
import { MEMBERSHIP_TYPES } from '../../constants/index.js';

export default function FanClubRegister() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [images, setImages] = useState({ logo: null });
  const [visibility, setVisibility] = useState({ showInstagram: true, showWhatsApp: false, showPhone: false, showWhatsAppGroup: false });
  const [membershipType, setMembershipType] = useState('OPEN');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(fanClubSchema),
    defaultValues: {
      country: user?.country?._id || '',
      state: user?.state?._id || '',
      city: user?.city?._id || '',
      adminName: user?.fullName || '',
    },
  });

  const [country, state, city] = watch(['country', 'state', 'city']);
  const setLocation = useCallback(
    (v) => ['country', 'state', 'city'].forEach((k) => setValue(k, v[k] || '', { shouldValidate: isSubmitted })),
    [setValue, isSubmitted]
  );

  const m = useMutation({
    mutationFn: (values) =>
      fanClubApi.apply({
        ...toPayload(values, ['approxMemberCount']),
        ...images,
        contactVisibility: visibility,
        membershipType,
        foundedDate: values.foundedDate || undefined,
      }),
    onSuccess: async () => {
      toast.success('Application submitted — pending verification.');
      await refreshUser();
      navigate('/my-fan-club');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!isAuthenticated) {
    return (
      <div className="container-page py-16">
        <Seo title="Register Your Fan Club" />
        <EmptyState
          icon={ShieldCheck}
          title="Sign in to register your fan club"
          message="Fan club admins need an account so members can reach them and the platform can verify the club."
          action={
            <div className="flex gap-2">
              <Button to="/login" state={{ from: '/fan-clubs/register' }}>
                Sign in
              </Button>
              <Button to="/register" variant="secondary">
                Create account
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <>
      <Seo title="Register Your Fan Club" description="Register your SRK fan club and get verified by the platform." />
      <PageHeader eyebrow="For fan club admins" title="Register your fan club" subtitle="Applications are reviewed by the platform team. Approved clubs get the Verified Fan Club badge (platform verification — not official affiliation)." />

      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="min-w-0 space-y-8">
          <fieldset className="card min-w-0 space-y-5 p-5 sm:p-6" aria-labelledby="fs-identity">
            {/* A heading, not a <legend>: a floated legend shrank these grids to zero width,
                and an unfloated one renders inside the card border. aria-labelledby keeps the
                group named for screen readers. */}
            <h2 id="fs-identity" className="eyebrow mb-2">Club identity</h2>
            <Input label="Fan club name" required placeholder="e.g. SRK Aryan FC Nashik" error={errors.name?.message} {...register('name')} />
            <Textarea label="Description" required rows={5} placeholder="Who you are, what you do, how long you've been running…" error={errors.description?.message} {...register('description')} />
            {/* Cover image lives in the club dashboard instead: one picture is enough to get
                verified, and asking for three at sign-up was the main thing people dropped out on. */}
            <ImageUpload
              label="Logo"
              value={images.logo}
              onChange={(v) => setImages((s) => ({ ...s, logo: v }))}
              folder="fan-clubs"
              aspect="aspect-square max-w-40"
              rounded="rounded-full"
            />
          </fieldset>

          <fieldset className="card min-w-0 space-y-5 p-5 sm:p-6" aria-labelledby="fs-location">
            <h2 id="fs-location" className="eyebrow mb-2">Location</h2>
            <LocationSelector
              required
              value={{ country, state, city }}
              errors={{ country: errors.country?.message, state: errors.state?.message, city: errors.city?.message }}
              onChange={setLocation}
            />
          </fieldset>

          <fieldset className="card min-w-0 space-y-5 p-5 sm:p-6" aria-labelledby="fs-contact">
            <h2 id="fs-contact" className="eyebrow mb-2">Admin & contact</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Admin name" required error={errors.adminName?.message} {...register('adminName')} />
              <Input label="Admin account" value={`@${user.username}`} disabled hint="The club will be linked to your account" />
              <Input label="Instagram username" placeholder="srkaryanfc_nashik" error={errors.instagram?.message} {...register('instagram')} />
              <Input label="WhatsApp number" inputMode="tel" placeholder="98xxxxxxxx" error={errors.whatsappNumber?.message} {...register('whatsappNumber')} />
              <Input label="Phone (optional)" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
              <Input label="WhatsApp group link" placeholder="https://chat.whatsapp.com/…" error={errors.whatsappGroupLink?.message} {...register('whatsappGroupLink')} />
              <Input label="Telegram link (optional)" placeholder="https://t.me/…" error={errors.telegramLink?.message} {...register('telegramLink')} />
              <Input label="Website (optional)" placeholder="https://" error={errors.website?.message} {...register('website')} />
            </div>
            <div className="rounded-xl border border-white/5 bg-ink-850 p-4">
              <p className="mb-1 text-sm font-semibold text-fog-100">Contact visibility</p>
              <p className="mb-2 text-xs text-fog-400">Hidden details are never sent to the public — members use “Contact Admin” instead.</p>
              <Switch label="Show Instagram" checked={visibility.showInstagram} onChange={(v) => setVisibility((s) => ({ ...s, showInstagram: v }))} />
              <Switch label="Show WhatsApp number" checked={visibility.showWhatsApp} onChange={(v) => setVisibility((s) => ({ ...s, showWhatsApp: v }))} />
              <Switch label="Show phone number" checked={visibility.showPhone} onChange={(v) => setVisibility((s) => ({ ...s, showPhone: v }))} />
              <Switch label="Show WhatsApp group link" checked={visibility.showWhatsAppGroup} onChange={(v) => setVisibility((s) => ({ ...s, showWhatsAppGroup: v }))} />
            </div>
          </fieldset>

          <fieldset className="card min-w-0 space-y-5 p-5 sm:p-6" aria-labelledby="fs-verification">
            <h2 id="fs-verification" className="eyebrow mb-2">Verification & details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Founded date (optional)" type="date" {...register('foundedDate')} />
              <Input label="Approximate members (optional)" type="number" min="0" {...register('approxMemberCount')} />
              <Select label="Membership" value={membershipType} onChange={(e) => setMembershipType(e.target.value)} options={Object.entries(MEMBERSHIP_TYPES).map(([value, label]) => ({ value, label }))} />
            </div>
            <Textarea label="Additional information (optional)" rows={3} {...register('additionalInfo')} />
          </fieldset>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <BadgeCheck className="size-7 text-gold-400" aria-hidden />
            <h2 className="mt-3 font-semibold text-fog-100">What happens next?</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-fog-400">
              <li>Your application is marked <strong className="text-amber-300">Pending verification</strong>.</li>
              <li>A moderator reviews it and may request changes.</li>
              <li>Once approved, your club appears in the directory with the Verified badge and you unlock the fan club dashboard.</li>
            </ol>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={m.isPending}>
            Submit for verification
          </Button>
          <p className="text-center text-xs text-fog-500">“Verified” means verified by this platform only — it never implies official endorsement.</p>
        </aside>
      </form>
    </>
  );
}
