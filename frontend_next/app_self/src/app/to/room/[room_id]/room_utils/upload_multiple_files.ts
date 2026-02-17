import { base_ws, wait_for_client_response_while_uploading } from "../../../app_conf"
import { transfer_log_data_props } from "../../../types"
import { sendFileInChunks, update_perc_value } from "./chunkManager"
import { ModifiedFile, transfer_log_data_utils } from "./upload_single_file"

let opened_multiple_file_transfer: boolean = false


export type UploadMultipleFilesProps = transfer_log_data_utils & {
    fileLsRefForTransfer: React.MutableRefObject<ModifiedFile[] | null>
    target_ids: string[]
    TRANSFER_ACCESS_TOKEN: string
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}



export function waitForSavedFileConfirmation(ws: WebSocket): Promise<void> {
    return new Promise((resolve) => {

        const handler = (event: MessageEvent) => {
            // console.log(event, 'handler?')
            if (typeof event.data === "string") {
                const data = JSON.parse(event.data)

                if (data.client_saved) {
                    console.log('client saved a file')
                    // console.log('client received a chunk')
                    ws.removeEventListener("message", handler)
                    resolve()
                }
            }
        }

        ws.addEventListener("message", handler)
    })
}



const UploadMultipleFiles = ({
    fileLsRefForTransfer,
    target_ids,
    TRANSFER_ACCESS_TOKEN,
    set_transfer_log_data,
    transfer_log_data_ref,
    set_ongoing_transfer_count
}: UploadMultipleFilesProps) => {

    console.log('UploadMultipleFiles starting for targets:', target_ids)

    if (!fileLsRefForTransfer.current) return

    if (opened_multiple_file_transfer) return
    opened_multiple_file_transfer = true
    setTimeout(() => { opened_multiple_file_transfer = false }, 10)

    const upload_ws = new WebSocket(base_ws + '/multiple-files-transfer/' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)
    let record_created = false

    const preventClose = (e: BeforeUnloadEvent) => { e.preventDefault() }

    upload_ws.onopen = () => {
        console.log('multiple upload transfer opened')
        window.addEventListener('beforeunload', preventClose)
        set_ongoing_transfer_count(prev => prev + 1)
        const joinEffect = new Audio('/fsque/assets/join.mp3')
        joinEffect.play()
    }

    const cancel_behaviour_func = () => {
        window.removeEventListener('beforeunload', preventClose)
        update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: ' (Canceled by me)', confirm_hide: true, button_text: 'Clear' })
        set_ongoing_transfer_count(prev => prev - 1)
        upload_ws.close()
    }

    upload_ws.onmessage = async (msg) => {
        try {
            const data = JSON.parse(msg.data)
            console.log(data, 'multiple upload msg')

            if (data.transfer_canceled_by) {
                console.log('client canceled multi-download!')
                window.removeEventListener('beforeunload', preventClose)
                update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Canceled by client)', confirm_hide: true, button_text: 'Clear' })
                set_ongoing_transfer_count(prev => prev - 1)
                upload_ws.close()
            }

            if (data.begin_upload) {
                const file_id = data.file_id
                const file_index: number = data.file_index
                const total_files: number = data.total_files
                const target_file = fileLsRefForTransfer.current?.filter(item => item.file_id == file_id)

                if (!target_file || target_file.length === 0) {
                    console.log('File not found:', file_id)
                    return
                }

                const file = target_file[0]
                const tracker = `(${file_index}/${total_files})`

                console.log('uploading file:', file.file.name, 'size:', file.file.size, tracker)

                // Send file info to backend so it can track progress
                upload_ws.send(JSON.stringify({ file_info: { filesize: file.file.size } }))

                if (!record_created) {
                    // Create ONE transfer log entry on first file
                    const new_record: transfer_log_data_props = {
                        user_id: '2',
                        file_id: file.file_id,
                        username: data.client_username,
                        filename: file.file.name,
                        transfer_type: 'upload',
                        perc: '0.00',
                        editable: true,
                        cancel_behaviour: () => { cancel_behaviour_func() },
                        transaction_id: TRANSFER_ACCESS_TOKEN,
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
                        filename: file.file.name
                    })
                }

                // Send chunks
                await sendFileInChunks({
                    file: file.file,
                    file_id: file.file_id,
                    ws: upload_ws,
                    set_transfer_log_data,
                    transfer_log_data_ref,
                    TRANSFER_ACCESS_TOKEN
                })

                console.log('File upload done:', file.file.name)

                // Notify backend this file is done
                upload_ws.send(JSON.stringify({ file_transfer_complete: true, file_id: file_id }))
                // await waitForSavedFileConfirmation(upload_ws)
                console.log('forwad!')
            }

            if (data.all_uploads_complete) {
                console.log('All files uploaded!')
                window.removeEventListener('beforeunload', preventClose)
                const joinEffect = new Audio('/fsque/assets/done.mp3')
                joinEffect.play()
                update_perc_value({ set_transfer_log_data, transfer_log_data_ref, transaction_id: TRANSFER_ACCESS_TOKEN, extra_msg: '(Done)', confirm_hide: true, button_text: 'Clear', perc:'100.00' })
                set_ongoing_transfer_count(prev => prev - 1)
                upload_ws.close()
            }

        } catch (err) {
            console.log(err, 'multiple upload error')
        }
    }
}


export default UploadMultipleFiles
