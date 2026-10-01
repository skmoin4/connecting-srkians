/** Points are earned through verified participation — never through social engagement. */
export const POINT_RULES = Object.freeze({
  PROFILE_COMPLETE: 10,
  JOIN_CITY: 5,
  JOIN_VERIFIED_FANCLUB: 15,
  JOIN_EVENT: 20,
  ATTEND_EVENT: 50,
  FDFS_JOIN: 20,
  FDFS_ATTEND: 50,
  REFERRAL: 20,
  ADMIN_AWARD: 0, // variable
  COMMUNITY_CONTRIBUTION: 0, // variable
});

export const POINT_REASONS = Object.keys(POINT_RULES);

// Referral abuse limits
export const REFERRAL_DAILY_REWARD_LIMIT = 20;
export const REFERRAL_SAME_IP_LIMIT = 3;
