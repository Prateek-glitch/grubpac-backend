# GrubPac Content Broadcasting System — API Documentation

**Project:** GrubPac Content Broadcasting System (Backend)  
**Author:** Prateek Kumar  
**Roles:** `teacher`, `principal`, `public`  
**Base URL (Production):** https://grubpac-backend-pk37.onrender.com  
**Auth Type:** JWT Bearer (stateless RBAC)

> Note: A Postman collection for one‑click testing is included in the repository (e.g., `GrubPac_API_Submission.json` / `grubPac_assignment_postman.json`).  
> If you publish Postman Docs, add the public docs link here: **[PLACEHOLDER — Postman Docs URL]**

---

## Table of Contents

1. Introduction & Overview  
2. Authentication Guide (JWT Bearer)  
3. Quickstart (Try It Now)  
4. Endpoint Reference  
   - Auth  
   - Teacher  
   - Principal  
   - Public Live Broadcast  
5. Scheduling & Rotation Engine (Core Logic)  
6. Error Codes Reference  
7. Data Models (Response Shapes)  

---

## 1) Introduction & Overview

GrubPac is a backend-only system where teachers upload subject-based image content (e.g., Maths/Science materials). Uploaded content must be reviewed by a principal. Once **approved** and within the teacher-defined schedule window, content becomes eligible for broadcasting to students via a **public endpoint**.

### Role Summary

- **Teacher**
  - Upload content (image + metadata)
  - View own content + statuses (pending/approved/rejected)

- **Principal**
  - View all content across teachers
  - Approve / Reject with a reason

- **Public**
  - Students (or any consumer) call `GET /live/:teacherId`
  - Receives only currently active, approved content for that teacher
  - No authentication required

---

## 2) Authentication Guide (JWT Bearer)

Protected endpoints require a JWT in the `Authorization` header.

### Login Flow

1. Call `POST /auth/login` with email + password.
2. Receive a JWT token string in the response.
3. Attach it to every protected request:

**Header**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### Token Expiry

- Tokens are stateless; if a token expires:
  - API returns **401 Unauthorized**
  - Client must re-login and obtain a new token.

---

## 3) Quickstart (Try It Now)

Get from zero → working call in under 2 minutes:

### Step 1 — Register (Teacher)
**POST** `/auth/register`

**Request Body (JSON)**
```json
{
  "name": "Teacher One",
  "email": "teacher1@school.com",
  "password": "SecurePass123!",
  "role": "teacher"
}
```

### Step 2 — Login
**POST** `/auth/login`

**Request Body (JSON)**
```json
{
  "email": "teacher1@school.com",
  "password": "SecurePass123!"
}
```

Copy the `token` from the response.

### Step 3 — Upload Content (Teacher)
**POST** `/teacher/content` (multipart/form-data)

**Headers**
```
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
```

**Fields**
- `title` (required)
- `subject` (required)
- `start_time` (required to go live)
- `end_time` (required to go live)
- `duration` (minutes; recommended)
- `file` (jpg/png, <= 10MB)

### Step 4 — Approve (Principal)
Login as principal, then approve the content:
**PATCH** `/principal/content/:contentId/approve`

### Step 5 — Fetch Live Content (Public)
**GET** `/live/:teacherId` (no auth)

If live content exists, you’ll get the currently active item (rotation applied).  
If none exists: `{ "message": "No content available" }`

---

## 4) Endpoint Reference

All endpoints below are shown with production URLs.

Base URL: `https://grubpac-backend-pk37.onrender.com`

---

### AUTH

#### 4.1 POST `/auth/register`

**POST**  
`https://grubpac-backend-pk37.onrender.com/auth/register`

Create a new user account. Roles are strictly enforced: `teacher` or `principal`.

**Request Body (application/json)**

| Field | Type | Required | Description |
|------|------|----------|-------------|
| name | string | yes | User’s name |
| email | string | yes | Must be unique |
| password | string | yes | Recommended min 8 chars |
| role | string | yes | `teacher` or `principal` |

**Example Request**
```json
{
  "name": "Prateek",
  "email": "prateek@school.com",
  "password": "SecurePass123!",
  "role": "teacher"
}
```

**Example Response — 201 Created**
```json
{
  "message": "User registered successfully"
}
```

**Response Codes**
- 201 — Created
- 400 — Bad Request (missing/invalid fields)
- 409 — Conflict (email already exists)

---

#### 4.2 POST `/auth/login`

**POST**  
`https://grubpac-backend-pk37.onrender.com/auth/login`

Authenticate a user and return a signed JWT.

**Request Body (application/json)**

| Field | Type | Required | Description |
|------|------|----------|-------------|
| email | string | yes | Registered email |
| password | string | yes | Account password |

**Example Request**
```json
{
  "email": "prateek@school.com",
  "password": "SecurePass123!"
}
```

**Example Response — 200 OK**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Codes**
- 200 — OK
- 400 — Bad Request
- 401 — Unauthorized

---

### TEACHER (Protected: teacher)

All teacher endpoints require:

**Header**
```
Authorization: Bearer <JWT>
```

#### 4.3 POST `/teacher/content` — Upload Content

**POST**  
`https://grubpac-backend-pk37.onrender.com/teacher/content`

Upload an image content item for a subject. Content is non-public until approved by principal, and only goes live within `start_time` / `end_time`.

**Headers**
```
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
```

**Form Fields (multipart/form-data)**

| Field | Type | Required | Description |
|------|------|----------|-------------|
| title | string | yes | Content title |
| subject | string | yes | e.g., `maths`, `science` |
| description | string | no | Optional description |
| start_time | string (ISO datetime) | yes* | Required for live visibility |
| end_time | string (ISO datetime) | yes* | Required for live visibility |
| duration | number (minutes) | no | Rotation slice duration |
| file | file | yes | JPEG/PNG only, <= 10MB |


* Without `start_time` and `end_time`, content is considered **not scheduled** and will never appear in `/live/:teacherId` even if approved.

**Example (cURL)**
```bash
curl -X POST "https://grubpac-backend-pk37.onrender.com/teacher/content" \
  -H "Authorization: Bearer <JWT>" \
  -F "title=Maths Unit Test" \
  -F "subject=maths" \
  -F "description=Class 8 practice paper" \
  -F "start_time=2026-04-28T05:00:00.000Z" \
  -F "end_time=2026-04-28T10:00:00.000Z" \
  -F "duration=5" \
  -F "file=@/path/to/image.png"
```

**Response Codes**
- 201 — Created
- 400 — Bad Request
- 401 — Unauthorized
- 403 — Forbidden (wrong role)
- 413 — Payload Too Large (>10MB)
- 415 — Unsupported Media Type (not jpg/png)

---

#### 4.4 GET `/teacher/content` — List Own Content

**GET**  
`https://grubpac-backend-pk37.onrender.com/teacher/content`

Returns teacher’s content list including status and rejection reason (if any).

**Headers**
```
Authorization: Bearer <JWT>
```

**Response Codes**
- 200 — OK
- 401 — Unauthorized
- 403 — Forbidden

---

### PRINCIPAL (Protected: principal)

All principal endpoints require:

**Header**
```
Authorization: Bearer <JWT>
```

#### 4.5 GET `/principal/content` — View All Content

**GET**  
`https://grubpac-backend-pk37.onrender.com/principal/content`

Fetch all content across all teachers.

**Response Codes**
- 200 — OK
- 401 — Unauthorized
- 403 — Forbidden

---

#### 4.6 GET `/principal/content/pending` — View Pending Content

**GET**  
`https://grubpac-backend-pk37.onrender.com/principal/content/pending`

Lists only content currently in `pending` status.

**Response Codes**
- 200 — OK
- 401 — Unauthorized
- 403 — Forbidden

---

#### 4.7 PATCH `/principal/content/:contentId/approve` — Approve Content

**PATCH**  
`https://grubpac-backend-pk37.onrender.com/principal/content/:contentId/approve`

Approves a content item.

**URL Params**
| Param | Type | Required | Description |
|------|------|----------|-------------|
| contentId | string | yes | Content ID |

**Response Codes**
- 200 — OK
- 401 — Unauthorized
- 403 — Forbidden
- 404 — Not Found
- 409 — Conflict (invalid transition, if enforced)

---

#### 4.8 PATCH `/principal/content/:contentId/reject` — Reject Content

**PATCH**  
`https://grubpac-backend-pk37.onrender.com/principal/content/:contentId/reject`

Rejects content and stores a reason (required).

**URL Params**
| Param | Type | Required | Description |
|------|------|----------|-------------|
| contentId | string | yes | Content ID |

**Request Body (application/json)**
| Field | Type | Required | Description |
|------|------|----------|-------------|
| rejection_reason | string | yes | Reason visible to teacher |

**Example Request**
```json
{
  "rejection_reason": "Image is unclear. Please upload a higher-resolution copy."
}
```

**Response Codes**
- 200 — OK
- 400 — Bad Request (missing reason)
- 401 — Unauthorized
- 403 — Forbidden
- 404 — Not Found

---

### PUBLIC (No Auth)

#### 4.9 GET `/live/:teacherId` — Live Content (Scheduling + Rotation)

**GET**  
`https://grubpac-backend-pk37.onrender.com/live/:teacherId`

Public endpoint. Returns the **currently active** approved media item for a teacher. If multiple items are active simultaneously, it rotates them automatically based on `duration`.

**URL Params**
| Param | Type | Required | Description |
|------|------|----------|-------------|
| teacherId | string/number | yes | Teacher’s user ID |

**Example Request**
```
GET https://grubpac-backend-pk37.onrender.com/live/3
```

**Example Response — 200 OK**
```json
{
  "teacherId": 3,
  "title": "Maths - Unit Test Paper",
  "image_url": "/uploads/1722499200000-maths.png",
  "duration": 5,
  "start_time": "2026-04-28T05:00:00.000Z",
  "end_time": "2026-04-28T10:00:00.000Z",
  "slot_index": 1
}
```

**Empty Response (No Content Available)**
```json
{
  "message": "No content available"
}
```

**Response Codes**
- 200 — OK (active content or “No content available”, depending on implementation)
- 404 — Not Found (some implementations use 404 when none is live)

---

## 5) Scheduling & Rotation Engine (Core Logic)

### Eligibility Filtering

From content uploaded by `teacherId`, the system considers a content item eligible only if:

- `status = 'approved'`
- `start_time` and `end_time` exist
- current time satisfies: `start_time <= now <= end_time`

If no items pass → return **No content available**.

### Rotation (Modulo Time Slicing)

When multiple eligible items exist:

1. Sort eligible items deterministically (stable ordering).
2. Convert durations to seconds:
   - `durationSeconds = durationMinutes * 60`
3. Compute total cycle time:
   - `cycleSeconds = sum(durationSeconds)`
4. Compute current offset:
   - `offset = nowEpochSeconds % cycleSeconds`
5. Return the item whose cumulative duration slice contains `offset`.

Benefits:
- No background jobs needed
- Deterministic rotation across clients
- Continuous looping as long as items remain eligible

---

## 6) Error Codes Reference

| Status | Meaning | Typical Causes |
|-------:|---------|----------------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Missing/invalid fields |
| 401 | Unauthorized | Missing/invalid/expired JWT, invalid login |
| 403 | Forbidden | Role not allowed |
| 404 | Not Found | Missing resource or no live content (if implemented) |
| 409 | Conflict | Duplicate email, invalid state transition |
| 413 | Payload Too Large | Upload exceeds 10MB |
| 415 | Unsupported Media Type | File not JPEG/PNG |
| 500 | Internal Server Error | Unhandled server error |

---

## 7) Data Models (Response Shapes)

### User (typical)
```json
{
  "id": "uuid-or-int",
  "name": "Teacher One",
  "email": "teacher1@school.com",
  "role": "teacher",
  "created_at": "2026-04-28T00:00:00.000Z"
}
```

### Content (typical)
```json
{
  "id": "uuid-or-int",
  "title": "Maths - Unit Test Paper",
  "description": "Class 8 practice paper",
  "subject": "maths",
  "file_url": "/uploads/abc123.png",
  "file_type": "image/png",
  "file_size": 123456,
  "uploaded_by": "teacher-id",
  "status": "pending",
  "rejection_reason": null,
  "approved_by": null,
  "approved_at": null,
  "start_time": "2026-04-28T05:00:00.000Z",
  "end_time": "2026-04-28T10:00:00.000Z",
  "duration": 5,
  "created_at": "2026-04-28T00:00:00.000Z"
}
```