import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  language?: "ny" | "en";
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

export function VoiceInput({ onTranscription, language = "ny", disabled = false }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const MAX_DURATION = 60;

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    // Try Web Speech API first (works in Chrome/Edge on desktop + Android)
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = language === "ny" ? "ny-MW" : "en-MW";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setState("recording");
        timerRef.current = setInterval(() => {
          setDuration((d) => {
            if (d >= MAX_DURATION) {
              stopRecording();
              return MAX_DURATION;
            }
            return d + 1;
          });
        }, 1000);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(" ");
        if (transcript.trim()) {
          onTranscription(transcript.trim());
        }
        setState("idle");
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setError("Microphone permission denied. Check your browser settings.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try again.");
        } else {
          setError(`Voice error: ${event.error}`);
        }
        setState("error");
        stopRecording();
      };

      recognition.onend = () => {
        setState((prev) => (prev === "recording" ? "idle" : prev));
        stopRecording();
      };

      recognitionRef.current = recognition;
      recognition.start();
      return;
    }

    // Fallback: MediaRecorder (records audio for later transcription)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Store for offline transcription on next sync
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const existing = JSON.parse(localStorage.getItem("zisamale-voice-queue") || "[]");
            existing.push({
              blob: reader.result,
              language,
              timestamp: new Date().toISOString(),
            });
            localStorage.setItem("zisamale-voice-queue", JSON.stringify(existing));
          };
          reader.readAsDataURL(blob);
        } catch {
          // localStorage full or unavailable
        }
        onTranscription("[Voice recording saved — will transcribe on next sync]");
        setState("idle");
      };

      recorder.onerror = () => {
        setError("Recording failed. Check microphone permissions.");
        setState("error");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRef.current = recorder;
      recorder.start();
      setState("recording");
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return d + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone not available. Check permissions.");
      setState("error");
    }
  }, [language, onTranscription, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  function handleClick() {
    if (state === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const isRecording = state === "recording";

  return (
    <div className="voice-input" role="group" aria-label="Voice input">
      <button
        type="button"
        className={`voice-btn ${isRecording ? "voice-btn-recording" : ""}`}
        onClick={handleClick}
        disabled={disabled || state === "processing"}
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
        aria-pressed={isRecording}
      >
        <span className="voice-btn-icon" aria-hidden="true">
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </span>
        {isRecording && (
          <span className="voice-pulse-ring" aria-hidden="true" />
        )}
      </button>
      <div className="voice-status">
        {isRecording && (
          <span className="voice-timer">
            {language === "ny" ? "Kuyankhula" : "Speaking"}... {duration}s/{MAX_DURATION}s
          </span>
        )}
        {state === "processing" && (
          <span className="voice-processing">
            {language === "ny" ? "Kusanthula..." : "Processing..."}
          </span>
        )}
        {state === "error" && error && (
          <span className="voice-error" role="alert">{error}</span>
        )}
        {state === "idle" && !error && (
          <span className="voice-hint">
            {language === "ny"
              ? "Dikirani kuyankhula"
              : "Tap to speak"}
          </span>
        )}
      </div>
    </div>
  );
}
