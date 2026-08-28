console.log(
  "API HOST:",
  typeof window !== "undefined" ? window.location.host : ""
);

const app_title = "FsQue";
const default_app_url = "/to/lobby";

const CHUNK_SIZE = 10 * 1024 * 1024;

const API_HOST =
  typeof window !== "undefined"
      ? window.location.host
      : "";

const USE_SSL =
  typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : true;

const API_BASE_URL = "/fsque/backend";

const base_fetch =
  `${USE_SSL ? "https://" : "http://"}${API_HOST}${API_BASE_URL}`;

const base_ws =
  `${USE_SSL ? "wss://" : "ws://"}${API_HOST}${API_BASE_URL}`;

const wait_for_client_response_while_uploading: boolean = true;

export {
  app_title,
  default_app_url,
  base_fetch,
  base_ws,
  wait_for_client_response_while_uploading,
  CHUNK_SIZE
};