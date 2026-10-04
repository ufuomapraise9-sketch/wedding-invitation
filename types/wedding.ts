export type WeddingTheme =
  | "champagne"
  | "rose"
  | "garden"
  | "classic"
  | "burgundy-pink";

export type WeddingEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  dressCode: string;
  directions: {
    href: string;
    label: string;
  };
};

export type Wedding = {
  id: string;
  brideName: string;
  groomName: string;
  initials: string;
  monogram: string;
  hashtag: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  groomPhoto: string | null;
  couplePhoto: string | null;
  gallery: string[];
  events: WeddingEvent[];
  invitationMessage: string;
  bibleVerse: string;
  brideParents: string[];
  groomParents: string[];
  rsvpName: string;
  rsvpPhone: string;
  rsvpEmail: string;
  rsvpMaxGuests: number;
  childrenInvited: boolean;
  guestManagement: {
    estimatedGuestCount: number;
    defaultSeatAllocation: number;
    vipCategories: boolean;
    specialNotes: boolean;
  };
  story: string;
  theme: WeddingTheme;
};
