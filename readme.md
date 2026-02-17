# FsQue

**Peer-to-peer file sharing through the browser** — no cloud storage, no file size limits, no uploads to a server. Files stream directly between users' browsers via WebSocket relay.

---

## What it does

FsQue lets users create or join **rooms**, share files from their local filesystem, and transfer them directly to other users in the same room — in real time.

- **Lobby** — browse available rooms, create new ones (public or password-protected), see live occupancy counts updated over WebSocket
- **Room** — share files by picking them from disk, see who else is connected and what they're sharing, download individual or batch-download multiple files from other users
- **Transfers** — files are chunked (10 MB) and streamed over WebSocket; progress is tracked live in a floating transfer log panel; uploads and downloads can be canceled mid-transfer by either side
- **Multi-file** — select multiple files from another user via checkboxes (including "select all") and batch-download them into a chosen directory via the File System Access API
- **Safety** — the browser's `beforeunload` dialog prevents accidental tab/window closure while a transfer is in progress

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
├── fsque.service               # Systemd unit for auto-deploy on Linux
│
├── backend_fastapi/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app_self/
│       ├── deploy.py                     # Entry point — reads .env, verifies DB, launches Uvicorn
│       └── app/
│           ├── main.py                   # FastAPI app, CORS, routes
│           ├── app_independencies.py     # App factory, CORS origins, router prefix (/backend)
│           ├── db_conn.py                # SQLAlchemy engine (MariaDB)
│           ├── lifespan.py               # Startup task: room cleanup overseer
│           ├── views/
│           │   ├── models.py             # ORM model: rooms_info (name, owner, privacy, token, etc.)
│           │   ├── router.py             # Registers all API & WS routes
│           │   ├── request_timeouter.py  # Request timeout middleware
│           │   ├── APIs/
│           │   │   ├── read_rooms.py     # GET  /read_rooms/
│           │   │   ├── add_room.py       # POST /make_room/
│           │   │   └── verify_room.py    # GET  /does_room_exists/
│           │   │                         # POST /check_room_password/
│           │   ├── WSs/
│           │   │   ├── rooms_lobby.py    # WS /rooms-lobby/  — live room list broadcast
│           │   │   ├── set_connection.py # WS /room-control/  — room presence, payload broadcast,
│           │   │   │                     #                       transfer negotiation (single & multi)
│           │   │   ├── ws_utils.py       # Shared WS state (ROOM_CONNECTIONS, USERS_PAYLOAD)
│           │   │   ├── make_single_transfer_modules/
│           │   │   │   ├── make_single_transfer.py   # WS /single-file-transfer/ endpoint
│           │   │   │   └── utils.py                   # Relay class (client/host chunk relay)
│           │   │   └── make_multiple_transfer_modules/
│           │   │       ├── make_multiple_transfer.py  # WS /multiple-files-transfer/ endpoint
│           │   │       └── utils.py                   # MultiRelay class (sequential file relay)
│           │   └── middlewares/
│           │       └── assign_user_id.py # Auto-assigns user_id cookie (skips WebSocket connections)
│           └── modules/
│               ├── overseer.py           # Background task: deletes rooms inactive for 10 min
│               └── touchRoomRecord.py    # Updates room lastActivity timestamp
│
├── frontend_next/
│   ├── Dockerfile
│   └── app_self/
│       ├── next.config.ts               # basePath: /fsque, env mapping, React Compiler
│       ├── package.json                 # Next.js 16, React 19, uuid
│       └── src/app/to/                  # App pages (served under /fsque/to/*)
│           ├── layout.tsx               # Root layout with global wrappers
│           ├── app_conf.tsx             # API URLs, SSL toggle, chunk size (10 MB)
│           ├── types.tsx                # Shared TypeScript types
│           ├── globals.css              # Global styles
│           ├── wrappers/
│           │   ├── Is_browser_supported_wrapper/  # Gates on File System Access API support
│           │   └── Is_user_logged_in/             # Username prompt if cookie not set
│           ├── global_comps/
│           │   ├── username_prompt.tsx   # Username input dialog
│           │   └── unsuported_browser.tsx # "Browser not supported" notice
│           ├── modules/
│           │   ├── cookie_manager.tsx   # Cookie get/set/remove helpers
│           │   ├── get_username.tsx     # Read username from cookie
│           │   └── acquire_rooms_ls.tsx # HTTP fallback for room list
│           ├── lobby/
│           │   ├── page.tsx             # Room list with live WS updates, room creation
│           │   ├── page.module.css
│           │   └── createroompanel/     # Room creation form (name, password, privacy)
│           └── room/
│               ├── [room_id]/
│               │   ├── page.tsx         # Room view: user cards, file lists, select-all,
│               │   │                    #   download selected, share files
│               │   ├── room.module.css  # Dark theme room styles
│               │   └── room_utils/
│               │       ├── mk_conn.tsx              # Room WebSocket connection manager
│               │       ├── upload_single_file.ts    # Chunked upload (host side)
│               │       ├── upload_multiple_files.ts  # Sequential multi-file upload (host side)
│               │       ├── DownloadSingleFile.ts     # Single file download (client side)
│               │       ├── DownloadMultipleFiles.ts  # Multi-file download to directory (client side)
│               │       └── chunkManager.ts           # Chunk size utilities
│               └── comps/
│                   ├── room_protected/
│                   │   └── room_protected_prompt.tsx  # Password prompt for private rooms
│                   └── transfer_log/
│                       ├── transfer_log.tsx           # Floating progress panel (expandable)
│                       └── transfer_log.module.css
│
├── nginx/
│   ├── dockerfile
│   └── default.conf                    # Reverse proxy config with WebSocket upgrade support
│
└── sql_database/
    ├── dockerfile                      # MariaDB LTS, auto-creates `fsque` database
    ├── fsque_template.sql              # Schema: rooms_info table
    └── data/                           # Bind-mounted persistent DB data
```

---

## How File Transfer Works

```
  User A (Host)                    Backend (Relay)                User B (Client)
  ─────────────                    ───────────────                ────────────────
       │                                  │                              │
       │  1. Picks files via              │                              │
       │     showOpenFilePicker()         │                              │
       │                                  │                              │
       │  2. File list broadcast ────────►│──── payload to room ────────►│
       │     via room WS                  │                              │
       │                                  │                              │
       │                                  │◄── "I want file X" ─────────│  3. Clicks Download
       │                                  │                              │     (showSaveFilePicker)
       │◄── "begin upload" ──────────────│                              │
       │                                  │                              │
       │  4. Reads file in 10MB chunks    │                              │
       │     sends binary via WS ────────►│──── relay binary ──────────►│  5. Writes to disk
       │                                  │                              │     via FileSystemWritableFileStream
       │     (waits for ACK per chunk)    │◄── ACK ────────────────────│
       │◄── ACK ─────────────────────────│                              │
       │                                  │                              │
       │  6. "transfer_complete" ────────►│──── "transfer_complete" ───►│  7. Closes writable
       └──────────────────────────────────┴──────────────────────────────┘
```

### Single file
One dedicated WebSocket at `/single-file-transfer/`. The `Relay` class on the backend manages the `host()` and `client()` coroutines concurrently — the host sends chunks, the client ACKs them, and progress is relayed back.

### Multiple files
Sequential transfer over a single WebSocket at `/multiple-files-transfer/`. The `MultiRelay` class iterates through the file list — for each file it resets the offset, tells both sides which file is next (`begin_file`), relays all chunks, waits for the client to save, then moves on. A tracker like `(2/5)` is shown in the transfer log.

### Cancellation
Either side can cancel mid-transfer. The other party is notified via `transfer_canceled_by` message. The transfer log updates accordingly with `(Canceled by me)` or `(Canceled by HOST/client)`.

### Page close protection
While any transfer is active, a `beforeunload` event listener prevents accidental tab closure. The listener is removed once the transfer completes or is canceled.

---

## Room System

| Feature | Details |
|---|---|
| **Create** | Name, optional password, public/private toggle, visible/hidden, owner name |
| **Join** | Click from lobby or navigate directly by room URL |
| **Password** | Private rooms require a password; once correct, user is added to `allowed_users` in DB |
| **Occupancy** | Live count of connected WebSocket clients per room, visible in lobby |
| **Payload sharing** | Each user's shared files (filename, size, ID) are broadcast to all room members |
| **Auto-cleanup** | Background task runs every 30s, deletes rooms with no activity for 10 minutes (skips occupied rooms) |
| **Live lobby** | Room list changes (create, delete, occupancy) are broadcast to all lobby WebSocket connections |

---

## WebSocket Endpoints

All WebSocket endpoints are under the `/backend` prefix.

| Endpoint | Purpose |
|---|---|
| `WS /rooms-lobby/` | Live room list updates for the lobby page |
| `WS /room-control/` | Room presence management, user payload broadcast, transfer negotiation |
| `WS /single-file-transfer/` | Dedicated relay for a single file transfer between two users |
| `WS /multiple-files-transfer/` | Dedicated relay for sequential multi-file transfer between two users |

## REST Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/read_rooms/` | GET | List all visible rooms |
| `/make_room/` | POST | Create a new room |
| `/does_room_exists/` | GET | Check if a room exists and whether the user has access |
| `/check_room_password/` | POST | Verify room password, add user to allowed list |

---

## Environment Variables

Create a `.env` file in the project root:

```env
API_PORT=9010
API_BASE_URL=localhost:8850/fsque/backend
API_WORKERS=1
USE_SSL=n
```

| Variable | Description | Default |
|---|---|---|
| `API_PORT` | Port for Uvicorn backend | `9010` |
| `API_BASE_URL` | Public-facing backend URL (used by frontend for fetch/WS calls) | — |
| `API_WORKERS` | Number of Uvicorn workers | `1` |
| `USE_SSL` | `y` for `https://`/`wss://`, `n` for `http://`/`ws://` | `n` |

These variables are passed as Docker build args to the frontend container so Next.js can inline them at build time via `next.config.ts`.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose

### Deploy

```bash
# Clone and enter the project
cd FSQUE

# Create your .env file
nano .env   # see Environment Variables above

# Build and start all services
docker compose up --build -d
```

The app will be available at **`http://localhost:8850/fsque/to/lobby`**.

### Deploy as a systemd service (Linux)

A `fsque.service` unit file is included for auto-starting on boot:

```bash
# Edit the WorkingDirectory path in fsque.service to match your install location
sudo cp fsque.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fsque
sudo systemctl start fsque
```

### Production

For production behind a reverse proxy with SSL:
1. Set `API_BASE_URL` to your public domain (e.g. `your-domain.com/fsque/backend`)
2. Set `USE_SSL=y`
3. Update the CORS origins in `backend_fastapi/app_self/app/app_independencies.py`
4. Rebuild: `docker compose up --build -d`

---

## Nginx Routing

| Path | Proxied to | Purpose |
|---|---|---|
| `/fsque/backend/*` | `fsque_fastapi_backend:9010/backend/*` | REST APIs + WebSocket endpoints |
| `/fsque/*` | `fsque_next_frontend:9011/fsque/*` | Next.js pages and assets |
| `/_next/*` | `fsque_next_frontend:9011/_next/*` | Next.js static chunks / HMR (dev) |

All proxy locations include WebSocket upgrade headers for full WS support.

---

## Browser Requirements

FsQue requires the **File System Access API**, which is currently supported in:

- Google Chrome / Chromium 86+
- Microsoft Edge 86+
- Opera 72+

Firefox and Safari are **not supported**. The app shows an "Unsupported browser" notice if the API is unavailable.

---

## Ports (Internal)

| Service | Container Name | Internal Port | Exposed to Host |
|---|---|---|---|
| Nginx | `fsque_nginx` | `8850` | ✅ `8850` |
| Next.js Frontend | `fsque_next_frontend` | `9011` | — |
| FastAPI Backend | `fsque_fastapi_backend` | `9010` | — |
| MariaDB | `fsque_db` | `3306` | — |

---

## Database

MariaDB stores room data in the `rooms_info` table:

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-increment ID |
| `name` | VARCHAR | Room display name |
| `owner` | VARCHAR | Creator's username |
| `privacy` | ENUM(`public`, `private`) | Room access type |
| `password` | TEXT | Room password (plaintext, for private rooms) |
| `visible` | BOOLEAN | Whether room appears in lobby |
| `allowed_users` | JSON | Array of user IDs with access |
| `token` | VARCHAR(36) | UUID room identifier (used in URLs) |
| `lastActivity` | BIGINT | Unix timestamp, updated on every interaction |

Database files are persisted via bind mount at `./sql_database/data/`. The schema is auto-initialized from `fsque_template.sql` on first run.
