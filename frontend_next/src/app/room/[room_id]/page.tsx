'use client'

import { useEffect, useState, useRef } from 'react'
import { base_fetch, base_ws } from '@/app/app_conf'
import { useParams } from 'next/navigation'
import RoomProtectedPrompt from '../comps/room_protected_prompt'
import launch from '../comps/app_modules/mk_conn'
import { cookie_finder,set_cookie } from '@/app/modules/cookie_manager'
import { payload_props, user_ws_conn_info } from '@/app/types'

type RoomDataProps = {
    room_found: boolean
    ROOM_PROTECTED: boolean
    ALLOW_USER: boolean
}

let opened_single_file_transfer: boolean = false

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
    const [users_ws_conn_info, set_users_ws_conn_info] = useState<user_ws_conn_info[] | null>(null)
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
    const ws_ref = useRef<WebSocket | null>(null)
    const just_files_names = useRef<payload_props[]>([])

    const fileLsRefForTransfer = useRef<File[]|null>(null)

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
            setFileLs(prev => [...prev, ...files])
            fileLsRefForTransfer.current = [...fileLsRefForTransfer.current ? fileLsRefForTransfer.current : [], ...files]
         

            // just_files_names.current = [...just_files_names.current, ...files.map((item)=>{console.log(item.name); return item.name})]
            just_files_names.current = [...just_files_names.current, ...files.map((item)=>{console.log(item.name); return {'filename': item.name, 'filesize': item.size}})]
            // just_files_names.current =files.map((item)=>{console.log(item.name); return {'filename': item.name, 'filesize': item.size}})

            if(ws_ref.current){
                console.log('updating payload')
                ws_ref.current.send(JSON.stringify({
                    'users_payload':just_files_names.current
                }))
            }

            console.log('Wybrane pliki:', just_files_names.current)

            // setHandles(prev => [...prev, ...newHandles])
        } catch (e) {
            console.log('User anulował wybór pliku')
        }
    }
    
    const DownloadSingleFile = async (filename: string, user_id:string) => {
        if (!('showSaveFilePicker' in window)) return
        if(!ws_ref.current) return
    
        try {
            const fileHandle =  await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [
                    {
                        description: "Text file",
                        accept: { "text/plain": [".txt"] }
                    }
                ]
            })

            const writable = await fileHandle.createWritable()



            const handle_transfer = async(event: MessageEvent) => {
                const data = JSON.parse(event.data)

                console.log(data, 'pciker')

                if (data.incoming_transfer && data.TRANSFER_ACCESS_TOKEN) {

                    if(opened_single_file_transfer) return
                    opened_single_file_transfer = true

                    const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                    console.log("Transfer accepted:", TRANSFER_ACCESS_TOKEN)

                    const local_ws = new WebSocket(base_ws + '/make-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)
                    // ws.binaryType = "arraybuffer"
                    
                    setTimeout(() => {
                        opened_single_file_transfer = false
                    }, 150);

                    local_ws.onopen = async() => {
                        console.log('transfer opened')
                        local_ws.send(JSON.stringify({'ready_for_transfer':true, 'role': data.role}))
                    }

                    local_ws.onmessage = async(message) => {
                        console.log(message)
                        if (message.data instanceof Blob) {
                            console.log("chunk received")
                            local_ws.send(JSON.stringify({'received_chunk':true}))
                            await writable.write(message.data)
                        } 
                        else{
                            try{
                                const data = JSON.parse(message.data)
                                if(data.transfer_complete){
                                    console.log('transfer complete (CLIENT)')
                                    setTimeout(async() => {
                                        await writable.close()
                                    }, 200);
                                }
                            }catch(err){}
                        }

                    }

                    local_ws.onclose = () => {
                        console.log('conn lose')
                    }

                    // if(data.role=='client'){
                    //     console.log(data, '??')
                    // }

                    // if(ws_ref.current) ws_ref.current.removeEventListener("message", handle_transfer)

                }
                
            }


            ws_ref.current.addEventListener("message", handle_transfer)

            ws_ref.current.send(JSON.stringify({'user_single_file_transfer_request': {'filename':filename,'file_owner_id':user_id}}))

            // await writable.close()
    
            
            // await writable.close()
    
        } catch (err) {
            console.error(err)
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
            launch({ws_ref, set_conns_counter, set_users_ws_conn_info, fileLsRefForTransfer})
        }, 1000);
        },[])
return (
        <>
            {roomData && !roomData.ALLOW_USER ? (
                <RoomProtectedPrompt onSubmit={handleRoomLogin} />
            ) : null}

            <>Connected users: {conns_counter}</>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', color: '#333' }}>
                {users_ws_conn_info && users_ws_conn_info.map((user, uIndex) => (
                    <div key={user.user_id + uIndex} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#000' }}>
                                {user.username + (user.username == cookie_finder('username') ? ' (Me)' : '')}
                            </div>
                            {user.payload && user.payload.some(p => typeof p === 'object' && p.filename) && (
                                <button
                                    onClick={() => setExpandedUsers(prev => ({ ...prev, [user.user_id]: !prev[user.user_id] }))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#555', padding: '2px 8px' }}
                                >
                                    {expandedUsers[user.user_id] === false ? '▼' : '▲'}
                                </button>
                            )}
                        </div>
                        
                        {expandedUsers[user.user_id] !== false && user.payload && user.payload.some(p => typeof p === 'object' && p.filename) && (
                            <div style={{ paddingLeft: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px', fontWeight: 'bold', color: '#555', fontSize: '0.9rem' }}>
                                        <div>Filename</div>
                                        <div>Size</div>
                                        <div style={{ textAlign: 'center' }}>Action</div>
                                    </div>
                                    {user.payload.filter(p => typeof p === 'object' && p.filename).map((item, pIndex) => (
                                        <div key={pIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px', alignItems: 'center', padding: '5px 0', borderBottom: '1px dashed #eee', color: '#333' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.filename}
                                            </div>
                                            <div>
                                                {item.filesize ? (item.filesize / 1024).toFixed(2) + ' KB' : '0 KB'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px',justifyContent:'center', alignContent:'center'}}>
                                                {/* <button style={{ padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                    <span style={{ fontWeight: 'bold' }}>Download</span>
                                                </button> */}
                                                <input type='checkbox' value={item.filename}></input>
                                                <button onClick={()=>DownloadSingleFile(item.filename, user.user_id)} style={{ padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                    <span style={{ fontWeight: 'bold' }}>Down</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

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
