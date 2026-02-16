'use client'

import { useEffect, useState, useRef } from 'react'
import { base_fetch, base_ws, wait_for_client_response_while_uploading } from '../../app_conf'
import { useParams } from 'next/navigation'
import RoomProtectedPrompt from '../comps/room_protected_prompt'
import launch, { formatFileSize } from '../comps/app_modules/mk_conn'
import { cookie_finder,set_cookie } from '../../modules/cookie_manager'
import { IncomingTransferData, payload_props, transfer_downloading, transfer_log_data_props, user_ws_conn_info } from '../../types'
import { v4 as uuidv4 } from 'uuid'
import Transfer_log from '../comps/transfer_log/transfer_log'
import get_username from '../../modules/get_username'

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


    
    const DownloadSingleFile = async (filename: string, username: string, user_id:string, file_id: string, filesize: number, down_button: HTMLButtonElement) => {
        if (!('showSaveFilePicker' in window)) return
        if(!ws_ref.current) return
    
        try {
            const fileHandle =  await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [
                    {
                        description: "Text file",
                        excludeAcceptAllOption: false,
                        // accept: { "*/*": [".*"] }
                        // accept: { "text/plain": [".txt"] }
                    }
                ]
            })

            const writable = await fileHandle.createWritable()
            console.log('downloading file --> ', file_id)
            // return


            const handle_transfer = async(event: MessageEvent) => {
                const data = JSON.parse(event.data) as IncomingTransferData

                // console.log(data, 'pciker')

                if (data.incoming_transfer && data.TRANSFER_ACCESS_TOKEN) {
                    console.log(data, '???')
                    ws_ref.current?.removeEventListener("message", handle_transfer)

                    const target_id =  data.target

                    if(opened_single_file_transfer) return
                    opened_single_file_transfer = true

                    const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                    console.log("Transfer accepted:", TRANSFER_ACCESS_TOKEN)

                    const local_ws = new WebSocket(base_ws + '/make-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)
                    // ws.binaryType = "arraybuffer"
                    
                    setTimeout(() => {
                        opened_single_file_transfer = false
                    }, 10);


                    const cancel_func = (ws: WebSocket) => {
                        console.log('canceling download', target_id)
                        ws.send(JSON.stringify({'transfer_canceled_by': 'client'}))
                        ws.close()
                        transfer_log_data_ref.current = transfer_log_data_ref.current!.filter(item =>
                            item.file_id !== data.target
                        )
                        set_transfer_log_data(transfer_log_data_ref.current)
                    }


                    local_ws.onopen = async() => {
                        console.log('transfer opened for ', file_id)
                        set_ongoing_transfer_count((prev=>{return prev+1}))

                        down_button.disabled = true

                        const new_record:transfer_log_data_props = {
                            'user_id': user_id,
                            'file_id':file_id,
                            'username': username,
                            'filename': filename,
                            'transfer_type': 'download',
                            'perc': '0.00',
                            'editable': true,
                            cancel_behaviour: () => {cancel_func(local_ws)}
                        }



                        transfer_log_data_ref.current = [...transfer_log_data_ref.current ?? [], new_record ]
                        local_ws.send(JSON.stringify({'ready_for_transfer':true, 'role': data.role}))
                    }

                    local_ws.onmessage = async(message) => {
                        // console.log(message)
                        if (message.data instanceof Blob) {
                            console.log("chunk received")
                            await writable.write(message.data)
                            wait_for_client_response_while_uploading &&  local_ws.send(JSON.stringify({'received_chunk':true})) 
                        } 
                        else{
                            try{
                                const data = JSON.parse(message.data)
                                console.log(data, 'yoyo')
                                if(data.transfer_complete){
                                    console.log('transfer complete (CLIENT)')
                                    setTimeout(async() => {
                                        
                                        down_button.disabled = false
                                        transfer_log_data_ref.current = transfer_log_data_ref.current!.map(item =>
                                            item.file_id === data.for_file
                                                ? { ...item, 'perc': '100.00', editable: false }
                                                : item
                                        )
                                        set_transfer_log_data(transfer_log_data_ref.current)

                                        // console.log(transfer_log_data_ref.current)


                                        await writable.close()
                                        local_ws.close()
                                        set_ongoing_transfer_count((prev=>{return prev-1}))
                                        if(ws_ref.current) ws_ref.current.removeEventListener("message", handle_transfer)
                                    }, 100);
                                }
                                if(data.upload_progress){
                                     
                                    transfer_log_data_ref.current = transfer_log_data_ref.current!.map(item =>
                                        item.file_id === data.for_file && item.editable
                                            ? { ...item, 'perc': data.upload_progress }
                                            : item
                                    )

                                    console.log('received progress',transfer_log_data_ref.current)

                                    set_transfer_log_data(transfer_log_data_ref.current)
                                    // console.log(transfer_log_data_ref.current, 'targ')

                                    // const target_record = transfer_log_data?.filter((item)=>(file_id==item.file_id)) ?? []
                                    // set_transfer_log_data(prev => {
                                    //     const updated = prev!.map(item =>
                                    //         item.file_id === data.for_file
                                    //             ? { ...item, perc: data.upload_progress }
                                    //             : item
                                    //     )
                                    
                                        // console.log(updated, 'youo')
                                    // 
                                        // return updated
                                    // })

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

            ws_ref.current.send(JSON.stringify({'user_single_file_transfer_request': {'username': get_username(),'filename':filename,'file_owner_id':user_id, 'file_id': file_id, 'filesize': filesize}}))

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

return (
        <>
            {roomData && roomData.room_found && (

                <>

                    {roomData && !roomData.ALLOW_USER && roomData.room_found ? (
                        <RoomProtectedPrompt onSubmit={handleRoomLogin} />
                    ) : null}

                    <>Connected users: {conns_counter}</>
                    <> Ongoing transfers: {ongoing_transfer_count}</>
                            {/* {MyTempId} */}
                            

                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', color: '#333' }}>
                        {users_ws_conn_info && users_ws_conn_info.map((user, uIndex) => (
                            <div key={user.user_id + uIndex} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#000' }}>
                                        {user.username + (user.temp_identity == MyTempId ? ' (Me)' : '')}
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
                                                    {/* {item.filesize ? (item.filesize / 1024).toFixed(2) + ' KB' : '0 KB'} */}
                                                    {item.filesize ?? item.filesize}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px',justifyContent:'center', alignContent:'center'}}>
                                                        {/* <button style={{ padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                            <span style={{ fontWeight: 'bold' }}>Download</span>
                                                        </button> */}
                                                        {user.temp_identity != MyTempId && <input type='checkbox' value={item.filename}></input>}

                                                        {/* {user.user_id==} */}

                                                        {user.temp_identity != MyTempId ? 
                                                            (
                                                                <button onClick={(e)=>DownloadSingleFile(item.filename,  user.username, user.user_id, item.file_id, item.real_filesize, e.currentTarget)} style={{ padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                                    <span style={{ fontWeight: 'bold' }}>Down</span>
                                                                </button>
                                                            )
                                                            :
                                                            <button onClick={()=>drop_file_from_pool(pIndex, item.filename, item.real_filesize, item.file_id)}>
                                                                <span style={{ fontWeight: 'bold' }}>Drop</span>
                                                            </button>
                                                        }
                                                        

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
                    <Transfer_log transfer_log_data={transfer_log_data}></Transfer_log>

                </>

            )}

            
           
{/* 
            <div>
                {fileLs.map((file, index) => (
                    <div key={index}>{file.name}</div>
                ))}
            </div> */}
        </>
    )
}

export default View
export { does_room_exists }
