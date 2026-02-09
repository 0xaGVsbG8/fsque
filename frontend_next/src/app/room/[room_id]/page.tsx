'use client'

import { useEffect, useState } from 'react'
import { base_fetch } from '@/app/app_conf'
import { useParams } from 'next/navigation'
import RoomProtectedPrompt from '../comps/room_protected_prompt'
import launch from '../comps/app_modules/mk_conn'
import { cookie_finder,set_cookie } from '@/app/modules/cookie_manager'

type RoomDataProps = {
    room_found: boolean
    ROOM_PROTECTED: boolean
    ALLOW_USER: boolean
}

const does_room_exists = async (room_id: string): Promise<RoomDataProps> => {
    const response = await fetch(base_fetch + '/does_room_exists' + `/?received_room_id=${room_id}`, { credentials: 'include' })
    const data = await response.json()
    console.log(data, 'xd?', room_id)
    if (!data || data.room_found === false) {
        // window.open('/lobby', '_self')
    }
    if(data.USER_ACCESS_TOKEN){set_cookie('USER_ACCESS_TOKEN', data.USER_ACCESS_TOKEN)}
    set_cookie('ROOM_ID', room_id)
    return data
}

const View = () => {
    const [roomData, setRoomData] = useState<RoomDataProps | null>(null)
    const [fileLs, setFileLs] = useState<File[]>([])
    const [handles, setHandles] = useState<any[]>([]) // FileSystemFileHandle[]

    const [conns_counter, set_conns_counter] = useState<number | null>(null)
    const [connected_usernames, set_connected_usernames] = useState<string[] | null>(null)

    const params = useParams()

    useEffect(() => {
        const loadRoom = async () => {
            const data = await does_room_exists(String(params.room_id))
            setRoomData(data)
        }
        loadRoom()
    }, [params.room_id])

    const handleRoomLogin = async (password: string) => {
        const roomId = String(params.room_id)
        try {
            const response = await fetch(base_fetch + '/check_room_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    received_room_id: roomId,
                    received_passwd: password,
                }),
            })

            if (!response.ok) return

            const data = await response.json().catch(() => null)

            if (data && typeof data.ALLOW_USER === 'boolean') {
                setRoomData(prev => (prev ? { ...prev, ALLOW_USER: data.ALLOW_USER } : prev))
            }

            if (data && data.refresh) window.location.reload()
        } catch (error) {
            console.error('Failed to verify room password', error)
        }
    }

    // PICK FILES
    const pickFile = async () => {
        if (!('showOpenFilePicker' in window)) return

        try {
            const picker = window.showOpenFilePicker as (opts?: { multiple?: boolean }) => Promise<any[]>
            const newHandles = await picker({ multiple: true })

            const files = await Promise.all(newHandles.map(h => h.getFile()))
            console.log('Wybrane pliki:', files)

            setFileLs(prev => [...prev, ...files])
            setHandles(prev => [...prev, ...newHandles])
        } catch (e) {
            console.log('User anulował wybór pliku')
        }
    }

    // ERASE FIRST FILE (RAM)
    const eraseFirstFileFromDisk = async () => {
        if (!handles[0]) {
          console.log('Brak uchwytu do pierwszego pliku')
          return
        }
      
        try {
          // w Chromium -> createWritable i truncate + close usunie zawartość pliku
          const writable = await handles[0].createWritable()
          await writable.truncate(0) // nadpisanie pustą zawartością
          await writable.close()
      
          // usuń też z listy w RAM
          setFileLs(prev => prev?.slice(1) || [])
          setHandles(prev => prev?.slice(1) || [])
      
          console.log('Plik fizycznie wyczyszczony z dysku!')
        } catch (err) {
          console.error('Nie udało się usunąć pliku', err)
        }
      }

      useEffect(()=>{
        setTimeout(() => {
            console.log('launching')
            launch({set_conns_counter, set_connected_usernames})
        }, 1000);
      },[])
    return (
        <>
            {roomData && !roomData.ALLOW_USER ? (
                <RoomProtectedPrompt onSubmit={handleRoomLogin} />
            ) : null}

            <>Connected users: {conns_counter}</>

            {connected_usernames && connected_usernames.map((value, index)=>{
                return (
                    <div key={index+value}>{value}</div>
                )
            })}

            <button onClick={pickFile}>Pick Files</button>
            <button onClick={eraseFirstFileFromDisk}>Delete First File</button>

            <div>
                {fileLs.map((file, index) => (
                    <div key={index}>{file.name}</div>
                ))}
            </div>
        </>
    )
}

export default View
export { does_room_exists }
