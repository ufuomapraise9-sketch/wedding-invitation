"use client";

import { type FormEvent, useRef, useState } from "react";
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

function isRsvpWithoutMessage(value: unknown): value is { ok: true; messageSaved: false } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "messageSaved" in value &&
    value.messageSaved === false
  );
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
    | "rsvpEmail"
    | "rsvpMaxGuests"
    | "childrenInvited"
  >;
}) {
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const submissionInProgress = useRef(false);
  const phoneLinks = getPhoneLinks(wedding.rsvpPhone);
  const invitationMessage = `Hello ${wedding.rsvpName}, I would love to RSVP for ${wedding.brideName} and ${wedding.groomName}'s wedding.`;
  const maxGuests = Math.min(wedding.rsvpMaxGuests, 10);

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
    setSubmissionStatus("sending");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId: wedding.id,
          name,
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
      setSubmissionMessage(
        isRsvpWithoutMessage(result)
          ? "Your RSVP was saved, but your optional note could not be recorded. Please share it with your RSVP contact."
          : "",
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
      <p className="rsvp-name">{wedding.rsvpName}</p>
      <a className="rsvp-phone" href={phoneLinks.telephone}>{wedding.rsvpPhone}</a>
      <a className="rsvp-email" href={`mailto:${wedding.rsvpEmail}`}>{wedding.rsvpEmail}</a>
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
      <div className="rsvp-form-wrap">
        <div className="rsvp-form-heading">
          <span className="rsvp-form-rule" aria-hidden="true" />
          <p className="eyebrow">Or reply here</p>
          <h3>Kindly let us know</h3>
          <p>
            Please reply for up to {maxGuests} guests per invitation.
            {wedding.childrenInvited ? " Children are welcome." : " Children are not included."}
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
      </div>
    </section>
  );
}
