import { base_ws } from "@/app/app_conf"
import { cookie_finder } from "@/app/modules/cookie_manager"
import { user_ws_conn_info } from "@/app/types"

export type launch_props = {
    ws_ref: React.MutableRefObject<WebSocket | null>
    set_conns_counter: React.Dispatch<React.SetStateAction<number | null>>
    set_users_ws_conn_info: React.Dispatch<React.SetStateAction<user_ws_conn_info[] | null>> 
}

let connected: boolean = false


const launch = ({ws_ref, set_conns_counter, set_users_ws_conn_info}:launch_props) => {

    const USER_ACCESS_TOKEN = cookie_finder('USER_ACCESS_TOKEN')
    const ROOM_ID = cookie_finder('ROOM_ID')

    if(connected) return

    if(!ROOM_ID) return

    ws_ref.current = new WebSocket(base_ws + '/xd' + `?ROOM_ID=${ROOM_ID}&USER_ACCESS_TOKEN=${USER_ACCESS_TOKEN}`)

    const ws = ws_ref.current


    connected = true
    // const ws = new WebSocket(base_ws + '/xd')
    if(!ws) return 
    ws.onopen = () => {
        console.log('xd')
        // const username = cookie_finder('username')
        // if(username){
        //     ws.send(JSON.stringify({'username':username}))
        // }
    }

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if(data){
            console.log('xd',data)
            if(data.connected_users){
                set_conns_counter(data.connected_users)
            }
            if(data.users_ws_conn_info){
                set_users_ws_conn_info(data.users_ws_conn_info as user_ws_conn_info[])
            }
        }

    }

}


export default launch