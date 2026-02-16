import get_username from "../../../modules/get_username"
import { transfer_log_data_utils } from "./DownloadSingleFile"
import { base_ws, wait_for_client_response_while_uploading } from "../../../app_conf copy"
import { transfer_log_data_props } from "../../../types"
import { update_perc_value } from "./upload_file"

export type DownloadMultipleFilesEntry = {
    file_id: string
    filename: string
    filesize: number
}

export type DownloadMultipleFilesProps = transfer_log_data_utils & {
    ws_ref: React.MutableRefObject<WebSocket | null>
    host_username: string
    file_owner_id: string
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
    files: DownloadMultipleFilesEntry[]
}


type incoming_transfer_props = {
    'incoming_transfer': string
    'role': string,
    'TRANSFER_ACCESS_TOKEN': string,
    'targets': string[]
}


type launch_client_transfer_props = transfer_log_data_utils & {
    TRANSFER_ACCESS_TOKEN: string
    dirHandle: FileSystemDirectoryHandle
    files: DownloadMultipleFilesEntry[]
    file_owner: string
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}


const launch_client_download = async ({
    TRANSFER_ACCESS_TOKEN,
    dirHandle,
    files,
    file_owner,
    set_transfer_log_data,
    transfer_log_data_ref,
    set_ongoing_transfer_count
}: launch_client_transfer_props) => {

    const transfer_ws = new WebSocket(base_ws + '/multiple-files-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)

    let current_writable: FileSystemWritableFileStream | null = null
    let current_file_id: string = ''
    let record_created = false

    const handleClose = (extra_msg: string) => {
        update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg, confirm_hide: true, button_text: 'Clear' })
        set_ongoing_transfer_count(prev => prev - 1)
        transfer_ws.close()
    }

    transfer_ws.onopen = () => {
        console.log('multiple download transfer opened!')
        set_ongoing_transfer_count(prev => prev + 1)
        transfer_ws.send(JSON.stringify({ ready_for_transfer: true, role: 'client' }))
    }

    transfer_ws.onclose = () => {
        console.log('multiple download transfer closed')
    }

    transfer_ws.onerror = (e) => {
        console.log("MULTIPLE TRANSFER ERROR", e)
    }

    transfer_ws.onmessage = async (message) => {
        if (message.data instanceof Blob) {
            if (current_writable) {
                try{
                    await current_writable.write(message.data)
                }catch(err){
                    console.log('file already closed!')
                }

                wait_for_client_response_while_uploading && transfer_ws.send(JSON.stringify({ received_chunk: true }))
            }
        } else {
            const data = JSON.parse(message.data)
            console.log(data, 'multiple download msg')

            if (data.begin_file) {

                // if(current_writable){}
                current_file_id = data.begin_file
                const file_index: number = data.file_index
                const total_files: number = data.total_files
                const file_info = files.find(f => f.file_id === current_file_id)
                const filename = file_info?.filename ?? 'unknown'
                const tracker = `(${file_index}/${total_files})`

                // Create file in chosen directory
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
                current_writable = await fileHandle.createWritable()

                console.log('approach!')

                if (!record_created) {
                    // Create ONE transfer log entry on first file
                    const new_record: transfer_log_data_props = {
                        user_id: '2',
                        file_id: current_file_id,
                        username: file_owner,
                        filename: filename,
                        transfer_type: 'download',
                        perc: '0.00',
                        editable: true,
                        transaction_id: TRANSFER_ACCESS_TOKEN,
                        cancel_behaviour: () => { handleClose('(Canceled by me)') },
                        extra_msg: tracker
                    }
                    transfer_log_data_ref.current = [...transfer_log_data_ref.current ?? [], new_record]
                    set_transfer_log_data(transfer_log_data_ref.current)
                    record_created = true
                } else {
                    // Update existing record with new filename and tracker
                    update_perc_value({
                        set_transfer_log_data, transfer_log_data_ref,
                        transaction_id: TRANSFER_ACCESS_TOKEN,
                        perc: '0.00',
                        extra_msg: tracker,
                        confirm_hide: false,
                        filename: filename
                    })
                }
            }

            if (data.upload_progress) {
                const tracker = data.total_files > 1 ? `(${data.file_index}/${data.total_files})` : ''
                update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, perc: data.upload_progress, extra_msg: tracker, confirm_hide: false })
            }

            if (data.file_complete) {
                console.log('File download complete:', data.file_id)
                if (current_writable) {
                    await current_writable.close()
                    current_writable = null
                    transfer_ws.send(JSON.stringify({'file_saved':true}))

                }
            }

            if (data.all_transfers_complete) {
                console.log('All files downloaded!')
                update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Done)', confirm_hide: true, button_text: 'Clear' })
                set_ongoing_transfer_count(prev => prev - 1)
                transfer_ws.close()
            }

            if (data.transfer_canceled_by == 'host') {
                console.log('Host canceled multi-upload!')
                handleClose('(Canceled by HOST)')
            }
        }
    }
}




const DownloadMultipleFiles = async ({
    ws_ref,
    host_username,
    file_owner_id,
    set_transfer_log_data,
    transfer_log_data_ref,
    set_ongoing_transfer_count,
    files
}: DownloadMultipleFilesProps) => {

    console.log('DownloadMultipleFiles called with:', files, 'owner of those', file_owner_id)

    if (!('showSaveFilePicker' in window) || !ws_ref.current) return

    const dirHandle = await (window as any).showDirectoryPicker();

    const listenForRoomData = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data) as incoming_transfer_props
        if (data.incoming_transfer) {
            const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
            console.log('Transfer accepted!')
            ws_ref.current!.removeEventListener('message', listenForRoomData)
            launch_client_download({ TRANSFER_ACCESS_TOKEN, dirHandle, files, file_owner: host_username, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count })
        }
    }

    ws_ref.current.addEventListener('message', listenForRoomData)

    ws_ref.current.send(JSON.stringify({
        'user_multiple_file_transfer_request': {
            'files_owner_id': file_owner_id,
            'files_id': files.map((item) => item.file_id),
            'client_username': get_username()
        }
    }))
}

export default DownloadMultipleFiles
