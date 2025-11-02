import { useEffect, useRef, useState } from "react";
import { MicrophoneIcon } from "@heroicons/react/20/solid";

interface CallCollaborationProps {
  documentId: string | undefined;
  sendAudio: (documentId: string, data: Blob) => void;
  handleHeadphoneAudio?: (state: "on" | "off") => void;
}

type CallStatus = "idle" | "connecting" | "in-call" | "ended";

export function CallCollaboration({ documentId, sendAudio, handleHeadphoneAudio }: CallCollaborationProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [headphonesMuted, setHeadphonesMuted] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const requestDataIntervalRef = useRef<number | null>(null);
  /*
    const startRecording = async () => {
      if (!documentId) {
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream);
  
      mediaRecorder.addEventListener("dataavailable", async (event) => {
        sendAudio(documentId, event.data);
        mediaRecorder.start()
      });
      mediaRecorder.start();
      setInterval(() => mediaRecorder.stop(), 500)
    };
  */
  // start / join call
  const joinCall = async () => {
    if (!documentId) return;
    if (callStatus === "connecting" || callStatus === "in-call") return;

    setCallStatus("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const options: MediaRecorderOptions = {} as MediaRecorderOptions;
      // If browser supports a specific mime type you could set it here.
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;


      mediaRecorderRef?.current?.addEventListener("dataavailable", async (event) => {
        sendAudio(documentId, event.data);
        mediaRecorderRef?.current?.start()
      });
      mediaRecorderRef?.current?.start();
      requestDataIntervalRef.current = window.setInterval(() => mediaRecorderRef?.current?.stop(), 500);

      setCallStatus("in-call");
    } catch (err) {
      console.error("Failed to get media devices:", err);
      setCallStatus("idle");
    }
  };

  // leave / quit call
  const quitCall = () => {
    if (requestDataIntervalRef.current) {
      clearInterval(requestDataIntervalRef.current);
      requestDataIntervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // ignore
      }
      mediaStreamRef.current = null;
    }

    setCallStatus("ended");
    setMicMuted(false);
    setHeadphonesMuted(false);
    // after a short delay allow re-joining
    setTimeout(() => setCallStatus("idle"), 500);
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicMuted((v) => !v);
    }
  };

  const toggleHeadphones = () => {
    if (mediaStreamRef.current) {
      handleHeadphoneAudio && handleHeadphoneAudio(headphonesMuted ? "off" : "on");
      setHeadphonesMuted((v) => !v);
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestDataIntervalRef.current) {
        clearInterval(requestDataIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) { }
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) { }
      }
    };
  }, []);

  const statusLabel = (() => {
    switch (callStatus) {
      case "idle":
        return "StandBy";
      case "connecting":
        return "Connecting";
      case "in-call":
        return "In Call";
      case "ended":
        return "Ended";
      default:
        return "StandBy";
    }
  })();
  const statusClass = (() => {
    switch (callStatus) {
      case "idle":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "connecting":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300";
      case "in-call":
        return "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300";
      case "ended":
        return "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  })();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <MicrophoneIcon aria-hidden="true" className="h-4 w-4" />
            Appel
          </span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {callStatus !== "in-call" ? (
          <button
            onClick={joinCall}
            className="rounded-md bg-green-600 px-3 py-1 text-sm text-white"
            aria-pressed={callStatus === "connecting"}
          >
            {callStatus === "connecting" ? "Joining..." : "Join"}
          </button>
        ) : (
          <button
            onClick={quitCall}
            className="rounded-md bg-red-600 px-3 py-1 text-sm text-white"
          >
            Quit
          </button>
        )}
        {mediaStreamRef.current &&
          <>
            <button
              onClick={toggleMic}
              className={`rounded-md px-3 py-1 text-sm text-white ${micMuted ? "bg-yellow-600" : "bg-indigo-600"}`}
            >
              {micMuted ? "Mic Off" : "Mic On"}
            </button>
            {/* 
            <button
              onClick={toggleHeadphones}
              className={`rounded-md px-3 py-1 text-sm text-white ${headphonesMuted ? "bg-yellow-600" : "bg-slate-600"}`}
            >
              {headphonesMuted ? "Headphones Off" : "Headphones On"}
            </button>
            */}
          </>}
      </div>
    </div>
  );
}

export default CallCollaboration;