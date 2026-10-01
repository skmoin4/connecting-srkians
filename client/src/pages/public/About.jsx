import { BadgeCheck, Clapperboard, Lock, MapPin, Users } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader, Reveal } from '../../components/common/Reveal.jsx';
import { Button } from '../../components/ui/Button.jsx';

const PILLARS = [
  [MapPin, 'City first', 'Everything starts with your city — the fastest way to find SRKians who live near you.'],
  [BadgeCheck, 'Verified clubs', 'Fan clubs are reviewed by our moderators before they appear in the directory.'],
  [Lock, 'Privacy by default', 'Admins choose what contact details are public. Everyone else uses in-app contact.'],
  [Clapperboard, 'Made for FDFS', 'Theatre, show time and meeting points for every city — straight from the organisers.'],
  [Users, 'Not a social feed', 'No likes, no followers, no timeline. Just real fans meeting in real life.'],
];

export default function About() {
  const s = useSettings();
  return (
    <>
      <Seo title="About" description={s.description} />
      <PageHeader eyebrow={`About ${s.platformName}`} title="A dedicated city-based network for SRKians" subtitle={s.description} />
      <div className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.05} className="card p-6">
              <Icon className="size-6 text-gold-400" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold text-fog-100">{title}</h2>
              <p className="mt-1.5 text-sm text-fog-400">{text}</p>
            </Reveal>
          ))}
        </div>
        <div className="card mt-10 border-gold-500/20 p-6 sm:p-8">
          <h2 className="eyebrow mb-3">Independent fan community</h2>
          <p className="max-w-3xl leading-relaxed text-fog-300">{s.disclaimer}</p>
          <p className="mt-3 max-w-3xl text-sm text-fog-400">
            “Verified Fan Club” means a club has been verified by this platform’s moderators. It does not imply any official verification or endorsement by Shah Rukh Khan, Red Chillies Entertainment or any studio.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button to="/cities">Find your city</Button>
          <Button to="/fan-clubs/register" variant="outline">
            Register your fan club
          </Button>
        </div>
      </div>
    </>
  );
}
