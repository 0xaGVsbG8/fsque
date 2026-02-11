import { base_ws } from "@/app/app_conf"
import { cookie_finder } from "@/app/modules/cookie_manager"
import { user_ws_conn_info } from "@/app/types"
import { connect } from "http2"

export type launch_props = {
    ws_ref: React.MutableRefObject<WebSocket | null>
    set_conns_counter: React.Dispatch<React.SetStateAction<number | null>>
    set_users_ws_conn_info: React.Dispatch<React.SetStateAction<user_ws_conn_info[] | null>> 
    fileLs: File[]
}

let connected: boolean = false
let opened_single_file_transfer = false

const launch = ({ws_ref, set_conns_counter, set_users_ws_conn_info,fileLs}:launch_props) => {

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



            
            if (data.incoming_transfer && data.TRANSFER_ACCESS_TOKEN && data.role == 'HOST') {

                const target_file = fileLs.filter((item)=>item.name==data.target)
                console.log(target_file, 'd?')

                const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                console.log("Transfer accepted (HOST):", TRANSFER_ACCESS_TOKEN)

                if(opened_single_file_transfer) return
                opened_single_file_transfer = true

                const transfer_ws = new WebSocket(base_ws + '/make-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)

                //HOST SIDE

                transfer_ws.onopen = () => {
                    // transfer_ws.send(JSON.stringify({'transfer_ready':true, 'role': data.role}))
                }


                transfer_ws.onmessage = (msg) => {
                    try{
                        const here_data = JSON.parse(msg.data)
                        if(here_data.begin_upload){
                            console.log('beggining upload')
                            
                            console.log('sending chunks')
                            const blob = new Blob(
                                ["Siema kierownikxu 🔥"],
                                { type: "text/plain" }
                            )
                            transfer_ws.send(target_file[0])
                    
    
                        }
                    }catch(err){}
         
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