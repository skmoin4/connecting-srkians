import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorMessage, fieldErrors } from '../../api/client.js';
import { Seo } from '../../components/common/Seo.jsx';
import { LocationSelector } from '../../components/common/LocationSelector.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Textarea } from '../../components/ui/Form.jsx';
import { registerSchema } from '../../validations/schemas.js';
import AuthShell from './AuthShell.jsx';

const storedRef = () => {
  try {
    return sessionStorage.getItem('srk.ref') || '';
  } catch {
    return '';
  }
};

export default function Register() {
  const { register: signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [more, setMore] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: '', state: '', city: '', referralCode: params.get('ref') || storedRef() },
  });
  const [country, state, city] = watch(['country', 'state', 'city']);
  const setLocation = useCallback((v) => ['country', 'state', 'city'].forEach((k) => setValue(k, v[k] || '', { shouldValidate: isSubmitted })), [setValue, isSubmitted]);

  const onSubmit = async ({ confirmPassword, agree, ...values }) => {
    setServerError('');
    try {
      await signUp(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')));
      try {
        sessionStorage.removeItem('srk.ref');
      } catch {
        /* ignore */
      }
      toast.success('Welcome to the SRKian family!');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      fieldErrors(e).forEach((fe) => fe.field && setError(fe.field, { message: fe.message }));
      setServerError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Join the family" subtitle="Create your SRKian profile and find your city community." wide>
      <Seo title="Create account" description="Join the SRKian network — find your city, your fan club and your SRKian family." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <p role="alert" className="rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-400">
            {serverError}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Username" required autoComplete="username" hint="Your public handle, e.g. raj_nashik" error={errors.username?.message} {...register('username')} />
          <Input label="Email" required type="email" autoComplete="email" className="sm:col-span-2" error={errors.email?.message} {...register('email')} />
          <Input label="Password" required type="password" autoComplete="new-password" hint="8+ characters with a letter and a number" error={errors.password?.message} {...register('password')} />
          <Input label="Confirm password" required type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-fog-100">Your city</p>
          <LocationSelector required value={{ country, state, city }} onChange={setLocation} errors={{ country: errors.country?.message, state: errors.state?.message, city: errors.city?.message }} />
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-2 text-sm font-semibold text-gold-300" aria-expanded={more}>
          <ChevronDown className={`size-4 transition-transform ${more ? 'rotate-180' : ''}`} aria-hidden /> Fan profile (optional)
        </button>
        {more && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Favourite SRK movie" placeholder="e.g. Swades" error={errors.favouriteMovie?.message} {...register('favouriteMovie')} />
            <Input label="Instagram" placeholder="yourhandle" error={errors.instagram?.message} {...register('instagram')} />
            <Input label="Favourite dialogue" className="sm:col-span-2" placeholder="“Picture abhi baaki hai, mere dost.”" error={errors.favouriteDialogue?.message} {...register('favouriteDialogue')} />
            <Textarea label="Bio" rows={3} className="sm:col-span-2" maxLength={300} error={errors.bio?.message} {...register('bio')} />
          </div>
        )}

        <Input label="Referral code (optional)" icon={Gift} placeholder="SRK-XXXX" error={errors.referralCode?.message} {...register('referralCode')} />

        <label className="flex items-start gap-3 text-sm text-fog-300">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-gold-500)]" {...register('agree')} />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="text-gold-300 underline" target="_blank">
              Terms
            </Link>
            ,{' '}
            <Link to="/privacy" className="text-gold-300 underline" target="_blank">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/community-guidelines" className="text-gold-300 underline" target="_blank">
              Community Guidelines
            </Link>
            .
          </span>
        </label>
        {errors.agree && (
          <p role="alert" className="-mt-4 text-xs text-crimson-400">
            {errors.agree.message}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create my account
        </Button>
        <p className="text-center text-sm text-fog-400">
          Already a member?{' '}
          <Link to="/login" className="font-semibold text-gold-300 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
