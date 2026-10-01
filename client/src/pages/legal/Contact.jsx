import { Flag, Mail, UsersRound } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { InstagramIcon, WhatsAppIcon } from '../../components/ui/BrandIcons.jsx';
import { instagramUrl, whatsappUrl } from '../../utils/format.js';

export default function Contact() {
  const s = useSettings();
  const cards = [
    s.contactEmail && { icon: Mail, title: 'Email the platform team', text: s.contactEmail, href: `mailto:${s.contactEmail}`, cta: 'Send email' },
    s.social?.instagram && { icon: InstagramIcon, title: 'Instagram', text: 'DM us for quick questions', href: s.social.instagram.startsWith('http') ? s.social.instagram : instagramUrl(s.social.instagram), cta: 'Open Instagram' },
    s.social?.whatsapp && { icon: WhatsAppIcon, title: 'WhatsApp', text: 'Message the platform team', href: s.social.whatsapp.startsWith('http') ? s.social.whatsapp : whatsappUrl(s.social.whatsapp), cta: 'Open WhatsApp' },
  ].filter(Boolean);

  return (
    <>
      <Seo title="Contact" />
      <PageHeader eyebrow="Contact" title="Get in touch" subtitle="Questions about the platform, verification or partnerships? Here's how to reach us." />
      <div className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ icon: Icon, title, text, href, cta }) => (
          <div key={title} className="card p-6">
            <Icon className="size-6 text-gold-400" />
            <h2 className="mt-4 font-semibold text-fog-100">{title}</h2>
            <p className="mt-1 text-sm break-words text-fog-400">{text}</p>
            <Button href={href} variant="secondary" size="sm" className="mt-4">
              {cta}
            </Button>
          </div>
        ))}
        <div className="card p-6">
          <UsersRound className="size-6 text-gold-400" aria-hidden />
          <h2 className="mt-4 font-semibold text-fog-100">Contact a fan club</h2>
          <p className="mt-1 text-sm text-fog-400">Open any fan club page and use “Contact Admin” — your message goes straight to their verified admin.</p>
          <Button to="/fan-clubs" variant="secondary" size="sm" className="mt-4">
            Browse fan clubs
          </Button>
        </div>
        <div className="card p-6">
          <Flag className="size-6 text-gold-400" aria-hidden />
          <h2 className="mt-4 font-semibold text-fog-100">Report a problem</h2>
          <p className="mt-1 text-sm text-fog-400">Spotted a scam, impersonation or wrong information? Use the Report button on the club, event or FDFS page.</p>
        </div>
        {cards.length === 0 && (
          <div className="card p-6 text-sm text-fog-400">The platform team hasn't published contact details yet (Admin → Settings → Contact email).</div>
        )}
      </div>
    </>
  );
}
