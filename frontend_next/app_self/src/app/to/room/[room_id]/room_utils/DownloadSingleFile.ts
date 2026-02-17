import { base_ws, wait_for_client_response_while_uploading } from "../../../app_conf"
import get_username from "../../../modules/get_username"
import { transfer_log_data_props } from "../../../types"
import { update_perc_value } from "./chunkManager"

export type transfer_log_data_utils = {
    set_transfer_log_data: React.Dispatch<React.SetStateAction<transfer_log_data_props[]|null>>
    transfer_log_data_ref: React.MutableRefObject<transfer_log_data_props[]|null>
}

export type DownloadSingleFileProps = transfer_log_data_utils & {
    ws_ref: React.MutableRefObject<WebSocket | null>
    filename: string
    file_id: string
    host_username: string
    file_owner_id: string
    filesize: number
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}

type incoming_transfer_props = {
    'incoming_transfer': string
    'role': string,
    'TRANSFER_ACCESS_TOKEN': string,
    'target': string //file id
}





type launch_client_transfer_props = transfer_log_data_utils &{
    TRANSFER_ACCESS_TOKEN: string
    writable: FileSystemWritableFileStream
    filename: string
    file_owner: string
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}


const launch_client_download = async({
    TRANSFER_ACCESS_TOKEN,
    writable,
    filename,
    file_owner,
    set_transfer_log_data,
    transfer_log_data_ref,
    set_ongoing_transfer_count
}:launch_client_transfer_props) => {

    const transfer_ws = new WebSocket(base_ws + '/single-file-transfer/' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)

    const preventClose = (e: BeforeUnloadEvent) => { e.preventDefault() }

    const handleClose = (extra_msg: string) => {
        window.removeEventListener('beforeunload', preventClose)
        update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg, confirm_hide: true, button_text: 'Clear'})
        set_ongoing_transfer_count(prev => prev - 1)
        transfer_ws.close()
    }

    transfer_ws.onopen = () => {

        console.log('transfer opened!')
        window.addEventListener('beforeunload', preventClose)
        const joinEffect = new Audio('/fsque/assets/join.mp3')
        joinEffect.play()
        set_ongoing_transfer_count(prev => prev + 1)
        transfer_ws.send(JSON.stringify({'ready_for_transfer':true, 'role': 'client'}))

        const new_record: transfer_log_data_props = {
            'user_id': '2',
            'file_id':'',
            'username': file_owner,
            'filename': filename,
            'transfer_type': 'download',
            'perc': '0.00',
            editable: true,
            // cancel_behaviour: ()=> {cancel_behaviour_func()},
            transaction_id:  TRANSFER_ACCESS_TOKEN,
            cancel_behaviour: ()=>{handleClose('(Canceled by me)')}
        }
        transfer_log_data_ref.current = [...transfer_log_data_ref.current ?? [], new_record ]
        set_transfer_log_data(transfer_log_data_ref.current)

    }




    transfer_ws.onclose = () => {
        console.log('transfer download closed')
    }

    transfer_ws.onerror = (e) => {
        console.log("TRANSFER ERROR", e)
    }

    transfer_ws.onmessage = async(message) => {
        // console.log(message)
        if (message.data instanceof Blob) {
            // console.log("chunk received")
            await writable.write(message.data)
            wait_for_client_response_while_uploading &&  transfer_ws.send(JSON.stringify({'received_chunk':true})) 
        } 
        else{
            const data = JSON.parse(message.data)
            console.log(data)

            if(data.transfer_complete){
                console.log('Download complete!')
                window.removeEventListener('beforeunload', preventClose)
                const joinEffect = new Audio('/fsque/assets/done.mp3')
                joinEffect.play()
                writable.close()
                transfer_ws.close()
                update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Done)', confirm_hide: true, button_text: 'Clear'})
                set_ongoing_transfer_count(prev => prev - 1)
            }

            if(data.upload_progress){
                update_perc_value({set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, perc:data.upload_progress, confirm_hide: false})
                console.log('received chunk')
            }

            if(data.transfer_canceled_by == 'host'){
                console.log('Host canceled upload!')
                handleClose('(Canceled by HOST)')


            }

        }


    }

}

  

const DownloadSingleFile = async ({ws_ref, filename, file_id, host_username, file_owner_id, filesize, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count}:  DownloadSingleFileProps) => {

    if (!('showSaveFilePicker' in window) || !ws_ref.current) return
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


        const listenForRoomData = (msg: MessageEvent) => {
            const data = JSON.parse(msg.data) as incoming_transfer_props
            // console.log(data)
            if(data.incoming_transfer){
                const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
                const TARGET = data.target
                console.log('Transfer accepted!')
                ws_ref.current!.removeEventListener('message', listenForRoomData)
                launch_client_download({TRANSFER_ACCESS_TOKEN, writable, filename, file_owner: host_username, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count})
                
            }
        }


        ws_ref.current.addEventListener('message', listenForRoomData)



        ws_ref.current.send(JSON.stringify({'user_single_file_transfer_request' : {
            'client_username': get_username(),
            'host_username': host_username,
            'file_id': file_id,
            'file_owner_id': file_owner_id,
            'filesize': filesize
        }}))



    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.log('User cancelled file picker')
        } else if (err?.name === 'NotAllowedError') {
            console.warn('Permission denied — you must click "Allow" when the browser asks to save files.')
            alert('Permission denied. Please click "Allow" when the browser asks to save/edit files on your device.')
        } else {
            console.error('Download failed:', err)
        }
    }
    
}

export default DownloadSingleFile
