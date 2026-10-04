"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { WeddingPhoto } from "@/types/wedding-photo";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILES = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

type SelectedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

function isPhotoResponse(value: unknown): value is { photos: WeddingPhoto[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "photos" in value &&
    Array.isArray(value.photos) &&
    value.photos.every(
      (photo: unknown) =>
        typeof photo === "object" &&
        photo !== null &&
        "id" in photo &&
        typeof photo.id === "string" &&
        "weddingId" in photo &&
        typeof photo.weddingId === "string" &&
        "url" in photo &&
        typeof photo.url === "string" &&
        "createdAt" in photo &&
        typeof photo.createdAt === "string" &&
        "guestName" in photo &&
        (typeof photo.guestName === "string" || photo.guestName === null),
    )
  );
}

function getErrorMessage(value: unknown): string | null {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : null;
}

export default function GuestPhotoSharing({ weddingId }: { weddingId: string }) {
  const [photos, setPhotos] = useState<WeddingPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [guestName, setGuestName] = useState("");
  const [activePhoto, setActivePhoto] = useState<WeddingPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const selectedPhotosRef = useRef<SelectedPhoto[]>([]);

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      try {
        const response = await fetch(`/api/weddings/${encodeURIComponent(weddingId)}/photos`, {
          cache: "no-store",
        });
        const result: unknown = await response.json();

        if (!response.ok || !isPhotoResponse(result)) {
          if (response.status === 503 && isMounted) {
            setStorageAvailable(false);
          }
          if (isMounted) {
            setMessage(
              getErrorMessage(result) ?? "We couldn't load shared photos right now. Please try again later.",
            );
            setMessageIsError(true);
          }
          return;
        }

        if (isMounted) {
          setPhotos(result.photos);
          setStorageAvailable(true);
        }
      } catch (error) {
        console.error("Unable to load wedding guest photos:", error);
        if (isMounted) {
          setMessage("We couldn't load shared photos right now. Please try again later.");
          setMessageIsError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPhotos();
    return () => {
      isMounted = false;
    };
  }, [weddingId]);

  useEffect(
    () => () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    [],
  );

  useEffect(() => {
    const dialog = lightbox.current;
    if (!dialog) {
      return;
    }

    if (activePhoto && !dialog.open) {
      dialog.showModal();
    } else if (!activePhoto && dialog.open) {
      dialog.close();
    }
  }, [activePhoto]);

  function addFiles(files: FileList | File[]) {
    if (!storageAvailable || isUploading) {
      return;
    }

    setMessage("");
    setMessageIsError(false);

    const availableSlots = MAX_FILES - selectedPhotos.length;
    const incoming = Array.from(files);

    if (incoming.length === 0) {
      return;
    }

    const accepted: File[] = [];
    const invalidType = incoming.some((file) => !ACCEPTED_TYPES.has(file.type));
    const oversized = incoming.some((file) => file.size < 1 || file.size > MAX_FILE_SIZE);

    if (invalidType) {
      setMessage("Please choose JPG, JPEG, PNG, or WEBP photos only.");
      setMessageIsError(true);
    } else if (oversized) {
      setMessage("Each photo must be smaller than 8 MB.");
      setMessageIsError(true);
    } else {
      accepted.push(...incoming);
    }

    const selectedSize = selectedPhotos.reduce((sum, photo) => sum + photo.file.size, 0);
    const acceptedWithinLimit: File[] = [];
    let totalSize = selectedSize;

    for (const file of accepted) {
      if (acceptedWithinLimit.length >= availableSlots || totalSize + file.size > MAX_TOTAL_SIZE) {
        setMessage(
          availableSlots === 0
            ? `You can select up to ${MAX_FILES} photos at a time.`
            : "Please choose up to five photos with a combined size under 25 MB.",
        );
        setMessageIsError(true);
        break;
      }
      acceptedWithinLimit.push(file);
      totalSize += file.size;
    }

    if (acceptedWithinLimit.length > 0) {
      const newPhotos = acceptedWithinLimit.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedPhotos((current) => [
        ...current,
        ...newPhotos,
      ]);
    }
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) {
      addFiles(event.currentTarget.files);
      event.currentTarget.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeSelectedPhoto(id: string) {
    const photo = selectedPhotos.find((item) => item.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
      setSelectedPhotos((current) => current.filter((item) => item.id !== id));
    }
  }

  function uploadPhotos() {
    if (selectedPhotos.length === 0 || isUploading || !storageAvailable) {
      return;
    }

    const formData = new FormData();
    formData.set("guestName", guestName);
    selectedPhotos.forEach(({ file }) => formData.append("photos", file, file.name));

    setIsUploading(true);
    setUploadProgress(0);
    setMessage("");
    setMessageIsError(false);

    const request = new XMLHttpRequest();
    request.open("POST", `/api/weddings/${encodeURIComponent(weddingId)}/photos`);
    request.responseType = "json";
    request.timeout = 180_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    request.onerror = () => {
      setMessage("We couldn't upload your photos. Please check your connection and try again.");
      setMessageIsError(true);
      setIsUploading(false);
    };
    request.onload = () => {
      const result: unknown = request.response;

      if (request.status < 200 || request.status >= 300 || !isPhotoResponse(result)) {
        if (request.status === 503) {
          setStorageAvailable(false);
        }
        setMessage(
          getErrorMessage(result) ?? "We couldn't upload your photos. Please try again.",
        );
        setMessageIsError(true);
        setIsUploading(false);
        return;
      }

      selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos((current) => [...result.photos, ...current]);
      setSelectedPhotos([]);
      setGuestName("");
      setUploadProgress(100);
      setMessage("Thank you! Your memories have been added to the wedding gallery.");
      setMessageIsError(false);
      setIsUploading(false);
      if (photoInput.current) {
        photoInput.current.value = "";
      }
    };
    request.onabort = () => {
      setMessage("The upload was cancelled. Your selected photos are still here.");
      setMessageIsError(true);
      setIsUploading(false);
    };
    request.ontimeout = () => {
      setMessage("The upload took too long. Please check your connection and try again.");
      setMessageIsError(true);
      setIsUploading(false);
    };
    request.send(formData);
  }

  return (
    <section
      className="guest-memories-section section-shell reveal"
      aria-labelledby="share-moments-title"
    >
      <div className="section-heading guest-memories-heading">
        <p className="eyebrow">A keepsake from all of us</p>
        <h2 id="share-moments-title">Share Your Moments</h2>
        <div className="heading-ornament" aria-hidden="true">✦</div>
        <p className="guest-memories-intro">
          Captured a beautiful moment? Share your photos with the couple and help us preserve the memories.
        </p>
      </div>

      <div className="guest-upload-card">
        <div
          className={`guest-dropzone${isDragging ? " guest-dropzone-active" : ""}${!storageAvailable ? " guest-dropzone-unavailable" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          <input
            ref={photoInput}
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose wedding photos"
            className="guest-photo-input"
            disabled={!storageAvailable || isUploading}
            multiple
            onChange={handleFileSelection}
            type="file"
          />
          <span className="guest-upload-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M24 32V9m0 0-8 8m8-8 8 8M10 29v9a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3v-9" />
            </svg>
          </span>
          <p className="guest-upload-title">A moment worth remembering</p>
          <p className="guest-upload-copy">
            Add your favorite photos from the celebration. JPG, PNG or WEBP, up to 8 MB each.
          </p>
          <button
            className="button button-primary guest-choose-button"
            disabled={!storageAvailable || isUploading}
            onClick={() => photoInput.current?.click()}
            type="button"
          >
            Choose Photos
          </button>
          <span className="guest-upload-limit">Up to {MAX_FILES} photos · 25 MB total</span>
        </div>

        <div className="guest-upload-details">
          <label className="form-field guest-name-field">
            <span>Your name <span className="field-optional">(optional)</span></span>
            <input
              autoComplete="name"
              disabled={!storageAvailable || isUploading}
              maxLength={80}
              onChange={(event) => setGuestName(event.currentTarget.value)}
              placeholder="So we know who to thank"
              value={guestName}
            />
          </label>

          {selectedPhotos.length > 0 && (
            <div className="guest-preview-list" aria-label="Photos selected for upload">
              {selectedPhotos.map((photo) => (
                <figure className="guest-preview-photo" key={photo.id}>
                  <Image
                    alt={`Preview of ${photo.file.name}`}
                    fill
                    sizes="(max-width: 600px) 30vw, 120px"
                    src={photo.previewUrl}
                    unoptimized
                  />
                  <button
                    aria-label={`Remove ${photo.file.name}`}
                    className="guest-photo-remove"
                    disabled={isUploading}
                    onClick={() => removeSelectedPhoto(photo.id)}
                    type="button"
                  >
                    ×
                  </button>
                </figure>
              ))}
            </div>
          )}

          {isUploading && (
            <div
              className="guest-upload-progress"
              role="progressbar"
              aria-label="Photo upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
            >
              <div className="guest-upload-progress-track">
                <span style={{ width: `${uploadProgress}%` }} />
              </div>
              <span>Uploading your memories… {uploadProgress}%</span>
            </div>
          )}

          {message && (
            <p
              className={`guest-photo-message${messageIsError ? " guest-photo-message-error" : " guest-photo-message-success"}`}
              role={messageIsError ? "alert" : "status"}
              aria-live="polite"
            >
              {message}
            </p>
          )}

          <button
            className="button button-primary guest-submit-button"
            disabled={!storageAvailable || isUploading || selectedPhotos.length === 0}
            onClick={uploadPhotos}
            type="button"
          >
            {isUploading ? "Uploading…" : "Upload Photos"}
            {!isUploading && <span aria-hidden="true">↗</span>}
          </button>
        </div>
      </div>

      <div className="guest-gallery-heading">
        <span className="guest-gallery-rule" aria-hidden="true" />
        <p className="eyebrow">Little moments, kept forever</p>
        <h3>Memories From Our Day</h3>
      </div>

      {isLoading ? (
        <p className="guest-gallery-empty" role="status">Gathering the shared memories…</p>
      ) : photos.length === 0 ? (
        <p className="guest-gallery-empty">
          Be the first to share a memory from this beautiful day.
        </p>
      ) : (
        <div className="guest-photo-gallery">
          {photos.map((photo, index) => (
            <figure className={`guest-gallery-photo guest-gallery-photo-${(index % 4) + 1}`} key={photo.id}>
              <button
                aria-label={`View photo${photo.guestName ? ` shared by ${photo.guestName}` : ""}`}
                className="guest-gallery-photo-button"
                onClick={() => setActivePhoto(photo)}
                type="button"
              >
                <Image
                  alt={photo.guestName ? `Wedding moment shared by ${photo.guestName}` : "A guest's wedding memory"}
                  fill
                  loading="lazy"
                  sizes="(max-width: 600px) 44vw, (max-width: 900px) 30vw, 250px"
                  src={photo.url}
                  unoptimized
                />
                <span className="guest-photo-open" aria-hidden="true">↗</span>
              </button>
              {photo.guestName && <figcaption>Shared with love by {photo.guestName}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      <dialog
        className="guest-photo-lightbox"
        onClose={() => setActivePhoto(null)}
        ref={lightbox}
        aria-label="Wedding memory photo"
      >
        {activePhoto && (
          <>
            <button
              aria-label="Close photo"
              className="guest-lightbox-close"
              onClick={() => setActivePhoto(null)}
              type="button"
            >
              ×
            </button>
            <Image
              alt={activePhoto.guestName ? `Wedding moment shared by ${activePhoto.guestName}` : "A guest's wedding memory"}
              fill
              sizes="90vw"
              src={activePhoto.url}
              unoptimized
            />
            {activePhoto.guestName && (
              <p className="guest-lightbox-credit">Shared with love by {activePhoto.guestName}</p>
            )}
          </>
        )}
      </dialog>
    </section>
  );
}
