import get_username from "@/app/modules/get_username"
import { transfer_log_data_utils } from "./DownloadSingleFile"
import { base_ws } from "@/app/app_conf copy"

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
    'targets': string[] //file id
}


type launch_client_transfer_props = transfer_log_data_utils &{
    TRANSFER_ACCESS_TOKEN: string
    dirHandle: FileSystemDirectoryHandle
    files: DownloadMultipleFilesEntry[]
    file_owner: string
    set_ongoing_transfer_count: React.Dispatch<React.SetStateAction<number>>
}


const launch_client_download = async({
    TRANSFER_ACCESS_TOKEN,
    dirHandle,
    files,
    file_owner,
    set_transfer_log_data,
    transfer_log_data_ref,
    set_ongoing_transfer_count
}:launch_client_transfer_props) => {

    const transfer_ws = new WebSocket(base_ws + '/multiple-files-transfer' + `?TRANSFER_ACCESS_TOKEN=${TRANSFER_ACCESS_TOKEN}`)


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
        // console.log(data)
        if(data.incoming_transfer){
            const TRANSFER_ACCESS_TOKEN = data.TRANSFER_ACCESS_TOKEN
            const TARGETS = data.targets
            console.log('Transfer accepted!')
            ws_ref.current!.removeEventListener('message', listenForRoomData)
            launch_client_download({TRANSFER_ACCESS_TOKEN, dirHandle, files, file_owner: host_username, set_transfer_log_data, transfer_log_data_ref, set_ongoing_transfer_count})
            
        }
    }


    ws_ref.current.addEventListener('message', listenForRoomData)



    ws_ref.current.send(JSON.stringify({
        'user_multiple_file_transfer_request':{
            'files_owner_id': file_owner_id,
            'files_id': files.map((item)=>item.file_id),
            'client_username': get_username()
        }
    }))



    // const fileHandle = await dirHandle.getFileHandle("plik.txt", {
    //     create: true,
    //   });
    // const writable = await fileHandle.createWritable();

    // await writable.write("Siema kierowniku, to jest test.");
    // await writable.close();
}

export default DownloadMultipleFiles
