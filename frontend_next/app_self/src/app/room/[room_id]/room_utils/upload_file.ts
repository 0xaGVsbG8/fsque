import { CHUNK_SIZE } from "@/app/app_conf"
import { base_ws, wait_for_client_response_while_uploading } from "@/app/app_conf copy"
import { transfer_log_data_props, user_ws_conn_info } from "@/app/types"

let opened_single_file_transfer: boolean = false

export type ModifiedFile = {
    file_id: string
    file: File
}

export type transfer_log_data_utils = {
    set_transfer_log_data: React.Dispatch<React.SetStateAction<transfer_log_data_props[]|null>>
    transfer_log_data_ref: React.MutableRefObject<transfer_log_data_props[]|null>
}




export type sendFileInChunks_props = transfer_log_data_utils & {
    file_id: string
    file: File,
    ws: WebSocket
    TRANSFER_ACCESS_TOKEN: string
}


export type UploadSingleFileProps = transfer_log_data_utils & {
    fileLsRefForTransfer: React.MutableRefObject<ModifiedFile[]|null>
    target_id: string
    TRANSFER_ACCESS_TOKEN: string
}





type update_perc_value = transfer_log_data_utils & {
    transaction_id: string
    perc?: string | number
    extra_msg?: string
    confirm_hide: boolean,
    button_text?:  'Cancel' | 'Clear'

}
export const update_perc_value = ({
    transfer_log_data_ref,
    set_transfer_log_data,
    transaction_id,
    perc,
    extra_msg,
    confirm_hide,
    button_text
}:update_perc_value) => {

    const hide_me = () => {
        transfer_log_data_ref.current = transfer_log_data_ref.current!.filter((item)=>item.transaction_id!=transaction_id)
        set_transfer_log_data(transfer_log_data_ref.current)
    }

    transfer_log_data_ref.current = transfer_log_data_ref.current!.map(item =>
        item.transaction_id == transaction_id
            ? { ...item, 'perc': perc ?? item.perc, button_text, extra_msg, cancel_behaviour: ()=> {confirm_hide ? hide_me() :( item?.cancel_behaviour ?   item?.cancel_behaviour():  null)}}
            : item
    )
    set_transfer_log_data(transfer_log_data_ref.current)
}



export function waitForAck(ws: WebSocket): Promise<void> {
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






export async function sendFileInChunks({file, ws, transfer_log_data_ref, set_transfer_log_data, TRANSFER_ACCESS_TOKEN}: sendFileInChunks_props) {
    let offset = 0
    let percent = 0
    while (offset < file.size) {

        const slice = file.slice(offset, offset + CHUNK_SIZE)
        const buffer = await slice.arrayBuffer()

        // console.log('sending chunk')




        ws.send(buffer)
        wait_for_client_response_while_uploading && await waitForAck(ws)

        offset += CHUNK_SIZE

        percent = Math.min(
            Number(((offset / file.size) * 100).toFixed(2)),
            100
        )


        update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, perc:percent, confirm_hide: false})



    }
}




const UploadSingleFile = ({fileLsRefForTransfer, target_id, TRANSFER_ACCESS_TOKEN, set_transfer_log_data, transfer_log_data_ref}:UploadSingleFileProps) => {

    console.log('upload file??')

    if(!fileLsRefForTransfer.current) return
    const target_file = fileLsRefForTransfer.current.filter((item)=>item.file_id==target_id)

    
    if(opened_single_file_transfer) return
    opened_single_file_transfer = true

    setTimeout(() => {
        opened_single_file_transfer = false
    }, 10);

    const upload_ws = new WebSocket(base_ws + '/make-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)
    upload_ws.onopen = () => {
        console.log('upload transfer opened')
        // set_ongoing_transfer_count((prev)=>{return prev+1})
        // transfer_ws.send(JSON.stringify({'transfer_ready':true, 'role': data.role}))
    }

    const cancel_behaviour_func = () => {
        // const hide_me = () => {
        //     transfer_log_data_ref.current = transfer_log_data_ref.current!.filter((item)=>item.transaction_id!=TRANSFER_ACCESS_TOKEN)
        //     set_transfer_log_data(transfer_log_data_ref.current)
        // }

        // console.log('Canceling upload')
        // transfer_log_data_ref.current = transfer_log_data_ref.current!.map(item =>
        //     item.transaction_id == TRANSFER_ACCESS_TOKEN
        //         ? { ...item, extra_msg: ' (Canceled by me)', cancel_behaviour: ()=>hide_me(), button_text: 'Clear'}
        //         : item
        // )
        // u
        // set_transfer_log_data(transfer_log_data_ref.current)
        update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN,extra_msg: ' (Canceled by me)', confirm_hide: true, button_text: 'Clear'})

        upload_ws.close()
    }

    upload_ws.onmessage = async(msg) => {

        try{
            
            const data = JSON.parse(msg.data)
            console.log(data)


            if(data.transfer_canceled_by){
                console.log('client canceled downlod!')
                update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Canceled by client)', confirm_hide: true, button_text: 'Clear'})

                upload_ws.close()
            }


            if(data.begin_upload){
                console.log('asked to begin upload, sending chunks...')

                const new_record: transfer_log_data_props = {
                    'user_id': '2',
                    'file_id':target_file[0].file_id,
                    'username': data.client_username,
                    'filename': target_file[0].file.name,
                    'transfer_type': 'upload',
                    'perc': '0.00',
                    editable: true,
                    cancel_behaviour: ()=> {cancel_behaviour_func()},
                    transaction_id:  TRANSFER_ACCESS_TOKEN
                    // cancel_behaviour: ()=>{cancel_behaviour_func()}
                }
                transfer_log_data_ref.current = [...transfer_log_data_ref.current ?? [], new_record ]


                set_transfer_log_data(transfer_log_data_ref.current)


                await sendFileInChunks({
                    file: target_file[0].file,
                    file_id: target_file[0].file_id,
                    ws: upload_ws,
                    set_transfer_log_data: set_transfer_log_data,
                    transfer_log_data_ref: transfer_log_data_ref,
                    TRANSFER_ACCESS_TOKEN
                })

                console.log('Upload done')

                upload_ws.send(JSON.stringify({'transfer_complete':true}))
                upload_ws.close()
            }

        }catch(err){
            console.log(err, '??')
        }
    }

}


export default UploadSingleFile