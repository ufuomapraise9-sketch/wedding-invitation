"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function HeroSlideshow({
  images,
  brideName,
  groomName,
  weddingDate,
  hashtag,
  isActive,
}: {
  images: string[];
  brideName: string;
  groomName: string;
  weddingDate: string;
  hashtag: string;
  isActive: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isActive || images.length < 2) {
      setActiveIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [images.length, isActive]);

  if (!images.length) return null;

  const [year, month, day] = weddingDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const daySuffix = day % 100 >= 11 && day % 100 <= 13
    ? "th"
    : day % 10 === 1
      ? "st"
      : day % 10 === 2
        ? "nd"
        : day % 10 === 3
          ? "rd"
          : "th";
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);

  return (
    <div className="hero-slideshow" aria-label="Photo slideshow">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={index === activeIndex ? `${brideName} and ${groomName}` : ""}
          aria-hidden={index !== activeIndex}
          className={`hero-slide${index === activeIndex ? " is-active" : ""}`}
          fill
          priority={index === 0}
          loading={index === 0 ? undefined : "eager"}
          unoptimized
          sizes="(max-width: 600px) 78vw, (max-width: 900px) 60vw, 460px"
        />
      ))}
      <div className="hero-slideshow-caption">
        <p className="hero-slideshow-kicker">
          <span>Two hearts, one beautiful</span>
          <span>journey</span>
        </p>
        <h1 className="hero-slideshow-heading" id="invitation-title">
          <span className="hero-slideshow-name hero-slideshow-bride">{brideName.split(" ")[0]}</span>
          <span className="hero-slideshow-heart" aria-hidden="true">♥</span>
          <span className="hero-slideshow-name hero-slideshow-groom">{groomName.split(" ")[0]}</span>
        </h1>
        <p className="hero-slideshow-date">
          <span>{weekday}, {day}{daySuffix} {monthName}</span>
          <span>{year}</span>
        </p>
        <p className="hero-slideshow-hashtag">{hashtag}</p>
      </div>
    </div>
  );
}
