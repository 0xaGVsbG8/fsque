import { base_fetch } from "../app_conf";

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


export {Is_fs_avaible}