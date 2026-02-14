
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


// export {transfer_downloading, transfer_uploading}