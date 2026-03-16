import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Smoothly reveals text word-by-word using an eased animation.
 *
 * While streaming, each new batch of tokens triggers an animation from the
 * current cursor position to the new word count. After streaming ends the
 * animation keeps running until the cursor reaches the final word — so the
 * reveal never cuts off abruptly.
 *
 * Messages that mount with `isStreaming = false` (e.g. restored from session
 * storage) skip animation entirely and return the full text immediately.
 *
 * Returns `[displayText, isAnimating]` so the caller can keep showing the
 * blinking cursor until the reveal finishes.
 */
export function useAnimatedText(
  text: string,
  isStreaming: boolean,
): [string, boolean] {
  const [cursor, setCursor] = useState(0);
  const [startingCursor, setStartingCursor] = useState(0);
  const [prevText, setPrevText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track whether this instance ever saw streaming. Messages that mount
  // already complete (isStreaming=false on first render) should never animate.
  const hasStreamed = useRef(isStreaming);
  if (isStreaming) {
    hasStreamed.current = true;
  }

  if (prevText !== text) {
    setPrevText(text);
    setStartingCursor(text.startsWith(prevText) ? cursor : 0);
  }

  useEffect(() => {
    if (!hasStreamed.current) {
      return;
    }

    const words = text.split(" ");

    setIsAnimating(true);

    const wordsToReveal = words.length - startingCursor;
    const duration = Math.min(10, Math.max(1, wordsToReveal * 0.08));

    const controls = animate(startingCursor, words.length, {
      duration,
      ease: "easeOut",
      onUpdate(latest) {
        setCursor(Math.floor(latest));
      },
      onComplete() {
        setIsAnimating(false);
      },
    });

    return () => controls.stop();
  }, [startingCursor, text]);

  if (!hasStreamed.current) {
    return [text, false];
  }

  return [text.split(" ").slice(0, cursor).join(" "), isAnimating];
}
