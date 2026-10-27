"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatWeddingDate } from "@/data/weddings";
import type { Wedding } from "@/types/wedding";
import Countdown from "./Countdown";
import GuestPhotoSharing from "./GuestPhotoSharing";
import HeroSlideshow from "./HeroSlideshow";
import PhotoGallery from "./PhotoGallery";
import RSVP from "./RSVP";
import WeddingLanding from "./WeddingLanding";

export default function WeddingInvitation({ wedding }: { wedding: Wedding }) {
  const [hasEntered, setHasEntered] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const handleEnter = useCallback(() => {
    setHasEntered(true);
    const audio = musicRef.current;
    if (audio) {
      void audio.play().catch(() => undefined);
    }
  }, []);
  const handleLandingExit = useCallback(() => setShowLanding(false), []);

  useEffect(() => {
    document.body.classList.toggle("entrance-locked", showLanding);

    return () => document.body.classList.remove("entrance-locked");
  }, [showLanding]);

  useEffect(() => {
    if (!showLanding) {
      const focusFrame = window.requestAnimationFrame(() => {
        document.querySelector<HTMLAnchorElement>(".site-header .wordmark")?.focus({
          preventScroll: true,
        });
      });

      return () => window.cancelAnimationFrame(focusFrame);
    }
  }, [showLanding]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    document.documentElement.classList.add("motion-ready");
    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  const dateLabel = formatWeddingDate(wedding.date);
  const year = wedding.date.slice(0, 4);
  const storyPhoto = wedding.storyPhoto ?? wedding.groomPhoto ?? wedding.couplePhoto;
  return (
    <div className={`wedding-experience theme-${wedding.theme}`}>
      {showLanding && (
        <WeddingLanding wedding={wedding} onEnter={handleEnter} onExit={handleLandingExit} />
      )}

      <div
        aria-hidden={!hasEntered}
        className={`invitation-site${hasEntered ? " invitation-site-entered" : ""}`}
        inert={!hasEntered}
      >
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="Wedding invitation home">
            {wedding.monogram}
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#story">Our Story</a>
            <a href="#wedding-day">Wedding Day</a>
            <a href="#rsvp">RSVP</a>
          </nav>
        </header>

        <main>
          <section className="hero-section" id="home" aria-labelledby="invitation-title">
            {wedding.couplePhoto && (
              <div className="hero-cover-backdrop" aria-hidden="true">
                <Image
                  alt=""
                  className="hero-cover-image"
                  fill
                  priority
                  sizes="100vw"
                  src={wedding.couplePhoto}
                />
              </div>
            )}
            <div className="invitation-card">
              <div className="invitation-card-inner">
                <p className="invitation-monogram">{wedding.monogram}</p>
                <p className="eyebrow invitation-eyebrow">You are invited to</p>
                <h1 className="couple-names">
                  <span>{wedding.brideName}</span>
                  <span className="ampersand">&</span>
                  <span>{wedding.groomName}</span>
                </h1>
                <p className="invitation-occasion">We&apos;re getting married</p>
                <p className="invitation-year">{year}</p>
                <div className="ornament-divider" aria-hidden="true">
                  <span />
                  <span className="ornament-diamond">✦</span>
                  <span />
                </div>
                {wedding.couplePhoto ? (
                  <figure className="couple-photo">
                    <div className="couple-photo-frame">
                      <HeroSlideshow
                        images={wedding.openingSlideshowPhotos?.length
                          ? wedding.openingSlideshowPhotos
                          : wedding.gallery.length ? wedding.gallery : [wedding.couplePhoto]}
                        brideName={wedding.brideName}
                        groomName={wedding.groomName}
                        weddingDate={wedding.date}
                        hashtag={wedding.hashtag}
                        isActive={hasEntered}
                      />
                    </div>
                    <figcaption className="photo-caption">
                      With love, {wedding.brideName} & {wedding.groomName}
                    </figcaption>
                  </figure>
                ) : (
                  <div className="couple-photo-placeholder invitation-photo-placeholder" role="img"
                    aria-label={`A couple portrait of ${wedding.brideName} and ${wedding.groomName} will be added here`}>
                    <span className="jp-monogram">{wedding.initials}</span>
                    <span>Couple portrait to be added</span>
                  </div>
                )}
                <p className="invitation-intro">
                  {wedding.hashtag}
                </p>
                <p className="invitation-date">{dateLabel}</p>
              </div>
            </div>
          </section>

          <section
            className="wedding-day-section section-shell reveal"
            id="wedding-day"
            aria-labelledby="wedding-day-title"
          >
            <div className="section-heading">
              <p className="eyebrow">The beginning of forever</p>
              <h2 id="wedding-day-title">Our Wedding Day</h2>
              <div className="heading-ornament" aria-hidden="true">✦</div>
            </div>
            <div className="wedding-events">
              {wedding.events.map((event) => (
                <article className="wedding-event-card" key={event.id}>
                  <p className="eyebrow">{event.title}</p>
                  <h3>{formatWeddingDate(event.date)}</h3>
                  <p className="wedding-event-time">{event.time}</p>
                  <p className="wedding-event-venue">{event.venue}</p>
                  <p className="wedding-event-address">{event.location}</p>
                  <p className="wedding-event-dress">
                    <span>Dress code</span>{event.dressCode}
                  </p>
                  <a
                    className="button button-outline wedding-event-directions"
                    href={event.directions.href}
                    target={event.directions.href.startsWith("https://") ? "_blank" : undefined}
                    rel={event.directions.href.startsWith("https://") ? "noreferrer" : undefined}
                  >
                    {event.directions.label}
                    {event.directions.href.startsWith("https://") && <span aria-hidden="true">↗</span>}
                  </a>
                </article>
              ))}
            </div>
            <Countdown wedding={wedding} label="Countdown to the church wedding" />
          </section>

          <section className="story-section section-shell reveal" id="story" aria-labelledby="story-title">
            <figure className="story-image">
              {storyPhoto ? (
                <Image
                  src={storyPhoto}
                  alt={`${wedding.brideName} and ${wedding.groomName}`}
                  fill
                  sizes="(max-width: 600px) 88vw, (max-width: 900px) 72vw, 520px"
                />
              ) : (
                <div className="story-photo-placeholder" role="img"
                  aria-label={`A photograph of ${wedding.brideName} and ${wedding.groomName} will be added here`}>
                  <span className="jp-monogram">{wedding.initials}</span>
                  <span>A moment from our journey</span>
                </div>
              )}
            </figure>
            <div className="story-copy">
              <p className="eyebrow">{wedding.hashtag || "A little about us"}</p>
              <h2 id="story-title">Our Story</h2>
              <div className="story-ornament" aria-hidden="true">— ✦ —</div>
              <div className="story-body">
                {wedding.story.split(/\n\s*\n/).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>

          <PhotoGallery wedding={wedding} />
          <GuestPhotoSharing weddingId={wedding.id} />

          <section className="welcome-section reveal" aria-labelledby="welcome-title">
            <div className="ceremony-content">
              <p className="eyebrow">{wedding.monogram} · {wedding.hashtag}</p>
              <h2 id="welcome-title">Welcome to our wedding</h2>
              <div className="ceremony-rule" aria-hidden="true" />
              <p className="welcome-message">{wedding.invitationMessage}</p>
              <p className="bible-verse">With love and gratitude · {wedding.bibleVerse}</p>
              <div className="family-grid">
                <section className="family-column" aria-labelledby="bride-family-title">
                  <h3 id="bride-family-title">The Bride&apos;s Family</h3>
                  {wedding.brideParents.map((parent) => <p key={parent}>{parent}</p>)}
                </section>
                <section className="family-column" aria-labelledby="groom-family-title">
                  <h3 id="groom-family-title">The Groom&apos;s Family</h3>
                  {wedding.groomParents.map((parent) => <p key={parent}>{parent}</p>)}
                </section>
              </div>
            </div>
          </section>

          <RSVP wedding={wedding} />

          <section className="closing-section reveal" aria-label="A note from the couple">
            <div className="closing-inner">
              <p className="eyebrow">With joyful hearts</p>
              <p className="closing-message">
                Together with our families,<br />
                we invite you to celebrate this<br className="desktop-break" />
                beautiful beginning with us.
              </p>
              <div className="closing-ornament" aria-hidden="true">✦</div>
              <p className="closing-names">
                {wedding.monogram}
              </p>
              <p className="closing-date">{wedding.hashtag} · {dateLabel}</p>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <p>
            {wedding.monogram} <span aria-hidden="true">•</span> {wedding.hashtag} · {year}
          </p>
        </footer>
      </div>
      {hasEntered && (
        <a className="scroll-up-cue" href="#home" aria-label="Scroll up to the invitation">
          <span aria-hidden="true">↑</span> Scroll up
        </a>
      )}
      {wedding.backgroundMusic && (
        <audio ref={musicRef} src={wedding.backgroundMusic} loop preload="none" />
      )}
    </div>
  );
}
