import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/format.js';

const VARIANTS = {
  primary: 'bg-crimson-500 text-white hover:bg-crimson-600 active:bg-crimson-700 shadow-[0_8px_24px_-12px_rgb(225_29_46/0.8)]',
  gold: 'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600',
  secondary: 'bg-ink-800 text-fog-100 border border-white/10 hover:border-white/20 hover:bg-ink-700',
  outline: 'border border-gold-500/50 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400',
  ghost: 'text-fog-200 hover:bg-white/5 hover:text-fog-100',
  danger: 'bg-crimson-700/20 text-crimson-400 border border-crimson-500/30 hover:bg-crimson-700/35',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'size-10 justify-center',
};

/**
 * Button — renders a <button>, or a router <Link> when `to` is set, or <a> when `href` is set.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, to, href, icon: Icon, iconRight: IconRight, ...props },
  ref
) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center whitespace-nowrap justify-center rounded-xl font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className
  );
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="size-4" aria-hidden />}
    </>
  );
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});
