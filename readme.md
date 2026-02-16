# FsQue

**Peer-to-peer file sharing through the browser** — no cloud storage, no file size limits, no uploads to a server. Files stream directly between users' browsers via WebSocket relay.

---

## What it does

FsQue lets users create or join **rooms**, share files from their local filesystem, and transfer them directly to other users in the same room — in real time.

- **Lobby** — browse available rooms, create new ones (public or password-protected), see live occupancy
- **Room** — share files by picking them from disk, see who else is connected, download individual or multiple files from other users
- **Transfers** — files are chunked (10 MB) and streamed over WebSocket; progress is tracked live with a transfer log panel, uploads/downloads can be canceled mid-transfer
- **Multi-file** — select multiple files from another user and batch-download them into a chosen directory via the File System Access API

Files **never touch the server's disk**. The backend only relays binary chunks between the uploader and the downloader.

---

## Architecture

```
┌──────────────┐       ┌────────────────┐       ┌────────────────────┐
│   Browser    │◄─────►│   Nginx        │◄─────►│  Next.js Frontend  │
│              │       │   :8850        │       │  :9011             │
│  (FS Access  │       │                │       │  (React 19, App    │
│   API)       │       │  /fsque/       │       │   Router)          │
│              │       │  /fsque/backend│       │                    │
└──────────────┘       └───────┬────────┘       └────────────────────┘
                               │
                               ▼
                       ┌────────────────┐       ┌────────────────────┐
                       │  FastAPI       │◄─────►│  MariaDB           │
                       │  Backend       │       │  (fsque DB)        │
                       │  :9010         │       │  :3306             │
                       │  (Uvicorn)     │       │                    │
                       └────────────────┘       └────────────────────┘
```

All services run inside Docker containers on a shared bridge network (`fsque_net`). Nginx is the single entry point.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, CSS Modules |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLAlchemy, WebSockets |
| **Database** | MariaDB LTS |
| **Proxy** | Nginx (Alpine) |
| **Runtime** | Docker Compose |
| **Browser API** | File System Access API (`showOpenFilePicker`, `showSaveFilePicker`, `showDirectoryPicker`) |

---

## Project Structure

```
FSQUE/
├── docker-compose.yml          # Orchestrates all 4 services
├── .env                        # Runtime & build-time config
│
├── backend_fastapi/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app_self/
│       ├── deploy.py                     # Entry point — launches Uvicorn
│       └── app/
│           ├── main.py                   # FastAPI app, CORS, routes
│           ├── app_independencies.py     # App factory, CORS origins, router prefix
│           ├── db_conn.py                # SQLAlchemy engine (MariaDB)
│           ├── lifespan.py               # Startup task: room cleanup overseer
│           ├── views/
│           │   ├── models.py             # ORM model: rooms_info
│           │   ├── router.py             # Registers all API & WS routes
│           │   ├── APIs/
│           │   │   ├── read_rooms.py     # GET  /read_rooms/
│           │   │   ├── add_room.py       # POST /make_room/
│           │   │   └── verify_room.py    # GET  /does_room_exists/
│           │   │                         # POST /check_room_password/
│           │   ├── WSs/
│           │   │   ├── rooms_lobby.py    # WS /rooms-lobby/ (live room list)
│           │   │   ├── set_connection.py # WS /room-control/ (room presence + transfer negotiation)
│           │   │   ├── ws_utils.py       # Shared WS state (ROOM_CONNECTIONS)
│           │   │   ├── make_single_transfer_modules/   # WS /single-file-transfer/
│           │   │   └── make_multiple_transfer_modules/ # WS /multiple-files-transfer/
│           │   └── middlewares/
│           │       └── assign_user_id.py # Auto-assigns user_id cookie
│           └── modules/
│               ├── overseer.py           # Background task: deletes inactive rooms (10 min)
│               └── touchRoomRecord.py    # Updates room lastActivity timestamp
│
├── frontend_next/
│   ├── Dockerfile
│   └── app_self/
│       ├── next.config.ts               # basePath: /fsque, env mapping
│       ├── package.json                 # Next.js 16, React 19
│       └── src/app/to/
│           ├── layout.tsx               # Root layout with wrappers
│           ├── app_conf.tsx             # API URLs, SSL toggle, chunk size
│           ├── types.tsx                # Shared TypeScript types
│           ├── wrappers/
│           │   ├── Is_browser_supported_wrapper/  # Gates on FS Access API support
│           │   └── Is_user_logged_in/             # Username prompt if not set
│           ├── lobby/
│           │   ├── page.tsx             # Room list with live WS updates
│           │   └── createroompanel/     # Room creation form
│           ├── room/
│           │   ├── [room_id]/
│           │   │   ├── page.tsx         # Room view: user cards, file list, sharing
│           │   │   └── room_utils/
│           │   │       ├── upload_single_file.ts    # Chunked upload over WS
│           │   │       ├── upload_multiple_files.ts  # Sequential multi-file upload
│           │   │       ├── DownloadSingleFile.ts     # Single file download via FS API
│           │   │       └── DownloadMultipleFiles.ts  # Multi-file download to directory
│           │   └── comps/
│           │       ├── app_modules/mk_conn.tsx      # Main WS connection manager
│           │       ├── room_protected_prompt.tsx     # Password prompt for private rooms
│           │       └── transfer_log/                 # Live transfer progress panel
│           └── modules/
│               ├── cookie_manager.tsx   # Cookie get/set/remove
│               ├── get_username.tsx     # Read username from cookie
│               └── acquire_rooms_ls.tsx # HTTP fallback for room list
│
├── nginx/
│   ├── dockerfile
│   └── default.conf                    # Reverse proxy: /fsque/ → frontend, /fsque/backend/ → backend
│
└── sql_database/
    ├── dockerfile                      # MariaDB LTS
    ├── fsque_template.sql              # Schema: rooms_info table
    └── data/                           # Persistent volume for DB data
```

---

## How File Transfer Works

```
  User A (Sender)                   Backend (Relay)                User B (Receiver)
  ───────────────                   ───────────────                ─────────────────
       │                                  │                              │
       │  1. Picks files via              │                              │
       │     showOpenFilePicker()         │                              │
       │                                  │                              │
       │  2. Files listed via room WS ───►│──── broadcast to room ──────►│
       │                                  │                              │
       │                                  │◄── "I want file X" ─────────│  3. Clicks Download
       │                                  │                              │     (showSaveFilePicker)
       │◄── "begin upload" ──────────────│                              │
       │                                  │                              │
       │  4. Reads file in 10MB chunks    │                              │
       │     sends binary via WS ────────►│──── relay binary ──────────►│  5. Writes to disk
       │                                  │                              │     via FileSystemWritableFileStream
       │     (waits for ACK per chunk)    │◄── ACK ────────────────────│
       │                                  │                              │
       │  6. "transfer_complete" ────────►│──── "transfer_complete" ───►│  7. Closes writable
       └──────────────────────────────────┴──────────────────────────────┘
```

- **Single file**: One dedicated WS at `/single-file-transfer/`
- **Multiple files**: Sequential transfer over one WS at `/multiple-files-transfer/`, each file opened/closed on disk before the next begins
- **Cancellation**: Either side can cancel mid-transfer; the other is notified
- **Progress**: Percentage tracked and displayed live in the transfer log

---

## Room System

| Feature | Details |
|---|---|
| **Create** | Name, optional password, public/private, visible/hidden, auto-redirect |
| **Join** | Click from lobby or navigate directly by room URL |
| **Password** | Private rooms require password; once entered, user is added to `allowed_users` |
| **Occupancy** | Live count of connected WebSocket clients per room |
| **Auto-cleanup** | Background task deletes rooms with no activity for 10 minutes (skips occupied rooms) |
| **Live updates** | Lobby receives room list changes via WebSocket broadcast |

---

## Environment Variables

Create a `.env` file in the project root:

```env
API_PORT=9010
API_BASE_URL=your-domain.com/fsque/backend
API_WORKERS=4
USE_SSL=y
```

| Variable | Description |
|---|---|
| `API_PORT` | Port for Uvicorn backend (default `9010`) |
| `API_BASE_URL` | Public-facing backend URL (used by frontend for API calls) |
| `API_WORKERS` | Number of Uvicorn workers |
| `USE_SSL` | `y` to use `https://` and `wss://`, `n` for `http://` and `ws://` |

> **Important**: No spaces around `=` in the `.env` file.

These variables are passed as Docker build args to the frontend container so Next.js can inline them at build time.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose

### Deploy

```bash
# Clone and enter the project
cd FSQUE

# Create your .env file
cp .env.example .env   # or create manually (see above)

# Build and start all services
docker compose up --build -d
```

The app will be available at `http://localhost:8850/fsque/lobby`.

For production behind a reverse proxy with SSL, set `API_BASE_URL` to your domain and `USE_SSL=y`.

---

## Nginx Routing

| Path | Proxied to | Purpose |
|---|---|---|
| `/fsque/backend/*` | `fsque_fastapi_backend:9010/backend/*` | REST APIs + WebSocket endpoints |
| `/fsque/*` | `fsque_next_frontend:9011/fsque/*` | Next.js pages and static assets |
| `/_next/*` | `fsque_next_frontend:9011/_next/*` | Next.js static chunks (fallback) |

---

## Browser Requirements

FsQue requires the **File System Access API**, which is currently supported in:

- Google Chrome / Chromium 86+
- Microsoft Edge 86+
- Opera 72+

Firefox and Safari are **not supported**. The app shows an "Unsupported browser" notice if the API is unavailable.

---

## Ports (Internal)

| Service | Container Port |
|---|---|
| Nginx | `8850` (exposed to host) |
| Next.js Frontend | `9011` |
| FastAPI Backend | `9010` |
| MariaDB | `3306` |
