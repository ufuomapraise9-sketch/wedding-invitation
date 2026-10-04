"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatWeddingDate } from "@/data/weddings";
import type { Wedding } from "@/types/wedding";

type WeddingLandingProps = {
  wedding: Pick<Wedding, "brideName" | "groomName" | "date" | "gallery" | "monogram" | "hashtag">;
  onEnter: () => void;
  onExit: () => void;
};

export default function WeddingLanding({
  wedding,
  onEnter,
  onExit,
}: WeddingLandingProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isLeaving) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(onExit, reducedMotion ? 0 : 1_050);

    return () => window.clearTimeout(timeout);
  }, [isLeaving, onExit]);

  function enterInvitation() {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    onEnter();
  }

  return (
    <section
      aria-label={`${wedding.brideName} and ${wedding.groomName}'s wedding invitation entrance`}
      aria-hidden={isLeaving}
      className={`wedding-landing${isLeaving ? " wedding-landing-leaving" : ""}`}
    >
      <div className="landing-photo-wall" aria-hidden="true">
        {wedding.gallery.map((photo, index) => {
          const photoNumber = index + 1;

          return (
            <figure className={`landing-photo landing-photo-${photoNumber}`} key={photoNumber}>
              <Image
                alt=""
                fill
                fetchPriority={photoNumber === 1 ? "high" : "low"}
                loading="eager"
                sizes="(max-width: 700px) 48vw, 38vw"
                src={photo}
                unoptimized
              />
            </figure>
          );
        })}
      </div>

      <div className="landing-wash" aria-hidden="true" />

      <div className="landing-centerpiece">
        <p className="landing-monogram">{wedding.monogram}</p>
        <p className="landing-overline">Together with our families</p>
        <h1 className="landing-names">
          <span>{wedding.brideName}</span>
          <span className="landing-ampersand">&</span>
          <span>{wedding.groomName}</span>
        </h1>
        <div className="landing-rule" aria-hidden="true">
          <span />
          <span className="landing-rule-flower">✦</span>
          <span />
        </div>
        <p className="landing-subtitle">A beautiful beginning</p>
        <p className="landing-date">{formatWeddingDate(wedding.date)}</p>
        <p className="landing-hashtag">{wedding.hashtag}</p>
      </div>

      <button
        aria-label={`Enter ${wedding.brideName} and ${wedding.groomName}'s wedding invitation`}
        className="landing-enter"
        disabled={isLeaving}
        onClick={enterInvitation}
        type="button"
      >
        <span className="landing-enter-title">Enter our wedding</span>
        <span className="landing-enter-prompt">Click to enter</span>
        <span className="landing-enter-icon" aria-hidden="true">
          <span />
        </span>
      </button>

      <span className="landing-corner-note" aria-hidden="true">
        {wedding.monogram} · {wedding.date.slice(0, 4)}
      </span>
    </section>
  );
}
