"use client";

import { useState } from "react";
import styles from "./username_prompt.module.css";

type UsernamePromptProps = {
  onSave: (username: string) => void;
};

export default function UsernamePrompt({ onSave }: UsernamePromptProps) {
  const [username, setUsername] = useState("");
  const trimmed = username.trim();

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Set a username</h2>
        <p className={styles.subtitle}>Please enter a username to continue.</p>
        <input
          className={styles.input}
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
        />
        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            disabled={!trimmed}
            onClick={() => onSave(trimmed)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
