import { CHUNK_SIZE, wait_for_client_response_while_uploading } from "@/app/to/app_conf"
import { sendFileInChunks_props} from "./upload_single_file"
import { update_perc_value_props } from "@/app/to/types"




export const update_perc_value = ({
    transfer_log_data_ref,
    set_transfer_log_data,
    transaction_id,
    perc,
    extra_msg,
    confirm_hide,
    button_text,
    filename
}:update_perc_value_props) => {

    if (!transfer_log_data_ref.current) return

    const hide_me = () => {
        transfer_log_data_ref.current = transfer_log_data_ref.current!.filter((item)=>item.transaction_id!=transaction_id)
        set_transfer_log_data(transfer_log_data_ref.current)
    }

    transfer_log_data_ref.current = transfer_log_data_ref.current.map(item =>
        item.transaction_id == transaction_id
            ? { ...item, 'perc': perc ?? item.perc, button_text, extra_msg: extra_msg ?? item.extra_msg, filename: filename ?? item.filename, cancel_behaviour: ()=> {confirm_hide ? hide_me() :( item?.cancel_behaviour ?   item?.cancel_behaviour():  null)}}
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