"use client";

import { useMemo, useState, useEffect } from "react";
import { default_app_url } from "../app_conf";
import {redirect } from 'next/navigation'
import { app_title } from "../app_conf";
import CreateRoomPanel, { CreateRoomPayload } from "./createroompanel/CreateRoomPanel";
import styles from "./page.module.css";
import "./style.css";
import { acquire_rooms_ls } from "../modules/acquire_rooms_ls";
import get_username from "../modules/get_username";

type RoomEntry = {
  name: string;
  protected: boolean;
  visible: boolean;
  password?: string;
  room_id: string,
  owner:string,
  redirectImmediately?: boolean;
};


// NOT IN USE ANYMORe
// const initialRooms: RoomEntry[] = [
//   { name: "Alpha Room", protected: true, visible: true },
//   { name: "Beta Lounge", protected: false, visible: true },
//   { name: "Gamma Hub", protected: true, visible: true },
//   { name: "Delta Den", protected: false, visible: true },
//   { name: "Epsilon Suite", protected: false, visible: true },
// ];

const redirect_to_room = (room_id: string, copy_url: boolean = false) => {
  const url = `/room/${room_id}`

  if(copy_url){
    try{
      navigator.clipboard.writeText(window.location.protocol + '//' + window.location.host + url);
    }catch(err){
      console.log('clipboard unavaiable')
    }
  }


  window.open(url, '_self')
}
export {redirect_to_room}

export default function LobbyPage() {



  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [rooms, setRooms] = useState<RoomEntry[]|null>();
  const [fetching_rooms,set_fetching_rooms] = useState<boolean>(true)


  const filteredRooms = useMemo<RoomEntry[]>(() => {
    const normalized = query.trim().toLowerCase();
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    return safeRooms.filter((room) => {
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
      const safeRooms = Array.isArray(prev) ? prev : [];
      // if (safeRooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) {
      //   return safeRooms;
      // }

      return [
        ...safeRooms,
        {
          name,
          protected: payload.protected,
          visible: payload.visible,
          password: payload.protected ? password : undefined,
          room_id: "",
          owner: get_username(),
          redirectImmediately: payload.redirectImmediately,
        },
      ];
    });
    setShowCreate(false);
  };

  const gather_rooms_ls = async() => {
    const data = await acquire_rooms_ls()
    setRooms([...data.rooms,...[{'name':'','protected': false, 'visible':false}]])
  }

  useEffect(()=>{
    gather_rooms_ls()
    set_fetching_rooms(false)
  },[])

  return (
    <div className={styles.page}>
      <div className={`${styles.mainContent} ${showCreate ? styles.pageDimmed : ""}`}>
        <div className={styles.container}>
          <h1 className={styles.title}>{app_title}</h1>
          <h2>Welcome, <span style={{textDecoration:'underline',color:'green'}}>{get_username()}</span></h2>
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
          <button className={styles.refreshButton} type="button" aria-label="Refresh rooms" onClick={gather_rooms_ls}>
            ↻
          </button>
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
                <th className={styles.colOwner}>Owner</th>
                <th className={styles.colProtected}>Protected</th>
                <th className={styles.colAction}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={3}>
                  {/* {rooms?.length === 0 ? 'No rooms match your search.' : 'loading in'} */}
                  {fetching_rooms ? 'Loading in' : 'No rooms match your search.'}
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room, index) => (
                  <tr className={styles.tableRow} key={room.room_id+index}>
                    <td className={`${styles.roomName} ${styles.colRoom}`}>{room.name}</td>
                    <td className={styles.colOwner}>{room.owner}</td>
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
                      <button className={styles.joinButton} type="button" onClick={()=>redirect_to_room(room.room_id)}>
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
        <CreateRoomPanel
          onCreated={handleCreateRoom}
          onClose={() => setShowCreate(false)}
        />
      ) : null}
    </div>
  );
}
