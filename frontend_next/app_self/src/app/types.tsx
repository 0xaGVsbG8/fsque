
export type transfer_uploading = boolean
export type transfer_downloading = boolean

export type payload_props = {
    filename: string,
    real_filesize: number
    filesize: string
    file_id: string
}

export type user_ws_conn_info = {
    username: string,
    user_id: string,
    payload: payload_props[]
    temp_identity: string
}


export type RoomEntry = {
    name: string;
    protected: boolean;
    visible: boolean;
    password?: string;
    room_id: string,
    owner:string,
    redirectImmediately?: boolean;
    occupancy: number

};    


export type transfer_log_data_props = {
    user_id: string
    file_id: string
    username: string
    filename: string
    transfer_type: 'upload' | 'download'
    perc: number | string,
    editable: boolean
    cancel_behaviour?: () => void
    extra_msg?: string
}


export type IncomingTransferData = {
    incoming_transfer: string
    role: string
    TRANSFER_ACCESS_TOKEN: string
    target: string
}



// export {transfer_downloading, transfer_uploading}