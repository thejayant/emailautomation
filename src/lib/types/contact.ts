export type ContactRecord = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  source?: string | null;
  unsubscribed_at?: string | null;
};
