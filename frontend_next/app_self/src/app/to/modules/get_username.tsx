import { cookie_finder } from "./cookie_manager"

const get_username = ():string => {
    const username = cookie_finder('username')
    if(username) return username
    return 'n/a'
}

export default get_username