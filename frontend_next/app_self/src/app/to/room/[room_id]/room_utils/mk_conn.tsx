import { base_ws } from "../../../app_conf"
import { cookie_finder } from "../../../modules/cookie_manager"
import { transfer_log_data_props, transfer_log_data_utils, user_ws_conn_info } from "../../../types"
import { connect } from "http2"
import { ModifiedFile } from "../page"
import { wait_for_client_response_while_uploading } from "../../../app_conf"
import UploadSingleFile from "./upload_single_file"
import UploadMultipleFiles from "./upload_multiple_files"

export type sendFileInChunks_props = transfer_log_data_utils & {
    file_id: string
    file: File,
    ws: WebSocket
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










const launch_room_ws = ({ws_ref, set_conns_counter, set_ongoing_transfer_count, set_users_ws_conn_info,setMyTempId, fileLsRefForTransfer, set_transfer_log_data, transfer_log_data_ref}:launch_props) => {

    const USER_ACCESS_TOKEN = cookie_finder('USER_ACCESS_TOKEN')
    const ROOM_ID = cookie_finder('ROOM_ID')


    if(connected) return

    if(!ROOM_ID) return

    const url = base_ws + '/room-control/' + `?ROOM_ID=${ROOM_ID}&USER_ACCESS_TOKEN=${USER_ACCESS_TOKEN}`

    ws_ref.current = new WebSocket(url)

    const ws = ws_ref.current


    connected = true

    setTimeout(() => {
        connected = false
    }, 150);

    if(!ws) return 
    ws.onopen = () => {
        console.log('connection established with', url)

    }

    ws.onclose = () => {
        console.log('Parent ws conn lost or is irresponding!')
        reload_on_conn_fail &&  setTimeout(() => {
            window.location.reload()
        }, 3000);
    }

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        console.log(data)
        if(data){
            if(data.connected_users){
                set_conns_counter((prev)=>{

                    if(prev && data.connected_users>prev){
                        console.log('New user joined')
                        const joinEffect = new Audio('/fsque/assets/user_joins.mp3')
                        joinEffect.play()
                    }

                    return data.connected_users
                })
                set_conns_counter(data.connected_users)
            }
            if(data.users_ws_conn_info){
                set_users_ws_conn_info(data.users_ws_conn_info as user_ws_conn_info[])
            }
            if(data.temp_user_id){
                setMyTempId(data.temp_user_id)
            }



            
            if (data.incoming_transfer && data.TRANSFER_ACCESS_TOKEN && data.role == 'HOST') {

                console.log(fileLsRefForTransfer.current)

                if(!fileLsRefForTransfer.current) return
                console.log('yoyo')

                const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                data.upload_type == 'single' && UploadSingleFile({fileLsRefForTransfer: fileLsRefForTransfer, target_id: data.target, TRANSFER_ACCESS_TOKEN: TRANSFER_ACCESS_TOKEN, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count})
                data.upload_type == 'multiple' && UploadMultipleFiles({fileLsRefForTransfer: fileLsRefForTransfer, target_ids: data.targets, TRANSFER_ACCESS_TOKEN: TRANSFER_ACCESS_TOKEN, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count})
                }



        }

    }


    

}


export default launch_room_ws