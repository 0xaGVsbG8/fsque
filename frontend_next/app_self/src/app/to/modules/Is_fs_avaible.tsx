
const Is_fs_avaible = ():boolean => {
    if ('showSaveFilePicker' in window) {
      console.log('FS access avaible');
      return true
    } else {
      console.log('FS access unavaible');
      return false
    }
  
  }


export {Is_fs_avaible}