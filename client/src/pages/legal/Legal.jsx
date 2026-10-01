import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Seo } from '../../components/common/Seo.jsx';
import { PageHeader } from '../../components/common/Reveal.jsx';

/**
 * Plain-language starting templates. Review them with a legal professional before launch and
 * update the contact address in Admin → Settings.
 */
const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    sections: (s) => [
      ['What we collect', `When you create an account we store your name, username, email, password (hashed — we never see it), and the city you select. Optional profile details (bio, favourite movie, dialogue, Instagram handle, photo) are stored only if you add them.`],
      ['How we use it', `To show you your city community, fan clubs, events and FDFS; to send notifications you have opted into; to keep the platform safe (moderation, abuse prevention); and to count real participation for points and badges.`],
      ['What is public', `Your public profile shows only what your privacy settings allow. Your email address, phone number and account credentials are never shown publicly or shared with fan club admins. Fan club admins decide whether their own contact details are public.`],
      ['Contact requests', `Messages you send through “Contact Admin” are delivered to the fan club’s verified admin and stored so both sides can see the conversation status.`],
      ['Cookies', `We use a single secure, httpOnly cookie to keep you signed in. We do not use advertising trackers.`],
      ['Your choices', `You can edit your profile, change your privacy and notification settings, or delete your account at any time from Settings. Deleting your account anonymises your personal data.`],
      ['Contact', s.contactEmail ? `Questions? Email ${s.contactEmail}.` : 'Questions? Use the Contact page.'],
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: (s) => [
      ['About the service', `${s.platformName} is an independent, fan-run community platform. ${s.disclaimer}`],
      ['Your account', 'You are responsible for your account and for keeping your password safe. Provide accurate information, especially your city.'],
      ['Fan clubs', 'Fan club admins must be authorised to represent their club. Verification is performed by this platform only and may be withdrawn if information is inaccurate or rules are broken.'],
      ['Events & FDFS', 'Events and FDFS are organised by fan clubs, not by the platform. Details are provided by organisers; always confirm timings and venues with them. Attend at your own responsibility and follow venue rules and local laws.'],
      ['Content', 'Only upload images and information you have the right to use. Do not upload copyrighted posters or celebrity photos unless you have permission.'],
      ['Moderation', 'We may remove listings, suspend clubs or accounts that break these terms or the Community Guidelines.'],
      ['Liability', 'The platform is provided “as is”. We are not responsible for transactions or arrangements between members and fan clubs.'],
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    sections: () => [
      ['Respect every SRKian', 'No harassment, hate speech, threats or bullying — online or at events.'],
      ['No scams', 'Never ask members for money outside of clearly explained, legitimate event costs. Report suspicious ticket sales or payment requests immediately.'],
      ['No impersonation', 'Do not pretend to be Shah Rukh Khan, his family, Red Chillies Entertainment, or another fan club or admin.'],
      ['Accurate listings', 'Only publish event and FDFS details you have confirmed. Use “To Be Announced” when details are unknown.'],
      ['Safe events', 'Follow theatre and venue rules. No dangerous stunts, fireworks inside venues or blocking public roads.'],
      ['Report problems', 'Use the Report button on any club, event, FDFS or profile. Moderators review every report.'],
    ],
  },
  copyright: {
    title: 'Copyright Policy',
    sections: (s) => [
      ['Uploaded content', 'Fan clubs and admins may only upload logos, posters and photos they created or have permission to use. The platform does not automatically pull images from Instagram, YouTube, Google Images or news sites.'],
      ['Celebrity & film imagery', 'Film posters, stills and celebrity photographs are usually protected by copyright. Do not upload them unless the rights holder has permitted it.'],
      ['Takedown requests', `If you believe content on the platform infringes your rights, use the Report button with reason “Copyright concern” or contact us${s.contactEmail ? ` at ${s.contactEmail}` : ''} with the URL and details. We will review and remove infringing content promptly.`],
    ],
  },
  disclaimer: {
    title: 'Independent Fan Community Disclaimer',
    sections: (s) => [
      ['Not official', s.disclaimer],
      ['Verified means platform-verified', '“Verified Fan Club” means our moderators have reviewed the club. It does not mean the club is recognised by Shah Rukh Khan, Red Chillies Entertainment or any studio or production company.'],
      ['Event details', 'All event and FDFS details come from fan club organisers. The platform does not sell tickets or organise screenings.'],
    ],
  },
};

export default function Legal({ page }) {
  const s = useSettings();
  const p = PAGES[page];
  return (
    <>
      <Seo title={p.title} />
      <PageHeader eyebrow="Legal" title={p.title} />
      <article className="container-page max-w-3xl py-12">
        {p.sections(s).map(([h, body]) => (
          <section key={h} className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-fog-100">{h}</h2>
            <p className="leading-relaxed text-fog-300">{body}</p>
          </section>
        ))}
        <p className="mt-12 border-t border-white/5 pt-6 text-sm text-fog-500">
          See also: <Link to="/privacy" className="text-gold-300 hover:underline">Privacy</Link> · <Link to="/terms" className="text-gold-300 hover:underline">Terms</Link> ·{' '}
          <Link to="/community-guidelines" className="text-gold-300 hover:underline">Community guidelines</Link> · <Link to="/copyright" className="text-gold-300 hover:underline">Copyright</Link> ·{' '}
          <Link to="/disclaimer" className="text-gold-300 hover:underline">Disclaimer</Link>
        </p>
      </article>
    </>
  );
}
