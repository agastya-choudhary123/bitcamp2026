import { useRef, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const CLIP_DURATION_MS = 20_000;
const SERVER = "http://localhost:3001";

export function useClipCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  behaviorStates: string[],
  severity: number,
  driverName: string
) {
  const { getAccessTokenSilently } = useAuth0();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const capturedStatesRef = useRef<string[]>([]);
  const capturedStartRef = useRef<string>("");

  const uploadClip = useCallback(async (blob: Blob, states: string[], sessionStart: string) => {
    try {
      const token = await getAccessTokenSilently();
      // Convert blob to base64 data URL
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = `data:video/webm;base64,${btoa(binary)}`;

      const res = await fetch(`${SERVER}/upload-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ videoBase64: base64, driverName, sessionStart, states }),
      });

      if (res.ok) {
        console.log("[Clip] Uploaded successfully for states:", states.join(", "));
      } else {
        console.error("[Clip] Upload failed:", await res.text());
      }
    } catch (err) {
      console.error("[Clip] Upload error:", err);
    }
  }, [driverName, getAccessTokenSilently]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && isRecordingRef.current) {
      recorderRef.current.stop();
      isRecordingRef.current = false;
      console.log("[Clip] Recording stopped.");
    }
  }, []);

  const startRecording = useCallback((states: string[]) => {
    const video = videoRef.current;
    if (!video?.srcObject || isRecordingRef.current) return;

    const stream = video.srcObject as MediaStream;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    capturedStatesRef.current = states;
    capturedStartRef.current = new Date().toISOString();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      chunksRef.current = [];
      uploadClip(blob, capturedStatesRef.current, capturedStartRef.current);
    };

    recorder.start(1000); // collect chunks every 1s
    recorderRef.current = recorder;
    isRecordingRef.current = true;
    console.log("[Clip] Recording started for states:", states.join(", "));

    // Hard cap: stop after CLIP_DURATION_MS regardless
    setTimeout(() => {
      if (isRecordingRef.current) stopRecording();
    }, CLIP_DURATION_MS);
  }, [videoRef, uploadClip, stopRecording]);

  useEffect(() => {
    const isAlert = severity === 0;

    if (!isAlert && !isRecordingRef.current) {
      startRecording(behaviorStates);
    } else if (isAlert && isRecordingRef.current) {
      // State returned to alert — stop recording early
      stopRecording();
    }
  }, [severity, behaviorStates, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) recorderRef.current?.stop();
    };
  }, []);

  return { isRecording: isRecordingRef.current };
}
