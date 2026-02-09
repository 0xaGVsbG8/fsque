import { base_ws } from "@/app/app_conf"
import { cookie_finder } from "@/app/modules/cookie_manager"

export type launch_props = {
    set_conns_counter: React.Dispatch<React.SetStateAction<number | null>>
    set_connected_usernames: React.Dispatch<React.SetStateAction<string[] | null>> 
}

let connected: boolean = false


const launch = ({set_conns_counter, set_connected_usernames}:launch_props) => {
    const USER_ACCESS_TOKEN = cookie_finder('USER_ACCESS_TOKEN')
    const ROOM_ID = cookie_finder('ROOM_ID')

    if(connected) return

    if(!ROOM_ID) return

    const ws = new WebSocket(base_ws + '/xd' + `?ROOM_ID=${ROOM_ID}&USER_ACCESS_TOKEN=${USER_ACCESS_TOKEN}`)

    connected = true
    // const ws = new WebSocket(base_ws + '/xd')
    if(!ws) return 
    ws.onopen = () => {
        console.log('xd')
        const username = cookie_finder('username')
        if(username){
            ws.send(JSON.stringify({'username':username}))
        }
    }

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if(data){
            console.log('xd',data)
            if(data.connected_users){
                set_conns_counter(data.connected_users)
            }
            if(data.username_ls){
                set_connected_usernames(data.username_ls)
            }
        }

    }

}


export default launch