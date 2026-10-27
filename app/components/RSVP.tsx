"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Wedding } from "@/types/wedding";

type SubmissionStatus = "idle" | "sending" | "success" | "error";

function isErrorResponse(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

function getTicketToken(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ticketToken" in value) ||
    typeof value.ticketToken !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.ticketToken,
    )
  ) {
    return null;
  }

  return value.ticketToken;
}

function getRsvpSaveNotice(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true) {
    return null;
  }

  const missingDetails: string[] = [];
  if ("emailSaved" in value && value.emailSaved === false) {
    missingDetails.push("your email address");
  }
  if ("messageSaved" in value && value.messageSaved === false) {
    missingDetails.push("your optional message");
  }

  return missingDetails.length > 0
    ? `Your RSVP was saved, but ${missingDetails.join(" and ")} could not be recorded. Please contact your RSVP host to share them.`
    : null;
}

function getPhoneLinks(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const whatsappDigits = phone.trim().startsWith("+")
    ? digits
    : digits.startsWith("0")
      ? `234${digits.slice(1)}`
      : digits;

  return {
    telephone: `tel:${phone.replace(/[^\d+]/g, "")}`,
    whatsapp: whatsappDigits,
  };
}

export default function RSVP({
  wedding,
}: {
  wedding: Pick<
    Wedding,
    | "id"
    | "brideName"
    | "groomName"
    | "rsvpName"
    | "rsvpPhone"
    | "additionalRsvpContacts"
    | "rsvpEmail"
    | "rsvpMaxGuests"
    | "childrenInvited"
  >;
}) {
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [ticketQrCode, setTicketQrCode] = useState<string | null>(null);
  const [ticketQrError, setTicketQrError] = useState(false);
  const submissionInProgress = useRef(false);
  const rsvpContacts = [
    { name: wedding.rsvpName, phone: wedding.rsvpPhone },
    ...(wedding.additionalRsvpContacts ?? []),
  ];
  const maxGuests = Math.min(wedding.rsvpMaxGuests, 10);

  useEffect(() => {
    if (!ticketToken) {
      return;
    }

    let isCurrent = true;
    QRCode.toDataURL(ticketToken, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
    }).then(
      (dataUrl) => {
        if (isCurrent) {
          setTicketQrCode(dataUrl);
        }
      },
      (error: unknown) => {
        console.error("Unable to generate the RSVP ticket QR code:", error);
        if (isCurrent) {
          setTicketQrError(true);
        }
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [ticketToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const attending = formData.get("attending");
    const name = formData.get("name");
    const guestCount = attending === "yes" ? Number(formData.get("guestCount")) : 0;

    if (typeof name !== "string" || name.trim().length === 0) {
      setSubmissionMessage("Please enter your name so the couple knows who is replying.");
      setSubmissionStatus("error");
      return;
    }

    const phone = formData.get("phone");
    if (typeof phone !== "string" || phone.trim().length === 0) {
      setSubmissionMessage("Please enter your phone number. It is required to prevent duplicate RSVPs.");
      setSubmissionStatus("error");
      return;
    }

    if (attending !== "yes" && attending !== "no") {
      setSubmissionMessage("Please choose whether you can join the celebration.");
      setSubmissionStatus("error");
      return;
    }

    if (
      attending === "yes" &&
      (!Number.isSafeInteger(guestCount) || guestCount < 1 || guestCount > maxGuests)
    ) {
      setSubmissionMessage(`Please choose between 1 and ${maxGuests} guests.`);
      setSubmissionStatus("error");
      return;
    }

    submissionInProgress.current = true;
    setSubmissionMessage("");
    setTicketToken(null);
    setTicketQrCode(null);
    setTicketQrError(false);
    setSubmissionStatus("sending");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId: wedding.id,
          name,
          email: formData.get("email"),
          phone: formData.get("phone"),
          attending,
          guestCount,
          dietaryNeeds: formData.get("dietaryNeeds"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setSubmissionMessage(
          isErrorResponse(result)
            ? result.error
            : "We couldn't save your RSVP. Please try again or contact your RSVP host.",
        );
        setSubmissionStatus("error");
        return;
      }

      form.reset();
      setAttendance(null);
      const newTicketToken = attending === "yes" ? getTicketToken(result) : null;
      setTicketToken(newTicketToken);
      setSubmissionMessage(
        (attending === "yes" && !newTicketToken
          ? "Your RSVP was saved, but we couldn't issue your entry ticket. Please contact your RSVP host."
          : getRsvpSaveNotice(result)) ?? "",
      );
      setSubmissionStatus("success");
    } catch (error) {
      console.error("Unable to submit RSVP:", error);
      setSubmissionMessage(
        "We couldn't save your RSVP. Please try again or contact your RSVP host.",
      );
      setSubmissionStatus("error");
    } finally {
      submissionInProgress.current = false;
    }
  }

  return (
    <section className="rsvp-section section-shell reveal" id="rsvp" aria-labelledby="rsvp-title">
      <p className="eyebrow">Save a place in your heart—and at our table</p>
      <h2 id="rsvp-title">We would love to<br />celebrate with you</h2>
      <div className="rsvp-ornament" aria-hidden="true">✦</div>
      <p className="rsvp-kindly">Kindly RSVP to</p>
      <div className="rsvp-contact-list" aria-label="RSVP contacts">
        {rsvpContacts.map((contact) => {
          const phoneLinks = getPhoneLinks(contact.phone);
          const invitationMessage = `Hello ${contact.name}, I would love to RSVP for ${wedding.brideName} and ${wedding.groomName}'s wedding.`;

          return (
            <div className="rsvp-contact" key={`${contact.name}-${contact.phone}`}>
              <p className="rsvp-name">{contact.name}</p>
              <a className="rsvp-phone" href={phoneLinks.telephone}>{contact.phone}</a>
              <div className="rsvp-actions">
                <a className="button button-primary" href={phoneLinks.telephone}>Call to RSVP</a>
                <a
                  className="button button-whatsapp"
                  href={`https://wa.me/${phoneLinks.whatsapp}?text=${encodeURIComponent(invitationMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  RSVP on WhatsApp <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
      <a className="rsvp-email" href={`mailto:${wedding.rsvpEmail}`}>{wedding.rsvpEmail}</a>
      <div className="rsvp-form-wrap">
        <div className="rsvp-form-heading">
          <span className="rsvp-form-rule" aria-hidden="true" />
          <p className="eyebrow">Or reply here</p>
          <h3>Kindly let us know</h3>
          <p>
            Please reply for up to {maxGuests} guests per invitation.
            {wedding.childrenInvited ? " Children are welcome." : " Children are not included."}
            {" "}Your phone number is required to prevent duplicate RSVPs.
          </p>
        </div>
        <form className="rsvp-form" noValidate onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Your name</span>
            <input
              autoComplete="name"
              maxLength={100}
              name="name"
              placeholder="First and last name"
              required
            />
          </label>
          <label className="form-field">
            <span>Email address <span className="field-optional">(optional)</span></span>
            <input
              autoComplete="email"
              maxLength={254}
              name="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>
          <label className="form-field">
            <span>Phone number</span>
            <input
              autoComplete="tel"
              maxLength={40}
              name="phone"
              placeholder="Your phone number"
              required
              type="tel"
            />
          </label>
          <fieldset className="attendance-fieldset">
            <legend>Will you be joining us?</legend>
            <div className="attendance-options">
              <label className="attendance-option">
                <input
                  checked={attendance === "yes"}
                  name="attending"
                  onChange={() => setAttendance("yes")}
                  required
                  type="radio"
                  value="yes"
                />
                <span>Joyfully Accept</span>
              </label>
              <label className="attendance-option">
                <input
                  checked={attendance === "no"}
                  name="attending"
                  onChange={() => setAttendance("no")}
                  required
                  type="radio"
                  value="no"
                />
                <span>Regretfully Decline</span>
              </label>
            </div>
          </fieldset>
          {attendance === "yes" && (
            <label className="form-field">
              <span>Number attending, including you</span>
              <input
                defaultValue="1"
                max={maxGuests}
                min={1}
                name="guestCount"
                required
                type="number"
              />
            </label>
          )}
          <label className="form-field">
            <span>Message for the couple <span className="field-optional">(optional)</span></span>
            <textarea
              maxLength={500}
              name="message"
              placeholder="Share a few kind words"
              rows={3}
            />
          </label>
          <label className="form-field">
            <span>Dietary needs <span className="field-optional">(optional)</span></span>
            <textarea
              maxLength={500}
              name="dietaryNeeds"
              placeholder="Let us know about any dietary requirements"
              rows={3}
            />
          </label>
          <label className="website-field" aria-hidden="true">
            Leave this field empty
            <input autoComplete="off" name="website" tabIndex={-1} type="text" />
          </label>
          {submissionStatus !== "idle" && (
            <p
              className={`rsvp-form-feedback rsvp-form-feedback-${submissionStatus}`}
              role={submissionStatus === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {submissionStatus === "sending" && "Sending your reply…"}
              {submissionStatus === "success" &&
                (submissionMessage ||
                  "Thank you! Your RSVP has been received. We look forward to celebrating with you.")}
              {submissionStatus === "error" && submissionMessage}
            </p>
          )}
          <button
            className="button button-primary rsvp-submit"
            disabled={submissionStatus === "sending"}
            type="submit"
          >
            {submissionStatus === "sending" ? "Sending…" : "Send RSVP"}
          </button>
        </form>
        {ticketToken && (
          <div className="rsvp-ticket" aria-label="Your entry ticket">
            <h3>Your entry ticket</h3>
            <p>Show this QR code at the door to check in your party.</p>
            {ticketQrCode ? (
              <>
                <Image
                  alt="Private QR code for your wedding entry ticket"
                  height={240}
                  src={ticketQrCode}
                  unoptimized
                  width={240}
                />
                <a className="button button-primary" download="wedding-entry-ticket.png" href={ticketQrCode}>
                  Save ticket
                </a>
              </>
            ) : ticketQrError ? (
              <p role="alert">We couldn&apos;t create your ticket QR code. Please contact your RSVP host.</p>
            ) : (
              <p role="status">Preparing your ticket…</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
