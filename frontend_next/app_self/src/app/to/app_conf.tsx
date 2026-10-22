
console.log("API HOST:", process.env.NEXT_PUBLIC_API_BASE_FETCH);

const app_title = 'FsQue'
const default_app_url = '/to/lobby'


// const CHUNK_SIZE = 64 * 1024 // 64KB chunks
// const CHUNK_SIZE = 5120 * 1024 // 64KB chunks #5MBs
const CHUNK_SIZE = 10 * 1024  * 1024 // 64KB chunks #5MBs


const API_HOST = process.env.NEXT_PUBLIC_API_HOST as string


const BACKEND_PATH = '/fsque/backend'

const base_fetch = BACKEND_PATH
// const base_fetch = 'http://localhost:9010/backend'


const base_ws = typeof window === 'undefined'
    ? BACKEND_PATH
    : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + BACKEND_PATH
// const base_ws = 'ws://localhost:9010/backend'

const wait_for_client_response_while_uploading: boolean = true

export {app_title, default_app_url, base_fetch, base_ws, wait_for_client_response_while_uploading, CHUNK_SIZE}