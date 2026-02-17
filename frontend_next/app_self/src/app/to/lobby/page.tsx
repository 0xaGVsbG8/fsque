"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { base_ws, default_app_url } from "../app_conf";
import {redirect } from 'next/navigation'
import { app_title } from "../app_conf";
import CreateRoomPanel, { CreateRoomPayload } from "./createroompanel/CreateRoomPanel";
import styles from "./page.module.css";
import "./style.css";
import { acquire_rooms_ls } from "../modules/acquire_rooms_ls";
import get_username from "../modules/get_username";
import { RoomEntry } from "../types";
import { remove_cookie, set_cookie } from "../modules/cookie_manager";





const redirect_to_room = (room_id: string, copy_url: boolean = false) => {
  const url = `/fsque/to/room/${room_id}`

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
  const ws_opened = useRef<boolean>(false)
  const [conn_established, set_conn_established] = useState<boolean>(false)

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
          occupancy: 0
        },
      ];
    });
    setShowCreate(false);
  };

  const gather_rooms_ls = async() => {
    const ws_url = base_ws + '/rooms-lobby/'

    if(ws_opened.current) return
    ws_opened.current = true

    const ws = new WebSocket(ws_url)

    ws.onopen = () => {
      console.log('connection opened')
      set_conn_established(true)
    }

    ws.onclose = () => {
      console.log('connection closed!')
      setRooms([])
      set_conn_established(false)
      ws.removeEventListener('message', handleMessage)
      setTimeout(() => {
        window.location.reload()
      }, 3000);
    }

    const handleMessage = (msg: MessageEvent) => {
      const data = JSON.parse(msg.data)
      console.log(data)
      if(data.rooms){
        //example data to render columns
        setRooms([...data.rooms,...[{'name':'','protected': false, 'visible':false}]])
      }
    }



    ws.addEventListener('message', handleMessage)

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
          <button className={styles.logoutButton} onClick={()=>{
            remove_cookie('username')
            window.location.reload()
          }}>Log out</button>
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

          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div className={styles.tableRow}>
                <div className={styles.colRoom}>Room name</div>
                <div className={styles.colOwner}>Owner</div>
                <div className={styles.colProtected}>Protected</div>
                <div className={styles.colOccupancy}>Occupancy</div>
                <div className={styles.colAction}>Action</div>
              </div>
            </div>
            <div className={styles.tableBody}>
              {filteredRooms.length === 0 ? (
                <div className={styles.emptyState}>
                  {conn_established ? ( (rooms && rooms[0].name != '') ?  'No rooms match your search.' : 'No rooms yet')   : 'Establishing connection...'}
                </div>
              ) : (
                filteredRooms.map((room, index) => (
                  <div className={styles.tableRow} key={room.room_id+index}>
                    <div className={`${styles.roomName} ${styles.colRoom}`}>{room.name}</div>
                    <div className={styles.colOwner}>{room.owner}</div>
                    <div className={styles.colProtected}>
                      <span
                        className={`${styles.pill} ${
                          room.protected ? styles.pillProtected : styles.pillOpen
                        }`}
                      >
                        {room.protected ? "Private" : "Public"}
                      </span>
                    </div>
                    <div className={styles.colOccupancy}>{room.occupancy}</div>
                    <div className={styles.colAction}>
                      <button className={styles.joinButton} type="button" onClick={()=>redirect_to_room(room.room_id)}>
                        Join
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
