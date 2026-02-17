import { CHUNK_SIZE } from "../../../app_conf"
import { base_ws, wait_for_client_response_while_uploading } from "../../../app_conf"
import { transfer_log_data_props, user_ws_conn_info } from "../../../types"
import { sendFileInChunks, update_perc_value } from "./chunkManager"

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
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}











const UploadSingleFile = ({fileLsRefForTransfer, target_id, TRANSFER_ACCESS_TOKEN, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count}:UploadSingleFileProps) => {

    console.log('upload file??')

    if(!fileLsRefForTransfer.current) return
    const target_file = fileLsRefForTransfer.current.filter((item)=>item.file_id==target_id)

    
    if(opened_single_file_transfer) return
    opened_single_file_transfer = true

    setTimeout(() => {
        opened_single_file_transfer = false
    }, 10);

    const upload_ws = new WebSocket(base_ws + '/single-file-transfer/' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)

    const preventClose = (e: BeforeUnloadEvent) => { e.preventDefault() }

    upload_ws.onopen = () => {
        console.log('upload transfer opened')
        window.addEventListener('beforeunload', preventClose)
        set_ongoing_transfer_count(prev => prev + 1)
        const joinEffect = new Audio('/fsque/assets/join.mp3')
        joinEffect.play()
    }

    const cancel_behaviour_func = () => {
        window.removeEventListener('beforeunload', preventClose)
        update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN,extra_msg: ' (Canceled by me)', confirm_hide: true, button_text: 'Clear'})
        set_ongoing_transfer_count(prev => prev - 1)
        upload_ws.close()
    }

    upload_ws.onmessage = async(msg) => {

        try{
            
            const data = JSON.parse(msg.data)
            console.log(data)


            if(data.transfer_canceled_by){
                console.log('client canceled downlod!')
                window.removeEventListener('beforeunload', preventClose)
                update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Canceled by client)', confirm_hide: true, button_text: 'Clear'})
                set_ongoing_transfer_count(prev => prev - 1)
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
                window.removeEventListener('beforeunload', preventClose)

                const joinEffect = new Audio('/fsque/assets/done.mp3')
                joinEffect.play()

                update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, perc: '100.00', extra_msg: '(Done)', confirm_hide: true, button_text: 'Clear'})
                set_ongoing_transfer_count(prev => prev - 1)

                upload_ws.send(JSON.stringify({'transfer_complete':true}))
                upload_ws.close()
            }

        }catch(err){
            console.log(err, '??')
        }
    }

}


export default UploadSingleFile