import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_LISTEN_IDLE_MS = 5000;

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface AutoListenOptions {
  idleMs?: number;
  onFinal: (text: string) => void;
  onStop?: () => void;
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');
  const hasSpeechRef = useRef(false);
  const onFinalRef = useRef<(text: string) => void>(() => undefined);
  const onStopRef = useRef<(() => void) | undefined>(undefined);
  const submittedRef = useRef(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearIdleTimer();
    if (recognitionRef.current) {
      const active = recognitionRef.current;
      recognitionRef.current = null;
      active.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
    transcriptRef.current = '';
    hasSpeechRef.current = false;
  }, [clearIdleTimer]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));

    const primeVoices = () => {
      window.speechSynthesis?.getVoices();
    };
    primeVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', primeVoices);

    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', primeVoices);
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, [stopListening]);

  const unlockAudio = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!text.trim() || !window.speechSynthesis) {
          resolve();
          return;
        }

        stopListening();
        window.speechSynthesis.cancel();
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              v.name.toLowerCase().includes('female'),
          ) ?? voices.find((v) => v.lang.startsWith('en'));
        if (preferred) utterance.voice = preferred;

        const finish = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      });
    },
    [stopListening],
  );

  const startAutoListen = useCallback(
    (options: AutoListenOptions) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor || isSpeakingRef.current) return;

      stopListening();

      const idleMs = options.idleMs ?? AUTO_LISTEN_IDLE_MS;
      onFinalRef.current = options.onFinal;
      onStopRef.current = options.onStop;

      submittedRef.current = false;
      hasSpeechRef.current = false;
      transcriptRef.current = '';

      const finishWithText = (text: string) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        stopListening();
        if (text.trim()) {
          onFinalRef.current(text.trim());
        } else {
          onStopRef.current?.();
        }
      };

      const handleIdle = () => {
        if (!hasSpeechRef.current) {
          stopListening();
          onStopRef.current?.();
          return;
        }
        finishWithText(transcriptRef.current);
      };

      const scheduleIdle = () => {
        clearIdleTimer();
        idleTimerRef.current = setTimeout(handleIdle, idleMs);
      };

      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        scheduleIdle();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript ?? '';
          combined += piece;
          if (piece.trim()) hasSpeechRef.current = true;
        }
        transcriptRef.current = combined;
        setInterimTranscript(combined);
        scheduleIdle();
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setIsListening(false);
        setInterimTranscript('');
        const text = transcriptRef.current.trim();
        transcriptRef.current = '';
        if (text && !submittedRef.current) {
          finishWithText(text);
        }
      };

      recognition.onerror = (event: Event) => {
        const code = (event as Event & { error?: string }).error;
        if (code === 'no-speech' || code === 'aborted') {
          return;
        }
        stopListening();
        onStopRef.current?.();
      };

      try {
        recognition.start();
      } catch {
        stopListening();
        onStopRef.current?.();
      }
    },
    [clearIdleTimer, stopListening],
  );

  return {
    isListening,
    isSpeaking,
    interimTranscript,
    isSupported,
    speak,
    startAutoListen,
    stopListening,
    unlockAudio,
  };
}
