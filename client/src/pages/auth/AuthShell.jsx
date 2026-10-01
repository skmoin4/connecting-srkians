import { useSettings } from '../../context/SettingsContext.jsx';

export default function AuthShell({ title, subtitle, children, wide = false }) {
  const s = useSettings();
  return (
    <div className="relative isolate min-h-[calc(100dvh-4rem)] py-10 sm:py-16">
      <div className="vignette absolute inset-0 -z-10" aria-hidden />
      <div className={`container-page ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <p className="eyebrow mb-2 text-center">{s.platformName}</p>
        <h1 className="display text-center text-5xl text-fog-100 sm:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-2 max-w-md text-center text-fog-400">{subtitle}</p>}
        <div className="card mt-8 p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
