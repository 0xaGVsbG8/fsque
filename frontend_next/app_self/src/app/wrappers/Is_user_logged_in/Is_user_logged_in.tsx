'use client'
import {useEffect, useState} from 'react'
// import UnsupportedBrowserNotice from '../../global_comps/unsuported_browser'
// import styles from "./Is_browser_supported_wrapper.module.css";
import UsernamePrompt from '@/app/global_comps/username_prompt';
import { cookie_finder, set_cookie } from '@/app/modules/cookie_manager';


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


  useEffect(()=>{
    setIsMounted(true)
    setIsLogged(isUserLogged())
  },[])

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

