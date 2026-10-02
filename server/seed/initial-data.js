/**
 * Initial launch configuration. Everything here is data — nothing is hardcoded in components.
 * Edit this file (or use the admin panel after seeding) to change launch data.
 */
export const LAUNCH = {
  country: { name: 'India', code: 'IN' },
  state: { name: 'Maharashtra' },
  cities: [
    { name: 'Nashik', featured: true, description: 'The launch city of the SRKian network. Home to passionate SRKians and the first verified fan club on the platform.' },
    { name: 'Mumbai', featured: true, description: 'The city of dreams — and of Mannat.' },
    { name: 'Pune', featured: true },
    { name: 'Nagpur' },
    { name: 'Aurangabad' },
  ],
  launchCity: 'Nashik',

  // Initial fan club for Nashik. Contact visibility defaults are privacy-first: the club admin can
  // switch WhatsApp visibility on from /fan-club/settings (showWhatsApp → true).
  fanClub: {
    name: 'SRK Aryan FC Nashik',
    description:
      'SRK Aryan FC Nashik brings together Shah Rukh Khan fans across Nashik for fan meets, birthday celebrations, charity drives and, of course, the loudest FDFS celebrations in the city.',
    instagram: 'srkaryanfc_nashik',
    whatsappNumber: '7020318629',
    contactVisibility: { showInstagram: true, showWhatsApp: false, showPhone: false, showWhatsAppGroup: false },
    membershipType: 'OPEN',
  },
};

export const DEFAULT_BADGES = [
  { code: 'NEW_SRKIAN', name: 'New SRKian', description: 'Joined the SRKian family.', icon: 'sparkles', tier: 'BRONZE', rule: { type: 'JOINED', threshold: 1 } },
  { code: 'NASHIK_SRKIAN', name: 'Nashik SRKian', description: 'Proud member of the Nashik SRKian community.', icon: 'map-pin', tier: 'BRONZE', rule: { type: 'CITY_MEMBER', threshold: 1, cityName: 'Nashik' } },
  { code: 'FAN_CLUB_MEMBER', name: 'Fan Club Member', description: 'Joined a verified fan club.', icon: 'users', tier: 'BRONZE', rule: { type: 'FANCLUB_MEMBER', threshold: 1 } },
  { code: 'FDFS_WARRIOR', name: 'FDFS Warrior', description: 'Checked in at a First Day First Show.', icon: 'clapperboard', tier: 'SILVER', rule: { type: 'FDFS_ATTENDED', threshold: 1 } },
  { code: 'EVENT_STAR', name: 'Event Star', description: 'Attended 3 fan events.', icon: 'star', tier: 'SILVER', rule: { type: 'EVENTS_ATTENDED', threshold: 3 } },
  { code: 'COMMUNITY_BUILDER', name: 'Community Builder', description: 'Brought 5 SRKians into the family.', icon: 'handshake', tier: 'GOLD', rule: { type: 'REFERRALS', threshold: 5 } },
  { code: 'CITY_CHAMPION', name: 'City Champion', description: 'Earned 500 community points.', icon: 'crown', tier: 'GOLD', rule: { type: 'POINTS', threshold: 500 } },
  // Moment badges use the MANUAL rule so evaluateBadges never hands them out on a threshold —
  // they are awarded by awardMomentBadges when someone turns up while the moment is live.
  { code: 'BIRTHDAY_SQUAD', name: 'Birthday Squad', description: 'Celebrated 2 November with your city.', icon: 'cake', tier: 'GOLD', rule: { type: 'MANUAL' } },
  { code: 'ANNIVERSARY_CLUB', name: 'Anniversary Club', description: 'Showed up for a film anniversary.', icon: 'clapperboard', tier: 'SILVER', rule: { type: 'MANUAL' } },
];

/**
 * Dates the fandom already celebrates. Stored as recurring day/month, so they return every year
 * without re-seeding. `badge` refers to a DEFAULT_BADGES code.
 */
export const DEFAULT_MOMENTS = [
  {
    code: 'SRK_BIRTHDAY',
    title: "King Khan's Birthday",
    subtitle: '2 November',
    description: 'The day the fandom comes out in full force. Celebrate with your city.',
    type: 'BIRTHDAY',
    day: 2,
    month: 11,
    sinceYear: 1965,
    windowDays: 1,
    icon: 'cake',
    badge: 'BIRTHDAY_SQUAD',
  },
  {
    code: 'DDLJ_ANNIVERSARY',
    title: 'DDLJ Anniversary',
    subtitle: '20 October',
    description: 'The film that never left the theatre. Mark the day with a screening or meet-up.',
    type: 'ANNIVERSARY',
    day: 20,
    month: 10,
    sinceYear: 1995,
    windowDays: 1,
    icon: 'clapperboard',
    badge: 'ANNIVERSARY_CLUB',
  },
  {
    code: 'PATHAAN_ANNIVERSARY',
    title: 'Pathaan Anniversary',
    subtitle: '25 January',
    description: 'The comeback that broke every record.',
    type: 'ANNIVERSARY',
    day: 25,
    month: 1,
    sinceYear: 2023,
    windowDays: 1,
    icon: 'clapperboard',
    badge: 'ANNIVERSARY_CLUB',
  },
];
