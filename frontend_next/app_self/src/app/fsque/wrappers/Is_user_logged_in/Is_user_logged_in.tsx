'use client'
import {useEffect, useState} from 'react'
// import UnsupportedBrowserNotice from '../../global_comps/unsuported_browser'
// import styles from "./Is_browser_supported_wrapper.module.css";
import UsernamePrompt from '../../global_comps/username_prompt';
import { cookie_finder, set_cookie } from '../../modules/cookie_manager';
import { base_fetch } from '../../app_conf';


export default function Is_user_logged_in({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [isLogged, setIsLogged] = useState<boolean>(false)

  const isUserLogged = ():boolean => {
    const username = cookie_finder('username')
    if(!username) {return false}
    return true
  }

  const doIhaveId = async() => {

    if(!cookie_finder('registered')){
      console.log('user unregisterd')
      const response  = await fetch(base_fetch+ '/read_rooms/')
      console.log(response, 'ss')
      set_cookie('registered', 'true')
      window.location.reload()
    }

  }


  useEffect(()=>{
    setIsMounted(true)
    setIsLogged(isUserLogged())
  },[])

  useEffect(()=>{doIhaveId()})

  if(!isMounted) return

  return (
    <>
    {/* {children} */}
      {isLogged ? (
        children
      ) : (
        <div>
          <UsernamePrompt
            onSave={(username: string) => {
              set_cookie('username', username)
              setIsLogged(true)
            }}
          />
        </div>
      )}


      {/* {children} */}
    </>
  );
  
}

