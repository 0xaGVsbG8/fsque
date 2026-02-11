
export type transfer_uploading = boolean
export type transfer_downloading = boolean

export type payload_props = {
    filename: string,
    filesize: number
}

export type user_ws_conn_info = {
    username: string,
    user_id: string,
    payload: payload_props[]
}


// export {transfer_downloading, transfer_uploading}