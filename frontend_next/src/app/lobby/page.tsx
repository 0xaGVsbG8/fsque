"use client";

import { useMemo, useState } from "react";
import { app_title } from "../app_conf";
import styles from "./page.module.css";
import './style.css'

const roomsByName = {
  "Alpha Room": { protected: true },
  "Beta Lounge": { protected: false },
  "Gamma Hub": { protected: true },
  "Delta Den": { protected: false },
  "Epsilon Suite": { protected: false },
} as const;

type RoomEntry = {
  name: string;
  protected: boolean;
};


export default function LobbyPage() {
  const [query, setQuery] = useState("");

  const rooms = useMemo<RoomEntry[]>(() => {
    const entries = Object.entries(roomsByName).map(([name, info]) => ({
      name,
      protected: info.protected,
    }));

    if (!query.trim()) {
      return entries;
    }

    const normalized = query.toLowerCase();
    return entries.filter((room) => room.name.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{app_title}</h1>
        <p className={styles.subtitle}>Find a room or create a new one.</p>

        <div className={styles.controls}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search rooms"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search rooms"
          />
          <button className={styles.createButton} type="button">
            Create Room
          </button>
        </div>

        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.colRoom}>Room name</th>
              <th className={styles.colProtected}>Protected</th>
              <th className={styles.colAction}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td className={styles.emptyState} colSpan={3}>
                  No rooms match your search.
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr className={styles.tableRow} key={room.name}>
                  <td className={`${styles.roomName} ${styles.colRoom}`}>{room.name}</td>
                  <td className={styles.colProtected}>
                    <span
                      className={`${styles.pill} ${
                        room.protected ? styles.pillProtected : styles.pillOpen
                      }`}
                    >
                      {room.protected ? "Private" : "Public"}
                    </span>
                  </td>
                  <td className={styles.colAction}>
                    <button className={styles.joinButton} type="button">
                      Join
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
