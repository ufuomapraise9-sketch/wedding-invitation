"use client";

import { useEffect, useRef } from "react";

type TicketScannerProps = {
  onScan: (value: string) => void;
  onError: (message: string) => void;
};

function getCameraErrorMessage(error: unknown): string {
  const errorName = error instanceof Error ? error.name : "";

  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    return "Camera permission is blocked for this site. Allow camera access in your browser’s site settings, then close and reopen the scanner.";
  }
  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No camera was found on this device. Connect a camera or scan from a device with a camera.";
  }
  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return "The camera is unavailable or being used by another app. Close other camera apps and try again.";
  }

  return "We couldn’t start the camera. Check browser camera permissions and make sure no other app is using it.";
}

export default function TicketScanner({ onScan, onError }: TicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isActive = true;
    let controls: { stop: () => void } | undefined;

    async function startScanner() {
      if (!window.isSecureContext) {
        onError("Camera access requires a secure page. Open the invitation admin over HTTPS or use localhost during development.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        onError("This browser does not provide camera access. Open the admin page in a current browser over HTTPS or localhost.");
        return;
      }

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const startedControls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (result) => {
            if (result && isActive) {
              isActive = false;
              controls?.stop();
              onScan(result.getText());
            }
          },
        );

        if (isActive) {
          controls = startedControls;
        } else {
          startedControls.stop();
        }
      } catch (error) {
        if (isActive) {
          console.error("Unable to start the ticket QR scanner:", error);
          onError(getCameraErrorMessage(error));
        }
      }
    }

    void startScanner();
    return () => {
      isActive = false;
      controls?.stop();
    };
  }, [onError, onScan]);

  return (
    <div className="admin-ticket-camera">
      <video
        aria-label="Camera view for scanning wedding entry tickets"
        autoPlay
        muted
        playsInline
        ref={videoRef}
      />
      <p>Hold a guest&apos;s ticket QR code in front of the camera.</p>
    </div>
  );
}
