import { Award, Clapperboard, Crown, Flame, Handshake, Heart, MapPin, Medal, Sparkles, Star, Ticket, Trophy, Users } from 'lucide-react';

/** Icons available to admin-configured badges (Badge.icon). Keep in sync with Admin → Badges. */
export const BADGE_ICONS = {
  award: Award,
  sparkles: Sparkles,
  'map-pin': MapPin,
  users: Users,
  clapperboard: Clapperboard,
  star: Star,
  handshake: Handshake,
  crown: Crown,
  trophy: Trophy,
  medal: Medal,
  heart: Heart,
  flame: Flame,
  ticket: Ticket,
};

export function BadgeIcon({ name, className }) {
  const Icon = BADGE_ICONS[name] || Award;
  return <Icon className={className} aria-hidden />;
}
