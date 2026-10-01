import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { SITE_URL } from '../../constants/index.js';

/**
 * Per-page SEO. React 19 hoists <title>, <meta> and <link> rendered anywhere into <head>.
 */
export function Seo({ title, description, image, type = 'website', jsonLd, noindex = false }) {
  const settings = useSettings();
  const { pathname } = useLocation();
  const template = settings.seo?.titleTemplate || `%s | ${settings.platformName}`;
  const fullTitle = title ? template.replace('%s', title) : settings.seo?.defaultTitle || `${settings.platformName} — ${settings.tagline}`;
  const desc = description || settings.seo?.defaultDescription || settings.description;
  const canonical = `${SITE_URL}${pathname}`;
  const ogImage = image || settings.seo?.ogImage?.url;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {settings.seo?.keywords && <meta name="keywords" content={settings.seo.keywords} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:site_name" content={settings.platformName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
