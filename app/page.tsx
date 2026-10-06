import Image from "next/image";
import Link from "next/link";
import { formatWeddingDate, weddings } from "@/data/weddings";

export default function Home() {
  return (
    <main className="platform-home">
      <div className="platform-cover-background" aria-hidden="true">
        <Image
          alt=""
          fill
          priority
          sizes="100vw"
          src="/cover-photo.jpg"
        />
      </div>
      <header className="platform-header">
        <Link className="wordmark" href="/" aria-label="Wedding invitations home">
          W<span>&</span>W
        </Link>
        <p className="eyebrow">A collection of love stories</p>
      </header>

      <section className="platform-intro" aria-labelledby="platform-title">
        <p className="eyebrow">A collection of love stories</p>
        <h1 id="platform-title">Choose Your Invitation</h1>
        <p className="platform-description">
          Select a couple to view their wedding invitation.
        </p>
        <a className="platform-discover" href="#invitations">
          Discover the invitations <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="platform-invitations" id="invitations" aria-labelledby="invitations-title">
        <div className="platform-section-heading">
          <p className="eyebrow">A day made yours</p>
          <h2 id="invitations-title">Celebrate their beginning</h2>
          <div className="heading-ornament" aria-hidden="true">✦</div>
        </div>

        <div className={`wedding-card-grid${weddings.length === 1 ? " single-wedding-card-grid" : ""}`}>
          {weddings.map((wedding, index) => (
            <article className={`wedding-preview-card theme-${wedding.theme}`} key={wedding.id}>
              <a
                className="wedding-preview-card-link"
                href={`/wedding/${wedding.id}`}
                aria-label={`View ${wedding.brideName} and ${wedding.groomName}'s invitation`}
              >
                <span className="wedding-preview-image">
                  <Image
                    src="/cover-photo.jpg"
                    alt={`${wedding.brideName} and ${wedding.groomName}`}
                    fill
                    sizes="(max-width: 600px) 90vw, (max-width: 900px) 44vw, 360px"
                  />
                  <span className="wedding-preview-number">{String(index + 1).padStart(2, "0")}</span>
                </span>
                <span className="wedding-preview-details">
                  <span className="eyebrow">{formatWeddingDate(wedding.date)}</span>
                  <span className="wedding-preview-names">
                    {wedding.brideName} <span>&</span>{" "}
                    {wedding.groomName}
                  </span>
                  <span className="button button-outline wedding-preview-cta">
                    View Invitation <span aria-hidden="true">↗</span>
                  </span>
                </span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <footer className="platform-footer">
        <p>Made for celebrating love <span aria-hidden="true">✦</span></p>
      </footer>
    </main>
  );
}
