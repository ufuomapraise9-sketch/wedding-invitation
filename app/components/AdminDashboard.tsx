"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { AdminDashboardData, AdminDashboardWedding } from "@/lib/admin-dashboard-data";

function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function CoupleSelector({
  weddings,
  selectedId,
  onSelect,
}: {
  weddings: AdminDashboardWedding[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="admin-couple-list" aria-label="Wedding invitations">
      {weddings.map((wedding) => (
        <button
          aria-current={wedding.id === selectedId ? "true" : undefined}
          className={`admin-couple-option${wedding.id === selectedId ? " is-selected" : ""}`}
          key={wedding.id}
          onClick={() => onSelect(wedding.id)}
          type="button"
        >
          {wedding.couplePhoto ? (
            <Image
              alt=""
              className="admin-couple-thumb"
              height={52}
              src={wedding.couplePhoto}
              width={52}
            />
          ) : (
            <span className="admin-couple-thumb admin-couple-placeholder" aria-hidden="true">
              {wedding.brideName.slice(0, 1)}&amp;{wedding.groomName.slice(0, 1)}
            </span>
          )}
          <span className="admin-couple-option-copy">
            <strong>{wedding.brideName} &amp; {wedding.groomName}</strong>
            <span>{formatDate(wedding.date)}</span>
          </span>
          <span className="admin-couple-count" aria-label={`${wedding.rsvps.length} RSVPs`}>
            {wedding.rsvps.length}
          </span>
        </button>
      ))}
    </nav>
  );
}

function RSVPTable({ wedding }: { wedding: AdminDashboardWedding }) {
  if (wedding.rsvps.length === 0) {
    return <p className="admin-empty-state">No RSVP replies have been received for this invitation.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-rsvp-table">
        <thead>
          <tr>
            <th scope="col">Guest</th>
            <th scope="col">Response</th>
            <th scope="col">Guests</th>
            <th scope="col">Message</th>
            <th scope="col">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {wedding.rsvps.map((rsvp) => (
            <tr key={rsvp.id}>
              <th scope="row">{rsvp.guestName}</th>
              <td>
                <span className={`admin-status${rsvp.attending ? " is-attending" : " is-declined"}`}>
                  {rsvp.attending ? "Attending" : "Not attending"}
                </span>
              </td>
              <td>{rsvp.attending ? rsvp.guestCount : "—"}</td>
              <td className="admin-message-cell">{rsvp.message || <span className="admin-muted">—</span>}</td>
              <td>{formatTimestamp(rsvp.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuestPhotoGallery({
  wedding,
  onViewPhoto,
}: {
  wedding: AdminDashboardWedding;
  onViewPhoto: (photo: AdminDashboardWedding["photos"][number]) => void;
}) {
  if (wedding.photos.length === 0) {
    return <p className="admin-empty-state">No guest-uploaded photos have been shared yet.</p>;
  }

  return (
    <div className="admin-photo-grid">
      {wedding.photos.map((photo) => (
        <article className="admin-photo-card" key={photo.id}>
          <button
            aria-label={`View photo uploaded by ${photo.guestName || "a guest"}`}
            className="admin-photo-view"
            onClick={() => onViewPhoto(photo)}
            type="button"
          >
            <Image
              alt={photo.guestName ? `Photo uploaded by ${photo.guestName}` : "Photo uploaded by a guest"}
              className="admin-photo-image"
              height={420}
              src={photo.url}
              unoptimized
              width={560}
            />
            <span className="admin-photo-expand" aria-hidden="true">↗</span>
          </button>
          <div className="admin-photo-caption">
            <strong>{photo.guestName || "Guest"}</strong>
            <time dateTime={photo.createdAt}>{formatTimestamp(photo.createdAt)}</time>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const [selectedId, setSelectedId] = useState(data.weddings[0]?.id ?? "");
  const [activePhoto, setActivePhoto] = useState<AdminDashboardWedding["photos"][number] | null>(null);
  const wedding = data.weddings.find((entry) => entry.id === selectedId);
  const rsvps = wedding?.rsvps ?? [];
  const attending = rsvps.filter((rsvp) => rsvp.attending);
  const decliningCount = rsvps.length - attending.length;
  const expectedGuests = attending.reduce((total, rsvp) => total + rsvp.guestCount, 0);

  useEffect(() => {
    if (!activePhoto) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/admin" aria-label="Wedding admin dashboard">
          <span className="admin-brand-mark" aria-hidden="true">✦</span>
          <span>Wedding <em>admin</em></span>
        </a>
        <p className="admin-header-note">Private dashboard</p>
      </header>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-heading">
            <p className="admin-overline">Your invitations</p>
            <h1>Couples</h1>
          </div>
          <CoupleSelector
            onSelect={setSelectedId}
            selectedId={selectedId}
            weddings={data.weddings}
          />
        </aside>

        {wedding ? (
          <section className="admin-main-panel" aria-labelledby="admin-wedding-title">
            <div className="admin-wedding-heading">
              <div>
                <p className="admin-overline">{formatDate(wedding.date, { dateStyle: "long" })} · {wedding.time}</p>
                <h2 id="admin-wedding-title">{wedding.brideName} <span>&amp;</span> {wedding.groomName}</h2>
                <p>{wedding.venue}</p>
              </div>
              <a className="admin-invitation-link" href={`/wedding/${encodeURIComponent(wedding.id)}`} target="_blank" rel="noreferrer">
                View invitation <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="admin-stats" aria-label="RSVP summary">
              <article className="admin-stat-card">
                <span>Total responses</span>
                <strong>{rsvps.length}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Attending</span>
                <strong>{attending.length}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Not attending</span>
                <strong>{decliningCount}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Expected guests</span>
                <strong>{expectedGuests}</strong>
              </article>
            </div>

            {!data.rsvpMessagesAvailable && (
              <p className="admin-schema-notice" role="status">
                RSVP messages are unavailable until the message column is added to the Supabase table.
              </p>
            )}

            <section className="admin-content-section" aria-labelledby="admin-rsvp-heading">
              <div className="admin-section-heading">
                <div>
                  <p className="admin-overline">Guest replies</p>
                  <h3 id="admin-rsvp-heading">RSVPs <span>{rsvps.length}</span></h3>
                </div>
              </div>
              <RSVPTable wedding={wedding} />
            </section>

            <section className="admin-content-section" aria-labelledby="admin-photos-heading">
              <div className="admin-section-heading">
                <div>
                  <p className="admin-overline">Shared by your guests</p>
                  <h3 id="admin-photos-heading">Guest photos <span>{wedding.photos.length}</span></h3>
                </div>
              </div>
              <GuestPhotoGallery wedding={wedding} onViewPhoto={setActivePhoto} />
            </section>
          </section>
        ) : (
          <section className="admin-main-panel admin-no-couples">
            <h2>No wedding invitations found</h2>
            <p>Add a wedding to the site data to see it in this dashboard.</p>
          </section>
        )}
      </div>

      {activePhoto && (
        <div
          className="admin-photo-dialog-backdrop"
          onClick={() => setActivePhoto(null)}
          role="presentation"
        >
          <section
            aria-label="Guest photo preview"
            aria-modal="true"
            className="admin-photo-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close photo preview"
              className="admin-photo-dialog-close"
              onClick={() => setActivePhoto(null)}
              type="button"
            >
              ×
            </button>
            <Image
              alt={activePhoto.guestName ? `Photo uploaded by ${activePhoto.guestName}` : "Photo uploaded by a guest"}
              className="admin-photo-dialog-image"
              height={1200}
              src={activePhoto.url}
              unoptimized
              width={1600}
            />
            <p>
              {activePhoto.guestName || "Guest"} · {formatTimestamp(activePhoto.createdAt)}
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
