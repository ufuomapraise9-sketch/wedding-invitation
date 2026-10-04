import type { Wedding } from "@/types/wedding";

const samplePhoto = "/couple.jpg";

type PreviousWedding = Pick<
  Wedding,
  | "id"
  | "brideName"
  | "groomName"
  | "date"
  | "time"
  | "venue"
  | "location"
  | "rsvpName"
  | "rsvpPhone"
  | "story"
  | "theme"
>;

function restorePreviousWedding(wedding: PreviousWedding): Wedding {
  const initials = `${wedding.brideName[0]} & ${wedding.groomName[0]}`;

  return {
    ...wedding,
    initials,
    monogram: initials,
    hashtag: "",
    groomPhoto: null,
    couplePhoto: samplePhoto,
    gallery: [samplePhoto, samplePhoto, samplePhoto, samplePhoto],
    events: [],
    invitationMessage: "",
    bibleVerse: "",
    brideParents: [],
    groomParents: [],
    rsvpEmail: "",
    rsvpMaxGuests: 5,
    childrenInvited: false,
    guestManagement: {
      estimatedGuestCount: 0,
      defaultSeatAllocation: 5,
      vipCategories: false,
      specialNotes: false,
    },
  };
}

export const weddings: Wedding[] = [
  restorePreviousWedding({
    id: "sandra-daniel",
    brideName: "Sandra Timothy",
    groomName: "Daniel Samson",
    date: "2027-04-16",
    time: "10:00 AM",
    venue: "Rock of Ages Christian Assembly",
    location: "Lagos, Nigeria",
    rsvpName: "Prince Will",
    rsvpPhone: "08134 169733",
    story:
      "Some of life’s most beautiful moments begin when two hearts find their way to one another. With love as their guide and a future unfolding before them, Sandra and Daniel are beginning a new chapter together—and would be so glad to share this joyful day with you.",
    theme: "champagne",
  }),
  restorePreviousWedding({
    id: "amara-daniel",
    brideName: "Amara Johnson",
    groomName: "Daniel Williams",
    date: "2027-08-21",
    time: "2:00 PM",
    venue: "The Grand Garden Estate",
    location: "Abuja, Nigeria",
    rsvpName: "Olivia Johnson",
    rsvpPhone: "+1 (202) 555-0101",
    story:
      "Two paths meet, two hearts grow closer, and a shared future begins to unfold. Amara and Daniel invite you to be part of a day filled with love, gratitude, and the promise of all that is still to come.",
    theme: "rose",
  }),
  restorePreviousWedding({
    id: "chiamaka-michael",
    brideName: "Chiamaka Okafor",
    groomName: "Michael Anderson",
    date: "2028-02-12",
    time: "11:30 AM",
    venue: "The Olive Grove",
    location: "Enugu, Nigeria",
    rsvpName: "Ada Okafor",
    rsvpPhone: "+1 (202) 555-0102",
    story:
      "A beautiful beginning is made of kindness, laughter, and the quiet joy of choosing one another. Chiamaka and Michael are delighted to celebrate their new chapter surrounded by the people they love.",
    theme: "garden",
  }),
  restorePreviousWedding({
    id: "esther-david",
    brideName: "Esther James",
    groomName: "David Thompson",
    date: "2028-06-24",
    time: "12:00 PM",
    venue: "The Heritage Hall",
    location: "Ibadan, Nigeria",
    rsvpName: "Grace James",
    rsvpPhone: "+1 (202) 555-0103",
    story:
      "With open hearts and a shared hope for the future, Esther and David are beginning a life together. They would be honoured to have you with them as they celebrate this meaningful day.",
    theme: "classic",
  }),
  restorePreviousWedding({
    id: "sarah-nathan",
    brideName: "Sarah Emmanuel",
    groomName: "Nathan Brooks",
    date: "2029-03-17",
    time: "3:00 PM",
    venue: "The Rosewood Conservatory",
    location: "Port Harcourt, Nigeria",
    rsvpName: "Peter Emmanuel",
    rsvpPhone: "+1 (202) 555-0104",
    story:
      "One shared promise becomes a lifetime of little moments and lasting memories. Sarah and Nathan invite you to join them as they celebrate the love that brings them together.",
    theme: "rose",
  }),
  restorePreviousWedding({
    id: "grace-samuel",
    brideName: "Grace Williams",
    groomName: "Samuel Johnson",
    date: "2029-11-10",
    time: "10:30 AM",
    venue: "The Cedarwood Chapel",
    location: "Accra, Ghana",
    rsvpName: "Rebecca Williams",
    rsvpPhone: "+1 (202) 555-0105",
    story:
      "Love has a way of turning a new beginning into a place to call home. Grace and Samuel look forward to celebrating their wedding day with the friends and family who make life so special.",
    theme: "garden",
  }),
  {
    id: "jennifer-odjegba",
    brideName: "Jennifer Itaire",
    groomName: "Odjegba Princewill",
    initials: "JP",
    monogram: "The JP's",
    hashtag: "#TheJPs2026",
    date: "2026-11-21",
    time: "10:00 AM",
    venue: "The Charismatic City of Christ INT'L",
    location: "62 Upper Lawani Road, opposite Epy Street Junction, Benin City",
    groomPhoto: null,
    couplePhoto: "/jennifer-princewill-together.jpg",
    gallery: [
      "/jennifer-princewill-together.jpg",
    ],
    events: [
      {
        id: "traditional-marriage",
        title: "Traditional Marriage",
        date: "2026-11-18",
        time: "12:00 PM",
        venue: "Bride's Compound",
        location: "77 Uko Road, Ghana Sapele, Delta State",
        dressCode: "Dress moderately",
        directions: {
          href: "tel:08134169733",
          label: "Call RSVP for directions",
        },
      },
      {
        id: "church-wedding",
        title: "Church Wedding",
        date: "2026-11-21",
        time: "10:00 AM",
        venue: "The Charismatic City of Christ INT'L",
        location: "62 Upper Lawani Road, opposite Epy Street Junction, Benin City",
        dressCode: "Burgundy, pink and burnt orange",
        directions: {
          href: "https://maps.app.goo.gl/PN6qBLcURa11tyZN9",
          label: "Church directions",
        },
      },
      {
        id: "reception",
        title: "Reception",
        date: "2026-11-21",
        time: "1:00 PM",
        venue: "Edo Baptist Conference Hall B",
        location: "1 TV Road, by Oliha Market Road, Benin City",
        dressCode: "Burgundy, pink and burnt orange",
        directions: {
          href: "https://maps.app.goo.gl/g95nG39Hf9yccZDb9",
          label: "Reception directions",
        },
      },
    ],
    invitationMessage:
      "Welcome to our wedding.\n\nWith hearts full of gratitude and joy, we welcome you to celebrate the beginning of our forever. Today, two hearts become one, two families become one, and a beautiful new chapter begins. Thank you for being part of our special day. Your presence, love and prayers mean more to us than words can express. Welcome and thank you for celebrating us.",
    bibleVerse: "Song of Solomon 8:7",
    brideParents: ["Mr. Endurance Ewujakpo Itaire", "Mrs. Ewujakpo Itaire"],
    groomParents: ["Late Mr. Samuel Ediri Odjegba", "Mrs. Doris Odjegba"],
    rsvpName: "Just Praise",
    rsvpPhone: "08134169733",
    rsvpEmail: "ufuomapraise9@gmail.com",
    rsvpMaxGuests: 2,
    childrenInvited: true,
    guestManagement: {
      estimatedGuestCount: 300,
      defaultSeatAllocation: 5,
      vipCategories: false,
      specialNotes: false,
    },
    story:
      "With hearts full of gratitude and joy, we welcome you to celebrate the beginning of our forever.",
    theme: "burgundy-pink",
  },
];

export function getWeddingById(id: string): Wedding | undefined {
  return weddings.find((wedding) => wedding.id === id);
}

export function formatWeddingDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getWeddingTimestamp(wedding: Pick<Wedding, "date" | "time">): number {
  const [year, month, day] = wedding.date.split("-").map(Number);
  const time = wedding.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!time) {
    throw new Error(`Invalid wedding time: ${wedding.time}`);
  }

  const [, hourValue, minuteValue, meridiem] = time;
  const hour = Number(hourValue) % 12 + (meridiem.toUpperCase() === "PM" ? 12 : 0);

  return new Date(year, month - 1, day, hour, Number(minuteValue)).getTime();
}
