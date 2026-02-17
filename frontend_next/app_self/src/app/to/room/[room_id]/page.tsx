'use client'

import { useEffect, useState, useRef } from 'react'
import { base_fetch, base_ws, default_app_url, wait_for_client_response_while_uploading } from '../../app_conf'
import { useParams } from 'next/navigation'
import RoomProtectedPrompt from '../comps/room_protected_prompt'
import launch, { formatFileSize } from '../comps/app_modules/mk_conn'
import { cookie_finder,remove_cookie,set_cookie } from '../../modules/cookie_manager'
import { IncomingTransferData, payload_props, transfer_downloading, transfer_log_data_props, user_ws_conn_info } from '../../types'
import { v4 as uuidv4 } from 'uuid'
import Transfer_log from '../comps/transfer_log/transfer_log'
import get_username from '../../modules/get_username'
import DownloadSingleFile from './room_utils/DownloadSingleFile'
import styles from './room.module.css'
import DownloadMultipleFiles from './room_utils/DownloadMultipleFiles'

export type RoomDataProps = {
    room_found: boolean
    ROOM_PROTECTED: boolean
    ALLOW_USER: boolean
    // USER_ACCESS_TOKEN: string
}

export type ModifiedFile = {
    file_id: string
    file: File
}


let opened_single_file_transfer: boolean = false


const sleep = (ms: number) => new Promise(resolve => setTimeout(()=>{window.location.reload();resolve}, ms))


const does_room_exists = async (room_id: string): Promise<RoomDataProps | null> => {
    try{
        const response = await fetch(base_fetch + '/does_room_exists' + `/?received_room_id=${room_id}`, { credentials: 'include' })
        const data = await response.json() as RoomDataProps
        // console.log(data, 'xd?', room_id)
        if (!data || data.room_found === false) {
            window.open('/lobby', '_self')
        }
        // if(data.USER_ACCESS_TOKEN){set_cookie('USER_ACCESS_TOKEN', data.USER_ACCESS_TOKEN)}
        set_cookie('ROOM_ID', room_id)
        return data
    }catch(err){
        console.log('backend irresponding')
        await sleep(3000)

    }
    return null

}

const View = () => {
    const [roomData, setRoomData] = useState<RoomDataProps | null>(null)
    const [fileLs, setFileLs] = useState<ModifiedFile[]>([])
    const [handles, setHandles] = useState<any[]>([]) // FileSystemFileHandle[]

    const [transfer_log_data, set_transfer_log_data] = useState<transfer_log_data_props[]|null>(null)
    const transfer_log_data_ref = useRef<transfer_log_data_props[]|null>(null)

    const [ongoing_transfer_count, set_ongoing_transfer_count] = useState<number>(0)

    const [MyTempId, setMyTempId] = useState<string>('')

    const [conns_counter, set_conns_counter] = useState<number | null>(null)
    const [users_ws_conn_info, set_users_ws_conn_info] = useState<user_ws_conn_info[] | null>(null)
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
    const [selectedFiles, setSelectedFiles] = useState<Record<string, Set<string>>>({})
    const ws_ref = useRef<WebSocket | null>(null)
    const just_files_names = useRef<payload_props[]>([])

    const fileLsRefForTransfer = useRef<ModifiedFile[]|null>(null)

    const params = useParams()



    useEffect(() => {
        const loadRoom = async () => {
            const data = await does_room_exists(String(params.room_id))
            if(!data) return
            setRoomData(data)
            if(data.ALLOW_USER) {
                console.log('launching',data)
                launch({ws_ref, set_conns_counter, set_users_ws_conn_info,set_ongoing_transfer_count, setMyTempId,fileLsRefForTransfer, set_transfer_log_data, transfer_log_data_ref})
            }
        }
        loadRoom()
    }, [params.room_id])










    // Clean up selectedFiles when a user's payload changes (e.g. file dropped)
    useEffect(() => {
        if (!users_ws_conn_info) return
        setSelectedFiles(prev => {
            const next = { ...prev }
            let changed = false
            for (const userId of Object.keys(next)) {
                const user = users_ws_conn_info.find(u => u.user_id === userId)
                const validIds = new Set(
                    user?.payload?.filter(p => typeof p === 'object' && p.file_id).map(p => p.file_id) ?? []
                )
                const filtered = new Set([...next[userId]].filter(id => validIds.has(id)))
                if (filtered.size !== next[userId].size) {
                    changed = true
                    if (filtered.size === 0) delete next[userId]
                    else next[userId] = filtered
                }
            }
            return changed ? next : prev
        })
    }, [users_ws_conn_info])

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

            // const files = await Promise.all(newHandles.map(h => h.getFile()))

            const files = (
                await Promise.all(newHandles.map(h => h.getFile()))
            ).map(file => ({
                'file_id': crypto.randomUUID(),
                'file':file as File
            }))

            
            // const files = (
            //     await Promise.all(newHandles.map(h => h.getFile()))
            // ).map(file => ({
            //     ...file,
            //     file_id: crypto.randomUUID()
            // }))


            // const filesWithId = files.map((item)=>{return [...item, item.index=2]})
            setFileLs(prev => [...prev, ...files])
            fileLsRefForTransfer.current = [...fileLsRefForTransfer.current ? fileLsRefForTransfer.current : [], ...files]

            
            console.log(fileLs, 'dada?')
            

            // console.log(filesWithId,'xx?')
            // just_files_names.current = [...just_files_names.current, ...files.map((item)=>{console.log(item.name); return item.name})]
            just_files_names.current = [...just_files_names.current, ...files.map((item)=>{console.log(item.file.name); return {'filename': item.file.name,'filesize': formatFileSize(item.file.size), 'real_filesize': item.file.size, 'file_id': item.file_id}})]
            // just_files_names.current =files.map((item)=>{console.log(item.name); return {'filename': item.name, 'filesize': item.size}})

            if(ws_ref.current){
                console.log('updating payload')
                ws_ref.current.send(JSON.stringify({
                    'users_payload':just_files_names.current
                }))
            }

            // console.log('Wybrane pliki:', just_files_names.current)

            // setHandles(prev => [...prev, ...newHandles])
        } catch (e) {
            console.log('User anulował wybór pliku',e)
        }
    }


    const drop_file_from_pool = (file_no: number, filename: string, filesize: number, file_id: string) => {

        console.log('droping -> ',file_id)

        console.log(just_files_names.current)

        just_files_names.current = just_files_names.current.filter((item)=>item.file_id != file_id)
        setFileLs(prev => prev.filter((item)=>item.file_id != file_id))
        // console.log(just_files_names.current)

        // just_files_names.current = just_files_names.current.filter((item)=>{return item.file_id!=file_id})

        // console.log(just_files_names.current)

        // // just_files_names.current = just_files_names.current.filter(
        // //     (item, index) => index !== file_no && item.filename != filename && item.real_filesize != filesize
        // // )

        if(ws_ref.current){
            console.log('updating payload')
            ws_ref.current.send(JSON.stringify({
                'users_payload': just_files_names.current.length == 0 ? ['_'] : just_files_names.current
            }))
        }

        // setFileLs((prev)=>{
        //     if(!prev) return []
        //     prev.
        // })

        // console.log(just_files_names.current)

    
        // setFileLs(just_files_names.current)
        // console.log(just_files_names.current)
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


 

return (
        <div className={styles.page}>
            {roomData && roomData.room_found && (
                <>
                    {roomData && !roomData.ALLOW_USER && roomData.room_found ? (
                        <RoomProtectedPrompt onSubmit={handleRoomLogin} />
                    ) : null}

                    <div className={styles.topBar}>
                        <div className={styles.connBadge}>
                            <span className={styles.connDot} />
                            {conns_counter ?? 0} connected
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.btnPrimary} onClick={pickFile}>Share a file</button>
                            <button className={styles.btnHome} onClick={() => {window.open(default_app_url, '_self')}}>Go home</button>
                            {/* <button className={styles.btnDanger} onClick={eraseFirstFileFromDisk}>Delete First</button> */}
                        </div>
                    </div>

                    <div className={styles.userList}>
                        {users_ws_conn_info && [...users_ws_conn_info].sort((a, b) => (a.temp_identity == MyTempId ? -1 : b.temp_identity == MyTempId ? 1 : 0)).map((user, uIndex) => {
                            const isMe = user.temp_identity == MyTempId
                            const hasFiles = user.payload && user.payload.some(p => typeof p === 'object' && p.filename)
                            return (
                                <div key={user.user_id + uIndex} className={`${styles.userCard} ${isMe ? styles.userCardMe : ''}`}>
                                    <div className={styles.userHeader}>
                                        <div>
                                            <span className={styles.username}>{user.username}</span>
                                            {isMe && <span className={styles.meTag}>You</span>}
                                        </div>
                                        {hasFiles && (
                                            <button
                                                onClick={() => setExpandedUsers(prev => ({ ...prev, [user.user_id]: !prev[user.user_id] }))}
                                                className={styles.toggleBtn}
                                            >
                                                {expandedUsers[user.user_id] === false ? '▶ Show' : '▼ Hide'}
                                            </button>
                                        )}
                                    </div>

                                    {expandedUsers[user.user_id] !== false && hasFiles ? (
                                        <div className={styles.fileTable}>
                                            <div className={styles.fileHeader}>
                                                <div>Filename</div>
                                                <div className={styles.colSize}>Size</div>
                                                <div className={styles.colAction}>
                                                    Action
                                                    {!isMe && window.innerWidth > 900 && <input
                                                        type='checkbox'
                                                        checked={(() => {
                                                            const allFileIds = user.payload.filter(p => typeof p === 'object' && p.file_id).map(p => p.file_id)
                                                            const userSelected = selectedFiles[user.user_id]
                                                            return allFileIds.length > 0 && !!userSelected && allFileIds.every(id => userSelected.has(id))
                                                        })()}
                                                        onChange={() => {
                                                            setSelectedFiles(prev => {
                                                                const allFileIds = user.payload.filter(p => typeof p === 'object' && p.file_id).map(p => p.file_id)
                                                                const userSet = new Set(prev[user.user_id] ?? [])
                                                                const allSelected = allFileIds.every(id => userSet.has(id))
                                                                if (allSelected) {
                                                                    return { ...prev, [user.user_id]: new Set<string>() }
                                                                } else {
                                                                    return { ...prev, [user.user_id]: new Set(allFileIds) }
                                                                }
                                                            })
                                                        }}
                                                        className={styles.checkbox}
                                                    />}
                                                </div>
                                            </div>
                                            {user.payload.filter(p => typeof p === 'object' && p.filename).map((item, pIndex) => {
                                                const isSelected = selectedFiles[user.user_id]?.has(item.file_id) ?? false
                                                return (
                                                <div key={pIndex} className={styles.fileRow}>
                                                    <div className={styles.fileName}>{item.filename}</div>
                                                    <div className={styles.fileSize}>{item.filesize ?? item.filesize}</div>
                                                    <div className={styles.fileActions}>
                                                        {!isMe && window.innerWidth > 900 &&  <input
                                                            type='checkbox'
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                setSelectedFiles(prev => {
                                                                    const userSet = new Set(prev[user.user_id] ?? [])
                                                                    if (userSet.has(item.file_id)) userSet.delete(item.file_id)
                                                                    else userSet.add(item.file_id)
                                                                    return { ...prev, [user.user_id]: userSet }
                                                                })
                                                            }}
                                                            className={styles.checkbox}
                                                        />}
                                                        {!isMe ? (
                                                            <button
                                                                className={styles.btnDown}
                                                                onClick={() => {
                                                                    DownloadSingleFile({
                                                                        ws_ref, filename: item.filename, file_id: item.file_id,
                                                                        host_username: user.username, file_owner_id: user.user_id,
                                                                        filesize: item.real_filesize, set_transfer_log_data,
                                                                        transfer_log_data_ref, set_ongoing_transfer_count
                                                                    })
                                                                }}
                                                            >
                                                                Download
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={styles.btnDrop}
                                                                onClick={() => drop_file_from_pool(pIndex, item.filename, item.real_filesize, item.file_id)}
                                                            >
                                                                Drop
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                )
                                            })}
                                            {!isMe && (selectedFiles[user.user_id]?.size ?? 0) > 0 && (
                                                <div className={styles.downloadSelectedRow}>
                                                    <button
                                                        className={styles.btnDownloadSelected}
                                                        onClick={() => {
                                                            const selected = Array.from(selectedFiles[user.user_id] ?? [])
                                                            const files = user.payload
                                                                .filter(p => typeof p === 'object' && selected.includes(p.file_id))
                                                                .map(p => ({ file_id: p.file_id, filename: p.filename, filesize: p.real_filesize }))
                                                            DownloadMultipleFiles({
                                                                ws_ref,
                                                                host_username: user.username,
                                                                file_owner_id: user.user_id,
                                                                set_transfer_log_data,
                                                                transfer_log_data_ref,
                                                                set_ongoing_transfer_count,
                                                                files
                                                            })
                                                        }}
                                                    >
                                                        Download selected ({selectedFiles[user.user_id]?.size ?? 0})
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : !hasFiles ? (
                                        <div className={styles.noFiles}>No files shared</div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>

                    <Transfer_log transfer_log_data={transfer_log_data} ongoing_transfer_count={ongoing_transfer_count} set_ongoing_transfer_count={set_ongoing_transfer_count} />
                </>
            )}
        </div>
    )
}

export default View
export { does_room_exists }
