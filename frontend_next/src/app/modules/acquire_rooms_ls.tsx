import { base_fetch } from "../app_conf"

export const acquire_rooms_ls = async() => {
    console.log('gathering datas')

    const url = base_fetch+"/read_rooms"
    const response = await fetch(url, {
        method: "GET",
    });
    const data = await response.json()

    console.log(data)

    return data
}
