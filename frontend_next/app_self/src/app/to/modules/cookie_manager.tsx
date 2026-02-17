class cookie_manager{

    static cookie_finder(key:string):string|false{
        key=key.trim()
        const cookie_ls = document.cookie.split("; ")
        for(const [index,cookie] of cookie_ls.entries()){
            const [loop_key,value] = cookie.split('=')
            if(loop_key.trim()==key){
                return value.trim()
            }
        }
        return false
    }

    static set_cookie(key:string,value:string|number|boolean){
        document.cookie=`${key}=${value}; expires=99999; path=/`;
    }

    static remove_cookie(key:string){
        document.cookie = `${key}=;expires=Thu,01 Jan 1970 00:00:00 UTC; path=/`;
    }

}

const cookie_finder = (key:string) => cookie_manager.cookie_finder(key)
const set_cookie = (key:string,value:string|number|boolean) => cookie_manager.set_cookie(key,value)
const remove_cookie = (key:string) => cookie_manager.remove_cookie(key)

export {cookie_finder,set_cookie,remove_cookie}