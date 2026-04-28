<div align="center">

# 📡 GrubPac Content Broadcasting System

**A stateless, role-aware REST API for scheduling, moderating, and broadcasting media content —**  
**with real-time time-sliced rotation and zero client-side configuration.**

<br/>

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-RBAC-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

<br/>

**Author:** Prateek Kumar &nbsp;·&nbsp; **Assignment:** Backend Engineering Hackathon

</div>

---

## 🚀 Live Deployment

> **Base URL:**
> ```
> https://grubpac-backend-pk37.onrender.com
> ```
> All API endpoints are live and publicly accessible at this base URL.

---

## 📮 Postman Collection

> 📁 **`GrubPac_API_Submission.json`** is included in the root of this repository.  
> Import it directly into Postman for **one-click testing** of every endpoint.  
> Auth tokens are wired via Postman environment variables — no manual copying needed.

**Collection preview:**

![Postman Screenshot](https://github.com/Prateek-glitch/grubpac-backend/blob/main/pstman1.png?raw=true)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Local Setup](#-local-setup)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Scheduling & Rotation Algorithm](#-scheduling--rotation-algorithm)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Security Notes](#-security-notes)

---

## 🧭 Overview

The **GrubPac Content Broadcasting System** enables educational institutions to manage, moderate, and broadcast media content on a scheduled, rotating basis across three clearly separated roles:

| Role | Capability |
|---|---|
| 🎓 **Teacher** | Upload JPEG/PNG media with `start_time`, `end_time`, and `duration` |
| 🏫 **Principal** | Review pending uploads — approve or reject |
| 🌐 **Public** | Hit `/live/:teacherId` to receive the currently active rotating item |

Role identity is embedded inside a signed JWT — no session store, no database lookup on every request. The system is fully stateless and horizontally scalable.

---

## 🛠️ Tech Stack

| | Technology | Role |
|---|---|---|
| ![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | **Node.js** v18+ | Server-side JavaScript runtime |
| ![Express](https://img.shields.io/badge/-Express.js-000000?style=flat-square&logo=express&logoColor=white) | **Express.js** | REST routing & middleware pipeline |
| ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) | **PostgreSQL** | Relational data store |
| ![Neon](https://img.shields.io/badge/-Neon-00E5BF?style=flat-square&logoColor=black) | **Neon** | Serverless Postgres hosting — auto-scale, pooling, SSL |
| ![JWT](https://img.shields.io/badge/-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | **JSON Web Tokens** | Stateless auth & role claims |
| ![Multer](https://img.shields.io/badge/-Multer-FF6C37?style=flat-square) | **Multer** | `multipart/form-data` MIME + size validation |
| ![dotenv](https://img.shields.io/badge/-dotenv-ECD53F?style=flat-square&logo=dotenv&logoColor=black) | **dotenv** | Secure environment config injection |
| ![Render](https://img.shields.io/badge/-Render-46E3B7?style=flat-square&logo=render&logoColor=black) | **Render** | Cloud deployment with Git auto-deploy |

---

## ✨ Key Features

### 🔐 1. Strict Stateless RBAC via JWT

Every protected route runs a two-layer middleware chain before any business logic executes:

```
Request
  │
  ├─► authenticateToken     →  Verify Bearer token · Decode JWT · Attach req.user
  │                            ✗ Invalid/expired → 401 Unauthorized
  │
  └─► authorizeRole('teacher')  →  Check req.user.role against whitelist
                                   ✗ Wrong role → 403 Forbidden
```

Roles (`teacher` / `principal`) are embedded in the token payload at login time and **never stored server-side**.

---

### 📁 2. Hardened Multipart Image Uploads

Multer is configured with a custom `fileFilter` and a `limits` object that enforce constraints **before any file touches disk**:

```js
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },      // 10 MB hard cap
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPEG and PNG images are permitted'), false);
  }
});
```

- Non-JPEG/PNG → rejected at `fileFilter`, never written to disk
- Oversized file → Multer raises `LIMIT_FILE_SIZE`, caught by global error handler → `400`
- Filename collisions → prevented via `Date.now()` prefixing

---

### ⏱️ 3. Modulo-Based Live Content Rotation

The `/live/:teacherId` endpoint is stateless and deterministic — no cron jobs, no Redis, no polling. See the [full algorithm breakdown](#-scheduling--rotation-algorithm) below.

---

### 🛡️ 4. Comprehensive Edge Case Handling

| Scenario | Status | Message |
|---|---|---|
| No active approved content for teacher | `404` | "No live content available" |
| Missing or expired JWT | `401` | "Token missing or invalid" |
| Correct token, wrong role | `403` | "Insufficient permissions" |
| File > 10 MB | `400` | Multer error — file never written |
| Non-JPEG/PNG MIME type | `400` | Rejected at fileFilter layer |
| Duplicate email on register | `409` | PostgreSQL UNIQUE violation |
| SQL injection attempt | ✅ Safe | Parameterised `$1, $2` queries |
| Review non-existent content ID | `404` | "Content not found" |

---

### 🗄️ 5. Serverless PostgreSQL via Neon

- **Auto-scaling compute** — scales to zero when idle, wakes instantly on first connection
- **Built-in connection pooling** — handles bursty traffic without exhausting database limits
- **Database branching** — safe, isolated schema migrations without touching production
- **SSL-enforced** — all connections encrypted in transit
- **Composite indexes** on `(teacher_id, status)` and `(start_time, end_time)` keep the live endpoint an index scan regardless of table size

---

## 🖥️ Local Setup

### Prerequisites

- Node.js v18+, npm v9+
- A free [Neon](https://neon.tech) account with a PostgreSQL database provisioned

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Prateek-glitch/grubpac-backend.git
cd grubpac-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# → Edit .env with your values (see section below)

# 4. Initialise the database schema
node src/db/migrate.js
# or run schema.sql directly in your Neon SQL editor

# 5. Start the development server
npm run dev
# Listening at http://localhost:3000
```

---

## 🔐 Environment Variables

Create `.env` in the project root. **Never commit this file — add it to `.gitignore`.**

```env
# ── Server ──────────────────────────────────────────────────────────────────
PORT=3000

# ── Database (Neon PostgreSQL) ───────────────────────────────────────────────
# Paste from: Neon Dashboard → Your Project → Connection Details
DATABASE_URL=postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require

# ── JWT ─────────────────────────────────────────────────────────────────────
# Generate a strong secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_char_cryptographically_random_hex_string
JWT_EXPIRES_IN=24h

# ── File Uploads ─────────────────────────────────────────────────────────────
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

---

## 📚 API Documentation

**Base URL:** `https://grubpac-backend-pk37.onrender.com`

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

---

### 🔑 Auth — Public

#### `POST /auth/register`

Register a new `teacher` or `principal` account.

**Body:**
```json
{
  "name": "Prateek Kumar",
  "email": "prateek@school.com",
  "password": "SecurePass123!",
  "role": "teacher"
}
```

| Status | Meaning |
|---|---|
| `201` | Registered successfully |
| `409` | Email already exists |
| `400` | Missing or invalid fields |

---

#### `POST /auth/login`

Authenticate and receive a signed JWT.

**Body:**
```json
{ "email": "prateek@school.com", "password": "SecurePass123!" }
```

**Success:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Status | Meaning |
|---|---|
| `200` | Token returned |
| `401` | Invalid credentials |

---

### 🎓 Teacher — Role: `teacher`

#### `POST /teacher/upload`

Upload a media item with a scheduled broadcast window.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | ✅ | Display title |
| `start_time` | `ISO 8601` | ✅ | Broadcast window open |
| `end_time` | `ISO 8601` | ✅ | Broadcast window close |
| `duration` | `integer` | ✅ | Display time in **seconds** — drives rotation |
| `image` | `file` | ✅ | JPEG or PNG · max 10 MB |

**Success:**
```json
{ "message": "Content uploaded successfully, pending approval", "contentId": 14 }
```

| Status | Meaning |
|---|---|
| `201` | Uploaded, awaiting principal review |
| `400` | Wrong MIME type or file too large |
| `401` / `403` | Auth failure |

---

#### `GET /teacher/my-content`

List all content uploaded by the authenticated teacher with current approval status.

---

### 🏫 Principal — Role: `principal`

#### `GET /principal/pending`

Retrieve all submissions across all teachers that are awaiting review.

---

#### `PATCH /principal/review/:contentId`

Set the status of a specific content item.

**Body:**
```json
{ "status": "approved" }
```
> `status` must be `"approved"` or `"rejected"`

| Status | Meaning |
|---|---|
| `200` | Status updated |
| `400` | Invalid status value |
| `404` | Content ID not found |
| `401` / `403` | Auth failure |

---

### 🌐 Public Live Feed — No auth required

#### `GET /live/:teacherId`

Returns the **currently active approved item** for the given teacher, with automatic time-sliced rotation when multiple items share the same broadcast window. Safe to cache at CDN level — all clients at the same second receive an identical response.

**Success:**
```json
{
  "teacherId": 3,
  "title": "Lunch Special — Pasta Primavera",
  "image_url": "/uploads/1722499200000-lunch.jpg",
  "duration": 30,
  "start_time": "2025-08-01T11:00:00.000Z",
  "end_time": "2025-08-01T14:00:00.000Z",
  "slot_index": 1
}
```

| Status | Meaning |
|---|---|
| `200` | Active content returned |
| `404` | No approved content live for this teacher right now |

---

## ⏱️ Scheduling & Rotation Algorithm

### Step 1 — SQL time-window filter

```sql
SELECT * FROM content
WHERE teacher_id = $1
  AND status      = 'approved'
  AND start_time <= NOW()
  AND end_time   >= NOW()
ORDER BY id ASC;
```

Only rows whose **entire broadcast window contains the current timestamp** are returned.

### Step 2 — Single item (trivial)

If exactly one item passes the filter, return it immediately.

### Step 3 — Multiple items: modulo time-slicing

```js
const nowSeconds = Math.floor(Date.now() / 1000);
const totalCycle = activeItems.reduce((sum, item) => sum + item.duration, 0);
const cyclePos   = nowSeconds % totalCycle;

let elapsed = 0, currentItem = null;
for (const item of activeItems) {
  elapsed += item.duration;
  if (cyclePos < elapsed) { currentItem = item; break; }
}
```

**Worked example — 3 simultaneously active items:**

```
Total cycle = 20 + 30 + 10 = 60 seconds

 0s ──────────── 20s ─────────────────────── 50s ──── 60s
 │   Item A (20s) │       Item B (30s)        │  C(10) │
 └────────────────┴───────────────────────────┴────────┘

nowSeconds % 60 = 37  →  falls in Item B's slot (20–49)  →  return Item B
```

**Why this design:**

- Zero server state — purely a function of the current Unix second
- Every client at the same second gets the **identical response** → CDN-safe
- Items with longer `duration` occupy proportionally larger cycle windows
- No cron jobs, no background workers, no external queues

---

## 🗄️ Database Schema

![ER Diagram](https://github.com/Prateek-glitch/grubpac-backend/blob/main/ER.png?raw=true)

```sql
-- Users table (teachers and principals)
CREATE TABLE users (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  email       VARCHAR(255)  UNIQUE NOT NULL,
  password    VARCHAR(255)  NOT NULL,                    -- bcrypt hash, 12 rounds
  role        VARCHAR(50)   NOT NULL
              CHECK (role IN ('teacher', 'principal')),
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Content table
CREATE TABLE content (
  id          SERIAL        PRIMARY KEY,
  teacher_id  INTEGER       NOT NULL
              REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255)  NOT NULL,
  image_url   VARCHAR(500)  NOT NULL,
  status      VARCHAR(50)   NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  start_time  TIMESTAMPTZ   NOT NULL,
  end_time    TIMESTAMPTZ   NOT NULL,
  duration    INTEGER       NOT NULL CHECK (duration > 0),   -- seconds
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Indexes optimising the /live/:teacherId hot path
CREATE INDEX idx_content_teacher_status ON content(teacher_id, status);
CREATE INDEX idx_content_time_window    ON content(start_time, end_time);
```

**Relationship:** `users (1) ──< content (many)` — one teacher can have many content items; each content item belongs to exactly one teacher.

---

## 📁 Project Structure

```
grubpac-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── teacherController.js
│   │   ├── principalController.js
│   │   └── publicController.js
│   ├── middleware/
│   │   ├── authenticateToken.js     # JWT verification
│   │   ├── authorizeRole.js         # Role whitelist check
│   │   └── uploadMiddleware.js      # Multer config
│   ├── routes/
│   │   ├── auth.js
│   │   ├── teacher.js
│   │   ├── principal.js
│   │   └── public.js
│   ├── db/
│   │   ├── index.js                 # pg Pool initialisation
│   │   └── schema.sql
│   └── app.js
├── uploads/                         # Multer destination (gitignored)
├── ER.png                           # Entity relationship diagram
├── pstman1.png                      # Postman collection screenshot
├── GrubPac_API_Submission.json      # ← Import this into Postman
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🔒 Security Notes

| Concern | Mitigation |
|---|---|
| **Password storage** | bcrypt, 12 salt rounds — plaintext never persisted |
| **Token integrity** | HS256 JWT signed with 64-char secret, 24h expiry |
| **SQL injection** | Parameterised `$1, $2` placeholders throughout — no string interpolation |
| **File upload abuse** | MIME-type filter + 10 MB cap enforced at Multer layer before disk write |
| **Static file exposure** | `/uploads` served as files only — directory listing disabled |
| **Secret management** | Use Render's secret environment variable UI — never commit `.env` |

---

<div align="center">

---

Built with Node.js &nbsp;·&nbsp; Express &nbsp;·&nbsp; PostgreSQL (Neon) &nbsp;·&nbsp; JWT &nbsp;·&nbsp; Multer

**Prateek Kumar** &nbsp;·&nbsp; GrubPac Content Broadcasting System &nbsp;·&nbsp; Backend Engineering Hackathon

[![Live API](https://img.shields.io/badge/Live%20API-grubpac--backend--pk37.onrender.com-46E3B7?style=flat-square&logo=render&logoColor=black)](https://grubpac-backend-pk37.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Prateek--glitch%2Fgrubpac--backend-181717?style=flat-square&logo=github)](https://github.com/Prateek-glitch/grubpac-backend)

</div>
