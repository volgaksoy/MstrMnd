"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Guess = { value: string; exact: number; misplaced: number };
type Theme = "system" | "light" | "dark";

function makeSecret(length: number, repeats: boolean) {
  const digits = Array.from({ length: 10 }, (_, index) => String(index));
  if (repeats) {
    return Array.from({ length }, () => digits[Math.floor(Math.random() * 10)]).join("");
  }
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, length).join("");
}

function scoreGuess(secret: string, guess: string) {
  let exact = 0;
  const secretCounts: Record<string, number> = {};
  const guessCounts: Record<string, number> = {};
  for (let i = 0; i < secret.length; i += 1) {
    if (secret[i] === guess[i]) exact += 1;
    else {
      secretCounts[secret[i]] = (secretCounts[secret[i]] ?? 0) + 1;
      guessCounts[guess[i]] = (guessCounts[guess[i]] ?? 0) + 1;
    }
  }
  const misplaced = Object.keys(guessCounts).reduce(
    (sum, digit) => sum + Math.min(guessCounts[digit], secretCounts[digit] ?? 0),
    0,
  );
  return { exact, misplaced };
}

export default function Home() {
  const [length, setLength] = useState(5);
  const [repeats, setRepeats] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [secret, setSecret] = useState("");
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [won, setWon] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function newGame(nextLength = length, nextRepeats = repeats) {
    setSecret(makeSecret(nextLength, nextRepeats));
    setGuess("");
    setGuesses([]);
    setWon(false);
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  useEffect(() => {
    const saved = localStorage.getItem("mstrmnd-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { length?: number; repeats?: boolean; theme?: Theme };
        const savedLength = Math.min(10, Math.max(3, parsed.length ?? 5));
        const savedRepeats = Boolean(parsed.repeats);
        const savedTheme = ["system", "light", "dark"].includes(parsed.theme ?? "") ? parsed.theme! : "system";
        setLength(savedLength);
        setRepeats(savedRepeats);
        setTheme(savedTheme);
        setSecret(makeSecret(savedLength, savedRepeats));
        return;
      } catch { /* start with defaults */ }
    }
    setSecret(makeSecret(5, false));
  }, []);

  useEffect(() => {
    if (secret) localStorage.setItem("mstrmnd-settings", JSON.stringify({ length, repeats, theme }));
  }, [length, repeats, theme, secret]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      if (theme === "system") root.removeAttribute("data-theme");
      else root.dataset.theme = theme;
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#111512" : "#f2efe7");
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  function submitGuess(event: FormEvent) {
    event.preventDefault();
    if (won) return;
    if (guess.length !== length) {
      setError(`Enter exactly ${length} digits.`);
      return;
    }
    if (!repeats && new Set(guess).size !== guess.length) {
      setError("Digits cannot repeat in this game.");
      return;
    }
    const result = scoreGuess(secret, guess);
    setGuesses((current) => [{ value: guess, ...result }, ...current]);
    setGuess("");
    setError("");
    if (result.exact === length) setWon(true);
  }

  const attempt = guesses.length + 1;

  return (
    <main>
      <section className="game-shell">
        <header>
          <div className="brand-mark" aria-hidden="true">M</div>
          <div>
            <p className="eyebrow">THE NUMBER GAME</p>
            <h1>MstrMnd</h1>
          </div>
          <div className="header-actions">
            <select className="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as Theme)} aria-label="Color theme">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <button className="new-button" onClick={() => newGame()} aria-label="Start a new game">New game</button>
          </div>
        </header>

        <div className="rules">
          <div className="rule-copy">
            <span>Crack the hidden {length}-digit number.</span>
            <span><b className="plus">+</b> right place&nbsp;&nbsp; <b className="minus">−</b> wrong place</span>
          </div>
          <div className="settings" aria-label="Game settings">
            <label>
              Digits
              <select value={length} onChange={(e) => { const value = Number(e.target.value); setLength(value); newGame(value, repeats); }}>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="toggle-label">
              Repeats
              <button
                type="button"
                role="switch"
                aria-checked={repeats}
                className={`switch ${repeats ? "on" : ""}`}
                onClick={() => { const value = !repeats; setRepeats(value); newGame(length, value); }}
              ><span /></button>
            </label>
          </div>
        </div>

        {won ? (
          <section className="victory" aria-live="polite">
            <p className="eyebrow">CODE CRACKED</p>
            <h2>{secret}</h2>
            <p>You solved it in <strong>{guesses.length}</strong> {guesses.length === 1 ? "guess" : "guesses"}.</p>
            <button onClick={() => newGame()}>Play again</button>
          </section>
        ) : (
          <form onSubmit={submitGuess} className="guess-form">
            <label htmlFor="guess">Guess #{attempt}</label>
            <div className="input-row">
              <input
                ref={inputRef}
                id="guess"
                value={guess}
                onChange={(e) => { setGuess(e.target.value.replace(/\D/g, "").slice(0, length)); setError(""); }}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder={"•".repeat(length)}
                aria-describedby="guess-error"
                autoFocus
              />
              <button type="submit" disabled={guess.length !== length}>Check</button>
            </div>
            <p id="guess-error" className="error" aria-live="polite">{error || "\u00a0"}</p>
          </form>
        )}

        <section className="history" aria-label="Previous guesses">
          <div className="history-heading">
            <h2>Guesses</h2>
            <span>{guesses.length} {guesses.length === 1 ? "attempt" : "attempts"}</span>
          </div>
          {guesses.length === 0 ? (
            <div className="empty-state"><span>?</span><p>Your clues will appear here.</p></div>
          ) : (
            <ol reversed>
              {guesses.map((item, index) => (
                <li key={`${item.value}-${guesses.length - index}`}>
                  <span className="attempt-number">{guesses.length - index}</span>
                  <strong>{item.value}</strong>
                  <span className="score" aria-label={`${item.exact} exact, ${item.misplaced} misplaced`}>
                    <b className="plus">+{item.exact}</b><b className="minus">−{item.misplaced}</b>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
      <footer>Every game is generated on your device.</footer>
    </main>
  );
}
