import type { Wedding } from "@/types/wedding";

export const weddings: Wedding[] = [
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
    couplePhoto: "/cover-photo.jpg",
    storyPhoto: "/jennifer-princewill-together.jpg",
    gallery: [],
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
