"use client";

import { useMemo, useState } from "react";
import { app_title } from "../app_conf";
import CreateRoomPanel, { CreateRoomPayload } from "./createroompanel/CreateRoomPanel";
import styles from "./page.module.css";
import "./style.css";

type RoomEntry = {
  name: string;
  protected: boolean;
  visible: boolean;
  password?: string;
  redirectImmediately?: boolean;
};

const initialRooms: RoomEntry[] = [
  { name: "Alpha Room", protected: true, visible: true },
  { name: "Beta Lounge", protected: false, visible: true },
  { name: "Gamma Hub", protected: true, visible: true },
  { name: "Delta Den", protected: false, visible: true },
  { name: "Epsilon Suite", protected: false, visible: true },
];


export default function LobbyPage() {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [rooms, setRooms] = useState<RoomEntry[]>(initialRooms);

  const filteredRooms = useMemo<RoomEntry[]>(() => {
    const normalized = query.trim().toLowerCase();
    return rooms.filter((room) => {
      if (!room.visible) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return room.name.toLowerCase().includes(normalized);
    });
  }, [query, rooms]);

  const handleCreateRoom = (payload: CreateRoomPayload) => {
    const name = payload.name.trim();
    const password = payload.password.trim();

    if (!name) {
      return;
    }

    if (payload.protected && !password) {
      return;
    }

    setRooms((prev) => {
      if (prev.some((room) => room.name.toLowerCase() === name.toLowerCase())) {
        return prev;
      }

      return [
        ...prev,
        {
          name,
          protected: payload.protected,
          visible: payload.visible,
          password: payload.protected ? password : undefined,
          redirectImmediately: payload.redirectImmediately,
        },
      ];
    });

    setShowCreate(false);
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.mainContent} ${showCreate ? styles.pageDimmed : ""}`}>
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
            <button
              className={styles.createButton}
              type="button"
              onClick={() => setShowCreate((prev) => !prev)}
            >
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
              {filteredRooms.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={3}>
                    No rooms match your search.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
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
      {showCreate ? <div className={styles.overlay} /> : null}
      {showCreate ? (
        <CreateRoomPanel onCreate={handleCreateRoom} onClose={() => setShowCreate(false)} />
      ) : null}
    </div>
  );
}
