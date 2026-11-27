// Connection to the shared-tree database (Supabase). These values are public by design:
// the publishable key only allows what the database's row-level security rules allow.
// Override at build time with VITE_SUPABASE_URL / VITE_SUPABASE_KEY, or set both to '' to turn sharing off.
export const CLOUD = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://mzctcxhrhyrlolrszhwf.supabase.co',
  key: (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_G2Yc7ivNOs6OUQ4epnefiQ_JTOdeHVc',
  /** where invite links point (the hosted web app) */
  appUrl: 'https://techtool4u.github.io/familytree/',
};
