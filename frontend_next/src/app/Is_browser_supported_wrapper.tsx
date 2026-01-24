'use client'
import {useEffect, useState} from 'react'
import UnsupportedBrowserNotice from './global_comps/unsuported_browser'
import styles from "./Is_browser_supported_wrapper.module.css";


const Is_fs_avaible = ():boolean => {
  if ('showSaveFilePicker' in window) {
    console.log('FS access avaible');
    return true
  } else {
    console.log('FS access unavaible');
    return false
  }

  // console.log('secure:', window.isSecureContext);
  // console.log('showSaveFilePicker in window:', 'showSaveFilePicker' in window);
  // console.log('window.showSaveFilePicker:', (window as any).showSaveFilePicker);
}


export default function Is_browser_supported_wrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [isMounted, setIsMounted] = useState<boolean>(false)


  useEffect(()=>{
    setIsMounted(true) 
  },[])

  if(!isMounted) return

  return (
    <>
      {Is_fs_avaible() ? (
        children
      ) : (
        <div className={styles.centered}>
          <UnsupportedBrowserNotice />
        </div>
      )}


      {/* {children} */}
    </>
  );
  
}


export {Is_fs_avaible}