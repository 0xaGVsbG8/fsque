import { base_ws } from "../../../app_conf"
import { cookie_finder } from "../../../modules/cookie_manager"
import { transfer_log_data_props, user_ws_conn_info } from "../../../types"
import { connect } from "http2"
import { ModifiedFile } from "../../[room_id]/page"


export type sendFileInChunks_props = transfer_log_data_utils & {
    file_id: string
    file: File,
    ws: WebSocket
}

export type transfer_log_data_utils = {
    set_transfer_log_data: React.Dispatch<React.SetStateAction<transfer_log_data_props[]|null>>
    transfer_log_data_ref: React.MutableRefObject<transfer_log_data_props[]|null>
}

export type launch_props =  transfer_log_data_utils & {
    ws_ref: React.MutableRefObject<WebSocket | null>
    set_conns_counter: React.Dispatch<React.SetStateAction<number | null>>
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
    set_users_ws_conn_info: React.Dispatch<React.SetStateAction<user_ws_conn_info[] | null>> 
    setMyTempId: React.Dispatch<React.SetStateAction<string>>
    fileLsRefForTransfer: React.MutableRefObject<ModifiedFile[]|null>
    
}



let connected: boolean = false
let opened_single_file_transfer = false
const reload_on_conn_fail: boolean = true


export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

// const CHUNK_SIZE = 64 * 1024 // 64KB chunks
// const CHUNK_SIZE = 5120 * 1024 // 64KB chunks #5MBs
const CHUNK_SIZE = 10 * 1024  * 1024 // 64KB chunks #5MBs


function waitForAck(ws: WebSocket): Promise<void> {
    return new Promise((resolve) => {

        const handler = (event: MessageEvent) => {
            // console.log(event, 'handler?')
            if (typeof event.data === "string") {
                const data = JSON.parse(event.data)

                if (data.chunk_received) {
                    // console.log('client received a chunk')
                    ws.removeEventListener("message", handler)
                    resolve()
                }
            }
        }

        ws.addEventListener("message", handler)
    })
}



async function sendFileInChunks({file, ws, transfer_log_data_ref, file_id}: sendFileInChunks_props) {
    let offset = 0
    let percent = 0
    while (offset < file.size) {

        const slice = file.slice(offset, offset + CHUNK_SIZE)
        const buffer = await slice.arrayBuffer()

        // console.log('sending chunk')




        ws.send(buffer)
        await waitForAck(ws)

        offset += CHUNK_SIZE
        percent = Math.min(Math.round((offset / file.size) * 100), 100)
        console.log('upload progress:', percent)

        console.log("before map", transfer_log_data_ref.current)

        // transfer_log_data_ref.current = transfer_log_data_ref.current!.map(item =>
        //     item.file_id === file_id
        //         ? { ...item, 'perc': percent }
        //         : item
        // )

        console.log(transfer_log_data_ref.current, 'yoyo')
    }
    // Send an empty message to signal end of file
    // ws.send(JSON.stringify({ transfer_complete: true }))
}

const launch = ({ws_ref, set_conns_counter, set_ongoing_transfer_count, set_users_ws_conn_info,setMyTempId, fileLsRefForTransfer, set_transfer_log_data, transfer_log_data_ref}:launch_props) => {

    const USER_ACCESS_TOKEN = cookie_finder('USER_ACCESS_TOKEN')
    const ROOM_ID = cookie_finder('ROOM_ID')

    if(connected) return

    if(!ROOM_ID) return

    ws_ref.current = new WebSocket(base_ws + '/xd' + `?ROOM_ID=${ROOM_ID}&USER_ACCESS_TOKEN=${USER_ACCESS_TOKEN}`)

    const ws = ws_ref.current


    connected = true

    setTimeout(() => {
        connected = false
    }, 150);

    // const ws = new WebSocket(base_ws + '/xd')
    if(!ws) return 
    ws.onopen = () => {
        console.log('connection established')
        // set_ongoing_transfer_count((prev)=>{return prev+1})
        // const username = cookie_finder('username')
        // if(username){
        //     ws.send(JSON.stringify({'username':username}))
        // }
    }

    ws.onclose = () => {
        console.log('Parent ws conn lost or is irresponding!')
        // document.write('Parent ws conn lost or is irresponding!')
        reload_on_conn_fail &&  setTimeout(() => {
            window.location.reload()
        }, 3000);
    }

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        // console.log(data)
        if(data){
            if(data.connected_users){
                set_conns_counter(data.connected_users)
            }
            if(data.users_ws_conn_info){
                console.log(data.users_ws_conn_info, '????')
                set_users_ws_conn_info(data.users_ws_conn_info as user_ws_conn_info[])
            }
            if(data.temp_user_id){
                setMyTempId(data.temp_user_id)
                // temp_muser_id
            }



            
            if (data.incoming_transfer && data.TRANSFER_ACCESS_TOKEN && data.role == 'HOST') {

                if(!fileLsRefForTransfer.current) return

                const target_file = fileLsRefForTransfer.current.filter((item)=>item.file_id==data.target)
                // console.log(target_file, 'd?')

                // console.log(target_file, '???')

                const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                console.log("Transfer accepted (HOST):", TRANSFER_ACCESS_TOKEN)

                if(opened_single_file_transfer) return
                opened_single_file_transfer = true

                setTimeout(() => {
                    opened_single_file_transfer = false
                }, 10);

                const transfer_ws = new WebSocket(base_ws + '/make-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)

                //HOST SIDE

                transfer_ws.onopen = () => {
                    set_ongoing_transfer_count((prev)=>{return prev+1})
                    // transfer_ws.send(JSON.stringify({'transfer_ready':true, 'role': data.role}))
                }

                transfer_ws.onmessage = async(msg) => {
                    // console.log(msg)
                    try{
                        // console.log(target_file)
                        const here_data = JSON.parse(msg.data)
                        if(here_data.begin_upload){
                            console.log('beggining upload, sending chunks...')

                            // const new_record:transfer_log_data_props = {
                            //     'user_id': '2',
                            //     'file_id':file_id,
                            //     'username': username,
                            //     'filename': filename,
                            //     'transfer_type': 'Downloading',
                            //     'perc': '0.00',
                            // }
    
    

                            await sendFileInChunks({
                                file: target_file[0].file,
                                file_id: target_file[0].file_id,
                                ws: transfer_ws,
                                set_transfer_log_data: set_transfer_log_data,
                                transfer_log_data_ref: transfer_log_data_ref
                            })
                            // await sendFileInChunks({file: target_file[0].file, ws: transfer_ws})

                            transfer_ws.send(JSON.stringify({'transfer_complete':true}))
                            console.log('transfer complete')
                            transfer_ws.close()
                            set_ongoing_transfer_count((prev)=>{return prev-1})
                        }
                    }catch(err){
                        console.log(err,)
                    }
         
                    // console.log(data)
                }

                
                transfer_ws.onclose = () => {
                    console.log('conn lose')
                }

                // if(ws_ref.current) ws_ref.current.removeEventListener("message", handle_transfer)

            }


        }

    }


    

}


export default launch