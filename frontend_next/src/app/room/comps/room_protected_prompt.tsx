"use client";

import { useState } from "react";
import styles from "./room_protected_prompt.module.css";

type RoomProtectedPromptProps = {
  onSubmit?: (password: string) => Promise<void>;
};

export default function RoomProtectedPrompt({ onSubmit }: RoomProtectedPromptProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmed = password.trim();

  const handleSubmit = async () => {
    if (!trimmed || !onSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>This room is protected</h2>
        <p className={styles.subtitle}>Enter the password to continue.</p>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Room password"
        />
        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            disabled={!trimmed || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Checking..." : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
