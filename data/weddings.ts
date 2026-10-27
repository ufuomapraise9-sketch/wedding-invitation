import type { Wedding } from "@/types/wedding";

export const weddings: Wedding[] = [
  {
    id: "jennifer-odjegba",
    brideName: "Jennifer",
    groomName: "Princewill",
    initials: "JP",
    monogram: "The JP's",
    hashtag: "#TheJPs2026",
    date: "2026-11-21",
    time: "10:00 AM",
    venue: "The Charismatic City of Christ INT'L",
    location: "62 Upper Lawani Road, opposite Epy Street Junction, Benin City",
    groomPhoto: null,
    couplePhoto: "/cover-photo.jpg",
    storyPhoto: "/jp-gallery-kiss.jpg",
    gallery: [
      "/jp-gallery-portrait.jpg",
      "/jp-gallery-closeup.jpg",
      "/jp-gallery-kiss.jpg",
      "/jp-gallery-white-outfits.jpg",
      "/jp-gallery-ring.jpg",
    ],
    openingSlideshowPhotos: [
      "/jp-gallery-closeup.jpg",
      "/jp-gallery-kiss.jpg",
      "/jp-gallery-white-outfits.jpg",
      "/jp-gallery-ring.jpg",
      "/IMG-20261009-WA0024.jpg",
    ],
    galleryVideo: null,
    backgroundMusic: "/background-music.mp3",
    events: [
      {
        id: "traditional-marriage",
        title: "Traditional Marriage",
        date: "2026-11-10",
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
    ],
    invitationMessage:
      "Welcome to our wedding.\n\nWith hearts full of gratitude and joy, we welcome you to celebrate the beginning of our forever. Today, two hearts become one, two families become one, and a beautiful new chapter begins. Thank you for being part of our special day. Your presence, love and prayers mean more to us than words can express. Welcome and thank you for celebrating us.",
    bibleVerse: "Song of Solomon 8:7",
    brideParents: ["Mr. Endurance Ewujakpo Itaire", "Late. Mrs Stella Itaire"],
    groomParents: ["Late Mr. Samuel Ediri Odjegba", "Mrs. Doris Odjegba"],
    rsvpName: "Just Praise",
    rsvpPhone: "08134169733",
    additionalRsvpContacts: [{ name: "JOY ITAIRE", phone: "08086875304" }],
    rsvpEmail: "ufuomapraise9@gmail.com",
    rsvpMaxGuests: 2,
    childrenInvited: true,
    guestManagement: {
      estimatedGuestCount: 300,
      defaultSeatAllocation: 5,
      vipCategories: false,
      specialNotes: false,
    },
    story: `Our meeting was never planned, and neither of us could have imagined where it would lead. We first came together as business partners, brought into each other’s lives through circumstances that seemed ordinary at the time. Yet, as we look back, we believe God was quietly bringing our paths together in His perfect timing.

What began as a professional relationship gradually grew into something far more beautiful. We discovered that our dreams aligned, our hearts understood one another, and a love was taking root before we even knew it. Even through seasons when we could not share the closeness we longed for, we held on to what we believed God had placed in our hearts. We trusted Him to guide our journey and bring His promises to fulfillment.

Our love was not without its trials. A difficult season came that tested our relationship and shook the ground beneath us. But with Christ as our foundation and His agape love as our guide, we chose faith, courage, and one another. The storm did not end our story; it strengthened us, refined our love, and prepared us for the purpose God had placed before us.

Today, our story is more than how two people found each other. It is a testimony of faith, grace, perseverance, and the beauty of trusting God through every season. We are grateful for the love He has given us and excited to begin this next chapter together. As we celebrate our wedding, we hope our journey reminds you that love rooted in God can endure life’s fiercest storms and become a source of hope and encouragement to others.`,
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
