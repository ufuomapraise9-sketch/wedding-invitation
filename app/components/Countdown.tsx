"use client";

import { useEffect, useState } from "react";
import { getWeddingTimestamp } from "@/data/weddings";
import type { Wedding } from "@/types/wedding";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(target: number): TimeLeft | null {
  const difference = target - Date.now();

  if (difference <= 0) {
    return null;
  }

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
  };
}

export default function Countdown({
  wedding,
  label,
}: {
  wedding: Pick<Wedding, "date" | "time">;
  label?: string;
}) {
  const target = getWeddingTimestamp(wedding);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | undefined>(undefined);

  useEffect(() => {
    const update = () => setTimeLeft(getTimeLeft(target));

    update();
    const interval = window.setInterval(update, 1_000);

    return () => window.clearInterval(interval);
  }, [target]);

  return (
    <div className="countdown-panel" aria-label="Countdown to the wedding">
      <p className="eyebrow">{label ?? "Until we say “I do”"}</p>
      {timeLeft ? (
        <div className="countdown-grid" aria-label="Time remaining">
          {([
            ["Days", timeLeft.days],
            ["Hours", timeLeft.hours],
            ["Minutes", timeLeft.minutes],
            ["Seconds", timeLeft.seconds],
          ] as const).map(([label, value]) => (
            <div className="countdown-unit" key={label}>
              <span className="countdown-value">{value}</span>
              <span className="countdown-label">{label}</span>
            </div>
          ))}
        </div>
      ) : timeLeft === null ? (
        <p className="countdown-complete" role="status">Today is the day!</p>
      ) : (
        <p className="countdown-loading">Counting down to our day</p>
      )}
    </div>
  );
}
