import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, StopCircle, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface SyncedScriptPlayerProps {
  script: string;
}

interface WordSpan {
  word: string;
  charStart: number;
  charEnd: number;
}

const SyncedScriptPlayer = ({ script }: SyncedScriptPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedChar, setHighlightedChar] = useState<number>(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build word spans from the script
  const wordSpans: WordSpan[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(script)) !== null) {
    wordSpans.push({
      word: match[0],
      charStart: match.index,
      charEnd: match.index + match[0].length,
    });
  }

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setHighlightedChar(-1);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsPaused(false);
    setIsPlaying(true);
  }, []);

  const play = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech is not supported in your browser.");
      return;
    }

    window.speechSynthesis.cancel();
    setHighlightedChar(-1);

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;

    // Pick a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("male") ||
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("daniel") ||
          v.name.toLowerCase().includes("google us"))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setHighlightedChar(event.charIndex);
        // Auto-scroll highlighted word into view
        const el = document.getElementById(`word-${event.charIndex}`);
        if (el && containerRef.current) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setHighlightedChar(-1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, [script]);

  // Reload voices once they're available
  useEffect(() => {
    const handleVoicesChanged = () => {}; // trigger re-render
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Find the active word span index for a given charIndex
  const getActiveWordIdx = (charIdx: number) => {
    if (charIdx < 0) return -1;
    return wordSpans.findIndex(
      (w) => charIdx >= w.charStart && charIdx < w.charEnd
    );
  };

  const activeIdx = getActiveWordIdx(highlightedChar);

  // Render script with per-word spans, preserving newlines
  const renderScript = () => {
    if (!isPlaying && !isPaused) {
      // Plain render — no highlights
      return (
        <span className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {script}
        </span>
      );
    }

    // Build rendered output mixing plain gaps and highlighted words
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    wordSpans.forEach((w, i) => {
      // Text between words (spaces/newlines)
      if (cursor < w.charStart) {
        const gap = script.slice(cursor, w.charStart);
        parts.push(
          <span key={`gap-${i}`} className="whitespace-pre-wrap">
            {gap}
          </span>
        );
      }
      const isActive = i === activeIdx;
      parts.push(
        <span
          key={`word-${w.charStart}`}
          id={`word-${w.charStart}`}
          className={`rounded transition-all duration-75 ${
            isActive
              ? "bg-primary text-primary-foreground px-0.5 font-semibold"
              : "text-foreground"
          }`}
        >
          {w.word}
        </span>
      );
      cursor = w.charEnd;
    });

    // Trailing text
    if (cursor < script.length) {
      parts.push(
        <span key="tail" className="whitespace-pre-wrap text-foreground">
          {script.slice(cursor)}
        </span>
      );
    }

    return <span className="text-sm leading-relaxed">{parts}</span>;
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isPlaying && !isPaused && (
          <Button size="sm" onClick={play} className="gap-2">
            <Play className="h-4 w-4" /> Play Audio
          </Button>
        )}
        {isPlaying && (
          <Button size="sm" variant="outline" onClick={pause} className="gap-2">
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        {isPaused && (
          <Button size="sm" onClick={resume} className="gap-2">
            <Play className="h-4 w-4" /> Resume
          </Button>
        )}
        {(isPlaying || isPaused) && (
          <Button size="sm" variant="destructive" onClick={stop} className="gap-2">
            <StopCircle className="h-4 w-4" /> Stop
          </Button>
        )}
        {(isPlaying || isPaused) && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
            <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
            {isPlaying ? "Playing…" : "Paused"}
          </span>
        )}
      </div>

      {/* Script display */}
      <div
        ref={containerRef}
        className="p-4 rounded-lg bg-muted/60 max-h-[480px] overflow-y-auto leading-relaxed text-sm border border-border/40"
      >
        {renderScript()}
      </div>
    </div>
  );
};

export default SyncedScriptPlayer;
