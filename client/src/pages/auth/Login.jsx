import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorMessage } from '../../api/client.js';
import { Seo } from '../../components/common/Seo.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { loginSchema } from '../../validations/schemas.js';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your SRKian account.">
      <Seo title="Sign in" noindex />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <p role="alert" className="rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-400">
            {serverError}
          </p>
        )}
        <Input label="Email or username" icon={User} autoComplete="username" error={errors.identifier?.message} {...register('identifier')} />
        <div className="relative">
          <Input label="Password" icon={Lock} type={show ? 'text' : 'password'} autoComplete="current-password" error={errors.password?.message} fieldClassName="pr-11" {...register('password')} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-[2.1rem] right-2 rounded-lg p-2 text-fog-400 hover:text-fog-100" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-gold-300 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
        <p className="text-center text-sm text-fog-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-gold-300 hover:underline">
            Join the SRKian family
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
