"use client";

import { useState } from "react";
import styles from "./CreateRoomPanel.module.css";
import { base_fetch } from "@/app/app_conf";
import get_username from "@/app/modules/get_username";
import { redirect } from "next/dist/server/api-utils";
import { redirect_to_room } from "../page";

export type CreateRoomPayload = {
  name: string;
  protected: boolean;
  password: string;
  visible: boolean;
  redirectImmediately: boolean;
};

type CreateRoomPanelProps = {
  onCreated: (payload: CreateRoomPayload) => void;
  onClose: () => void;
};

export default function CreateRoomPanel({ onCreated, onClose }: CreateRoomPanelProps) {
  const [formData, setFormData] = useState<CreateRoomPayload>({
    name: "",
    protected: false,
    password: "",
    visible: true,
    redirectImmediately: true,
  });

  const isCreateDisabled =
    !formData.name.trim() ||    
    (formData.protected && !formData.password.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = formData.name.trim();
    const password = formData.password.trim();

    if (!name) {
      return;
    }

    if (formData.protected && !password) {
      return;
    }

    try {
      const response = await fetch(base_fetch+"/make_room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          passwd: formData.protected ? password : "",
          privacy: formData.protected ? "private" : "public",
          visible: formData.visible,
          owner: get_username()
        }),
      });
      

      if (!response.ok) {
        return;
      }

      const data = await response.json()

      onCreated(formData);
      setFormData({
        name: "",
        protected: false,
        password: "",
        visible: true,
        redirectImmediately: true,
      });
      onClose();

      if(formData.redirectImmediately){
        redirect_to_room(data.room_token, true)
      }

    } catch (error) {
      console.error("Failed to create room", error);
    }
  };

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Create a room</h2>
        <p className={styles.panelSubtitle}>Set up a room and choose its visibility.</p>
      </div>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.label}>Room name</span>
          <input
            className={styles.textInput}
            type="text"
            value={formData.name}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Room name"
          />
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={formData.protected}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                protected: event.target.checked,
                password: event.target.checked ? prev.password : "",
              }))
            }
          />
          <span>Protected room</span>
        </label>
        {formData.protected ? (
          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.textInput}
              type="password"
              value={formData.password}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              placeholder="Enter a password"
            />
          </label>
        ) : null}
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={formData.visible}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                visible: event.target.checked,
              }))
            }
          />
          <span>Show in room list</span>
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={formData.redirectImmediately}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                redirectImmediately: event.target.checked,
              }))
            }
          />
          <span>Redirect right away</span>
        </label>
      </div>
      <div className={styles.formActions}>
        <button className={styles.secondaryButton} type="button" onClick={onClose}>
          Cancel
        </button>
        <button className={styles.submitButton} type="submit" disabled={isCreateDisabled}>
          Create room
        </button>
      </div>
    </form>
  );
}
