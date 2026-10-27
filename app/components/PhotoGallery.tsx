import Image from "next/image";
import type { Wedding } from "@/types/wedding";

export default function PhotoGallery({
  wedding,
}: {
  wedding: Pick<Wedding, "brideName" | "groomName" | "initials" | "gallery" | "galleryVideo">;
}) {
  const hasGalleryContent = wedding.gallery.length > 0 || Boolean(wedding.galleryVideo);

  return (
    <section className="gallery-section section-shell reveal" aria-labelledby="gallery-title">
      <div className="section-heading">
        <p className="eyebrow">Moments to remember</p>
        <h2 id="gallery-title">A Glimpse of Us</h2>
        <div className="heading-ornament" aria-hidden="true">✦</div>
      </div>
      {hasGalleryContent ? (
        <div className={`photo-gallery${wedding.gallery.length <= 2 ? " photo-gallery-two" : ""}`}>
          {wedding.gallery.map((photo, index) => (
            <figure className={`gallery-photo gallery-photo-${index + 1}`} key={`${photo}-${index}`}>
              <Image
                alt={`${wedding.brideName} and ${wedding.groomName}, wedding gallery photo ${index + 1}`}
                fill
                sizes="(max-width: 600px) 46vw, (max-width: 900px) 30vw, 260px"
                src={photo}
              />
            </figure>
          ))}
          {wedding.galleryVideo && (
            <figure className="gallery-video-card">
              <video
                aria-label={`${wedding.brideName} and ${wedding.groomName}'s wedding slideshow video`}
                controls
                playsInline
                preload="none"
                poster="/cover-photo.jpg"
              >
                <source src={wedding.galleryVideo} type="video/mp4" />
                Your browser does not support video playback.
              </video>
              <figcaption>Our story in motion</figcaption>
            </figure>
          )}
        </div>
      ) : (
        <div className="couple-photo-placeholder gallery-photo-placeholder" role="img"
          aria-label={`Couple photos of ${wedding.brideName} and ${wedding.groomName} will be added here`}>
          <span className="jp-monogram">{wedding.initials}</span>
          <span>Couple photos will be added here</span>
        </div>
      )}
    </section>
  );
}
