import { motion, useReducedMotion } from 'framer-motion';

/** Subtle scroll-reveal. Disabled automatically for prefers-reduced-motion. */
export function Reveal({ children, delay = 0, className, as = 'div', y = 18 }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] || motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children, image }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-white/5">
      {image ? (
        <>
          <img src={image} alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
        </>
      ) : (
        <div className="vignette absolute inset-0 -z-10" aria-hidden />
      )}
      <div className="container-page py-10 sm:py-14">
        <Reveal>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="display text-5xl text-fog-100 sm:text-6xl lg:text-7xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-base text-fog-300 sm:text-lg">{subtitle}</p>}
        </Reveal>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
