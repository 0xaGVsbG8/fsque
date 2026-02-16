
console.log("API HOST:", process.env.NEXT_PUBLIC_API_BASE_FETCH);

const app_title = 'FsQue'
const default_app_url = '/fsque/lobby'

const CHUNK_SIZE = 10 * 1024  * 1024

const API_HOST = process.env.NEXT_PUBLIC_API_HOST as string
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const USE_SSL = process.env.NEXT_PUBLIC_USE_SSL as string == ('y' || 'yes') ?? false

const base_fetch = (USE_SSL ? 'https://' : 'http://') + API_BASE_URL
// const base_fetch = 'http://localhost:9010/backend'
const base_ws =  (USE_SSL ? 'wss://' : 'ws://') + API_BASE_URL
// const base_ws = 'ws://localhost:9010/backend'

const wait_for_client_response_while_uploading: boolean = true

export {app_title, default_app_url, base_fetch, base_ws, wait_for_client_response_while_uploading, CHUNK_SIZE}