# CareOps — Unified Operations Platform

> One platform for leads, bookings, communications, forms, inventory, and team management — purpose-built for service businesses (clinics, salons, fitness studios, veterinary practices, and more).

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Prisma 7 (PostgreSQL) · NextAuth v5 · Google Gemini AI · Gmail API · Twilio SMS · Tailwind CSS 4 · shadcn/ui · Vercel

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Project Structure](#project-structure)
3. [Authentication Flow](#authentication-flow)
4. [Page-by-Page Breakdown](#page-by-page-breakdown)
5. [API Routes Reference](#api-routes-reference)
6. [AI Integration (Google Gemini)](#ai-integration-google-gemini)
7. [External APIs & Third-Party Integrations](#external-apis--third-party-integrations)
8. [Database Schema (Prisma / PostgreSQL)](#database-schema-prisma--postgresql)
9. [Automation Engine](#automation-engine)
10. [Messaging Channels Architecture](#messaging-channels-architecture)
11. [Environment Variables](#environment-variables)
12. [Local Development Setup](#local-development-setup)
13. [Production Deployment (Vercel)](#production-deployment-vercel)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                       │
│  Landing Page · Auth Pages · Onboarding Wizard · Workspace App   │
│  Public Booking/Contact Pages · Form Submission Pages            │
├──────────────────────────┬──────────────────────────────────────┤
│       Next.js App Router │  Route Groups: (auth), (app), (public)│
├──────────────────────────┴──────────────────────────────────────┤
│                     API Layer (Route Handlers)                    │
│  /api/auth/* · /api/workspaces/* · /api/public/* · /api/oauth/*  │
├───────────┬──────────┬──────────┬──────────┬────────────────────┤
│  Prisma   │ NextAuth │ Gemini   │ Gmail    │ Twilio             │
│  (DB)     │ (Auth)   │ (AI)     │ (Email)  │ (SMS)              │
├───────────┴──────────┴──────────┴──────────┴────────────────────┤
│                    PostgreSQL (via Neon/Supabase)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **Route Groups**: `(auth)` for login/register, `(app)` for authenticated workspace pages (protected by layout-level auth guards), `(public)` for customer-facing booking/contact/form pages.
- **Multi-tenant by design**: Every data entity is scoped to a `workspaceId`. Users access workspaces via `/w/[slug]/*`.
- **Channel abstraction**: Email and SMS sending goes through a unified `sendMessage()` dispatcher (`src/lib/channels/index.ts`) that resolves the correct provider (Gmail, Twilio, or mock fallbacks).
- **Event-driven automations**: All significant actions (lead created, booking created/confirmed/cancelled, form submitted) fire through `logEvent()` → `runAutomations()`, which evaluates `AutomationRule` records and sends templated messages.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Login & Register pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx           # Centered card layout with hero background
│   ├── (app)/                   # Authenticated application
│   │   ├── onboarding/page.tsx  # 7-step workspace setup wizard
│   │   └── w/[slug]/            # Workspace pages
│   │       ├── layout.tsx       # Sidebar + auth guard (requireWorkspaceMember)
│   │       ├── dashboard/page.tsx
│   │       ├── bookings/page.tsx
│   │       ├── inbox/page.tsx
│   │       ├── forms/page.tsx
│   │       ├── inventory/page.tsx
│   │       ├── staff/page.tsx
│   │       └── settings/page.tsx
│   ├── (public)/                # Customer-facing pages (no auth)
│   │   ├── b/[slug]/            # Public workspace portal
│   │   │   ├── page.tsx         # Landing with "Book" & "Contact" CTAs
│   │   │   ├── book/page.tsx    # Public booking form
│   │   │   ├── contact/page.tsx # Public contact form
│   │   │   └── booking/[publicToken]/forms/page.tsx
│   │   └── forms/[publicToken]/page.tsx  # Post-booking form submission
│   ├── api/                     # API route handlers (28 routes)
│   │   ├── auth/                # NextAuth + registration
│   │   ├── oauth/google/        # Gmail OAuth initiate + callback
│   │   ├── public/              # Unauthenticated endpoints (booking, contact, forms, SMS)
│   │   └── workspaces/          # All workspace CRUD + sub-resources
│   ├── page.tsx                 # Root: landing page or redirect to workspace
│   └── layout.tsx               # Root layout (Geist fonts, metadata)
├── components/
│   ├── bookings/                # BookingsContent (table + status management)
│   ├── dashboard/               # DashboardContent (stat cards, alerts, charts)
│   ├── forms/                   # FormsContent (form definition CRUD)
│   ├── inbox/                   # InboxContent + ConversationThread (messaging UI)
│   ├── inventory/               # InventoryContent (stock tracking, transactions)
│   ├── layout/                  # Sidebar + Header
│   ├── onboarding/              # 7 wizard step components
│   ├── public/                  # BookingForm, ContactForm, FormFill
│   ├── settings/                # SettingsContent (workspace settings, channel management)
│   ├── staff/                   # StaffContent (team member management)
│   ├── ui/                      # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── landing-page.tsx         # Marketing landing page
│   └── interactive-bg.tsx       # Canvas particle animation background
├── lib/
│   ├── auth.ts                  # NextAuth v5 config (Credentials provider, JWT strategy)
│   ├── auth-utils.ts            # requireAuth, requireWorkspaceMember, apiAuth helpers
│   ├── db.ts                    # Prisma client (PrismaPg adapter, singleton pattern)
│   ├── gemini.ts                # Google Gemini AI client (gemini-2.0-flash model)
│   ├── events.ts                # Event logging + automation engine
│   ├── workspace.ts             # Workspace lookup + slug generation helpers
│   ├── utils.ts                 # cn() utility (clsx + tailwind-merge)
│   └── channels/
│       ├── index.ts             # Channel dispatcher + mock providers
│       ├── gmail.ts             # Gmail API integration (OAuth2, send via REST)
│       └── twilio.ts            # Twilio SMS integration (REST API)
├── generated/prisma/            # Prisma-generated client code
prisma/
└── schema.prisma                # Database schema (20 models, 7 enums)
```

---

## Authentication Flow

**Implementation:** NextAuth v5 (`next-auth@5.0.0-beta.30`) with the **Credentials provider** and **JWT session strategy**.

**File:** `src/lib/auth.ts`

### Registration (`POST /api/auth/register`)

1. Client sends `{ name, email, password }` from `RegisterPage` component.
2. Server validates uniqueness, hashes password with `bcryptjs` (10 salt rounds), creates `User` in database.
3. On success, client auto-signs in via `signIn("credentials", ...)` and redirects to `/`.

### Login (`/login`)

1. Client calls `signIn("credentials", { email, password, redirect: false })`.
2. NextAuth `authorize()` callback: looks up user by email, compares bcrypt hash.
3. On success, a JWT is issued with the user's `id` embedded via the `jwt` callback.
4. The `session` callback attaches `user.id` to the session object.

### Session Management

- **Strategy:** JWT (stateless, no database sessions).
- **Secret:** `AUTH_SECRET` environment variable.
- **Custom sign-in page:** `/login`.

### Route Protection

| Layer | Function | File |
|-------|----------|------|
| Layout-level (SSR) | `auth()` in `(app)/layout.tsx` redirects to `/login` | `src/app/(app)/layout.tsx` |
| Page-level (SSR) | `requireWorkspaceMember(workspaceId)` | `src/lib/auth-utils.ts` |
| API-level | `apiAuth()` → 401 if no session | `src/lib/auth-utils.ts` |
| API-level | `apiRequireWorkspaceMember(workspaceId)` → 403 if not member | `src/lib/auth-utils.ts` |
| API-level | `apiRequireOwner(workspaceId)` → 403 if not OWNER role | `src/lib/auth-utils.ts` |

### Google OAuth (Gmail Integration — not for user login)

Google OAuth is used exclusively for **connecting a workspace's Gmail account** for sending emails, not for user authentication.

1. **Initiate** (`GET /api/oauth/google/initiate?workspaceId=...`): Generates a state token (base64-encoded JSON with nonce, workspaceId, userId), saves it in an httpOnly cookie, and redirects to Google's OAuth consent screen requesting `gmail.send` and `gmail.readonly` scopes.
2. **Callback** (`GET /api/oauth/google/callback`): Validates state, exchanges the authorization code for tokens, fetches the user's email from Google's userinfo endpoint, and upserts a `ChannelAccount` record (provider: `"google"`) with the access/refresh tokens stored in the `config` JSON field.

---

## Page-by-Page Breakdown

### Root Page (`/`)
**File:** `src/app/page.tsx`

- **Unauthenticated:** Renders `LandingPage` component (marketing page with feature cards, onboarding steps, CTAs).
- **Authenticated + has workspace:** Redirects to `/w/[slug]/dashboard`.
- **Authenticated + no workspace:** Redirects to `/onboarding`.

### Login (`/login`)
**File:** `src/app/(auth)/login/page.tsx`

Client-side form using `signIn("credentials")` from `next-auth/react`. On success, redirects to `/`. Displays error messages for invalid credentials.

### Register (`/register`)
**File:** `src/app/(auth)/register/page.tsx`

Client-side form that `POST`s to `/api/auth/register`, then auto-signs in. Validates password length (≥6) and confirmation match on the client.

### Onboarding (`/onboarding`)
**File:** `src/app/(app)/onboarding/page.tsx`

A **7-step wizard** that guides workspace creation:

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | `WorkspaceStep` | Create workspace (name, slug, address, timezone, contact email) |
| 2 | `ChannelsStep` | Connect Gmail (via Google OAuth) and/or configure Twilio SMS |
| 3 | `BookingTypesStep` | Add appointment types (AI-suggested or manual) |
| 4 | `FormsStep` | Create intake forms with dynamic fields (AI-suggested or manual) |
| 5 | `InventoryStep` | Add inventory items (AI-suggested or manual) — **skippable** |
| 6 | `StaffStep` | Invite team members via email — **skippable** |
| 7 | `ActivateStep` | Review readiness checklist and activate workspace (changes status from DRAFT → ACTIVE) |

Steps 3, 4, and 5 leverage **Gemini AI** to auto-suggest contextually relevant data based on the business name.

### Dashboard (`/w/[slug]/dashboard`)
**File:** `src/app/(app)/w/[slug]/dashboard/page.tsx` → `DashboardContent`

Fetches aggregated stats from `GET /api/workspaces/[id]/dashboard`:
- **Stat cards:** Today's bookings, upcoming bookings, new leads, pending forms.
- **Alerts panel:** Unanswered leads, pending/overdue forms, low-stock inventory items, upcoming bookings.
- **Completion rate:** Booking completion percentage with progress bar.

### Bookings (`/w/[slug]/bookings`)
**File:** `src/app/(app)/w/[slug]/bookings/page.tsx` → `BookingsContent`

- Fetches all bookings from `GET /api/workspaces/[id]/bookings`.
- **Tabbed filtering:** All, Upcoming, Confirmed, Completed, No-Show, Cancelled.
- **Status transitions** via dropdown actions → `PATCH /api/workspaces/[id]/bookings/[bookingId]`.
- Status changes trigger `logEvent()` → automation rules (e.g., send confirmation/cancellation emails).
- **Copy public booking link** button generates `{origin}/b/[slug]`.

### Inbox (`/w/[slug]/inbox`)
**File:** `src/app/(app)/w/[slug]/inbox/page.tsx` → `InboxContent` + `ConversationThread`

- **Left panel:** Conversation list (fetched from `GET /api/workspaces/[id]/conversations`) with customer name, subject, last message preview, and timestamp.
- **Right panel:** Selected conversation thread showing all messages (inbound/outbound, email/SMS).
- **Reply:** Owner can reply via Email or SMS through `POST /api/workspaces/[id]/conversations/[conversationId]/reply`.
- **Gmail sync:** If a conversation has a `gmailThreadId`, the UI can sync replies from Gmail via `POST .../sync`.
- **AI Reply Suggestions:** Sends conversation context to Gemini AI for suggested reply text.

### Forms (`/w/[slug]/forms`)
**File:** `src/app/(app)/w/[slug]/forms/page.tsx` → `FormsContent`

- **Tabs:** "Form Templates" (manage form definitions) and "Pending Submissions" (track assigned forms).
- CRUD operations for `FormDefinition` records via `/api/workspaces/[id]/forms`.
- Each form has dynamic JSON `fields` (text, textarea, select, checkbox, date).
- Pending assignments fetched from `/api/workspaces/[id]/forms/pending`.
- **Resend form link** via `POST .../pending/[assignmentId]/resend` (sends SMS with form URL).

### Inventory (`/w/[slug]/inventory`)
**File:** `src/app/(app)/w/[slug]/inventory/page.tsx` → `InventoryContent`

- Lists all inventory items with quantity, threshold, and low-stock badges.
- **Add stock / Remove stock** actions via `PATCH /api/workspaces/[id]/inventory/[itemId]` (creates `InventoryTransaction` records).
- Add new items via `POST /api/workspaces/[id]/inventory`.
- Low-stock items highlighted with warning badges.

### Staff (`/w/[slug]/staff`)
**File:** `src/app/(app)/w/[slug]/staff/page.tsx` → `StaffContent`

- Lists workspace members with roles (OWNER / STAFF).
- **Invite staff** via `POST /api/workspaces/[id]/staff` — requires email of an existing registered user.
- Sends invitation email via the workspace's configured email channel.

### Settings (`/w/[slug]/settings`)
**File:** `src/app/(app)/w/[slug]/settings/page.tsx` → `SettingsContent`

- View/manage connected channels (Gmail, Twilio).
- Connect/reconnect Gmail via OAuth flow.
- View automation rules configured for the workspace.

### Public Workspace Portal (`/b/[slug]`)
**File:** `src/app/(public)/b/[slug]/page.tsx`

Public landing page for a workspace (only shown if workspace status is `ACTIVE`). Shows business name, address, and two CTAs: **Book an Appointment** and **Contact Us**.

### Public Booking (`/b/[slug]/book`)
**File:** `src/app/(public)/b/[slug]/book/page.tsx` → `BookingForm`

- Fetches active booking types for the workspace.
- Multi-step form: select service → pick date → pick time slot → enter customer details.
- Available slots computed by querying `GET /api/public/booking/slots` (filters out already-booked times).
- Timezone-aware: slots displayed in the workspace's configured timezone.
- On submit → `POST /api/public/booking` → creates Customer, Booking, Conversation, Message, FormAssignments, sends SMS confirmation, triggers automations.

### Public Contact (`/b/[slug]/contact`)
**File:** `src/app/(public)/b/[slug]/contact/page.tsx` → `ContactForm`

- Simple form: name, email, phone, message.
- On submit → `POST /api/public/contact` → creates Customer, Lead, Conversation, Message, triggers `LEAD_CREATED` automation.

### Post-Booking Forms (`/forms/[publicToken]`)
**File:** `src/app/(public)/forms/[publicToken]/page.tsx` → `FormFill`

- Looks up the booking by `publicToken`, fetches assigned forms via `GET /api/public/forms/[publicToken]`.
- Renders each form's dynamic fields (from the `FormDefinition.fields` JSON).
- On submit → `POST /api/public/forms/[publicToken]` → creates `FormSubmission`, updates assignment status, triggers `FORM_SUBMITTED` event.

---

## API Routes Reference

### Authentication

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET/POST` | `/api/auth/[...nextauth]` | — | NextAuth handler (login, session, CSRF) |
| `POST` | `/api/auth/register` | — | User registration (name, email, password) |

### Google OAuth (Gmail Connection)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/oauth/google/initiate?workspaceId=` | Yes | Redirects to Google OAuth consent screen |
| `GET` | `/api/oauth/google/callback` | Yes | Handles OAuth callback, stores tokens in `ChannelAccount` |

### Public Endpoints (No Auth Required)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/public/booking` | Create a booking (from public booking form) |
| `GET` | `/api/public/booking/slots?workspaceSlug&bookingTypeId&date` | Get booked time slots for a date |
| `POST` | `/api/public/contact` | Submit a contact/lead form |
| `GET` | `/api/public/forms/[publicToken]` | Get form assignments for a booking |
| `POST` | `/api/public/forms/[publicToken]` | Submit a form response |
| `POST` | `/api/public/sms/inbound` | Twilio webhook for inbound SMS messages |

### Workspace Management

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/workspaces` | User | Create a new workspace (auto-generates slug, creates OWNER membership) |
| `GET` | `/api/workspaces/[workspaceId]` | Member | Get workspace details with channels, booking types, members, forms |
| `POST` | `/api/workspaces/[workspaceId]/activate` | Owner | Activate workspace (DRAFT → ACTIVE), auto-links forms to booking types, seeds default automation rules |

### Workspace Sub-Resources

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/workspaces/[id]/dashboard` | Member | Aggregated dashboard stats (bookings, leads, forms, inventory) |
| `POST` | `/api/workspaces/[id]/ai-suggest` | Member | AI-powered suggestions for booking types, forms, or inventory |
| `GET/POST` | `/api/workspaces/[id]/booking-types` | Member/Owner | List / create booking types |
| `GET` | `/api/workspaces/[id]/bookings` | Member | List all bookings with customer and booking type details |
| `PATCH` | `/api/workspaces/[id]/bookings/[bookingId]` | Member | Update booking status (triggers automations for CONFIRMED/CANCELLED) |
| `GET/POST` | `/api/workspaces/[id]/channels` | Member/Owner | List / create channel accounts (Gmail, Twilio, mock) |
| `GET` | `/api/workspaces/[id]/conversations` | Member | List conversations with customers, messages, and linked entities |
| `GET` | `/api/workspaces/[id]/conversations/[cid]` | Member | Get single conversation with all messages |
| `POST` | `/api/workspaces/[id]/conversations/[cid]/reply` | Member | Send a reply (email or SMS) in a conversation |
| `POST` | `/api/workspaces/[id]/conversations/[cid]/sync` | Member | Sync replies from Gmail thread |
| `GET/POST` | `/api/workspaces/[id]/forms` | Member/Owner | List / create form definitions |
| `GET` | `/api/workspaces/[id]/forms/pending` | Member | List pending form assignments |
| `POST` | `/api/workspaces/[id]/forms/pending/[aid]/resend` | Member | Resend form link via SMS |
| `GET/POST` | `/api/workspaces/[id]/inventory` | Member/Owner | List / create inventory items |
| `PATCH` | `/api/workspaces/[id]/inventory/[itemId]` | Member | Adjust stock (add/remove), creates transaction record |
| `GET/POST` | `/api/workspaces/[id]/staff` | Member/Owner | List / invite staff members |

---

## AI Integration (Google Gemini)

### Configuration

**File:** `src/lib/gemini.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
export const gemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
```

- **Model:** `gemini-2.0-flash` (fast, cost-effective)
- **SDK:** `@google/generative-ai` v0.24.1
- **API Key:** `GEMINI_API_KEY` environment variable

### Where AI Is Used

**File:** `src/app/api/workspaces/[workspaceId]/ai-suggest/route.ts`

**Endpoint:** `POST /api/workspaces/[workspaceId]/ai-suggest`

**Request body:** `{ "step": "booking-types" | "forms" | "inventory" }`

**How it works:**

1. Resolves the workspace name from the database.
2. Constructs a system prompt specific to the requested step (booking types, forms, or inventory).
3. Sends `[systemPrompt, "Business name: '{name}'. Generate suggestions."]` to Gemini.
4. Parses the response text, extracts JSON using regex (`/[\[{][\s\S]*[\]}]/`).
5. Returns `{ suggestions: [...] }`.

### Error Handling & Fallback Logic

```
Is GEMINI_API_KEY set?
  ├── Yes → Call Gemini API
  │     ├── Success → Parse JSON response → Return AI suggestions
  │     └── Failure (quota exceeded, network error, invalid JSON)
  │           └── Fall through silently to fallbacks
  └── No → Skip AI entirely
              └── Return hardcoded fallback suggestions
```

**Fallback system** (`detectBusinessType()` in `ai-suggest/route.ts`):

The workspace name is analyzed using regex patterns to detect the business type:

| Pattern | Type | Example Match |
|---------|------|---------------|
| `beauty\|salon\|spa\|hair\|nail\|barber...` | `beauty` | "Glow Beauty Salon" |
| `clinic\|hospital\|doctor\|medical\|health...` | `medical` | "City Health Clinic" |
| `gym\|fitness\|yoga\|pilates\|crossfit...` | `fitness` | "Peak Fitness Studio" |
| `dent\|ortho\|oral` | `dental` | "Smile Dental Care" |
| `vet\|animal\|pet` | `veterinary` | "Happy Paws Vet" |
| (no match) | `default` | "ABC Services" |

Each business type has pre-built fallback data for booking types, form fields, and inventory items — so the onboarding wizard always provides relevant suggestions even without AI.

### AI Reply Suggestion (Inbox)

The `ConversationThread` component in the inbox sends conversation message history to the AI suggest endpoint for generating contextual reply suggestions. The conversation context (messages, customer info) is sent to Gemini, which returns a suggested reply draft.

---

## External APIs & Third-Party Integrations

### 1. Google Gmail API

| Detail | Value |
|--------|-------|
| **Purpose** | Send outbound emails on behalf of the workspace |
| **API endpoint** | `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` |
| **Auth method** | OAuth 2.0 (access token + refresh token) |
| **Scopes** | `gmail.send`, `gmail.readonly`, `openid`, `email`, `profile` |
| **Files** | `src/lib/channels/gmail.ts`, `src/app/api/oauth/google/initiate/route.ts`, `src/app/api/oauth/google/callback/route.ts` |
| **Env vars** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

**Token refresh flow** (`gmail.ts → refreshAccessToken()`):
- Checks if access token is within 60s of expiry.
- If expired, calls `https://oauth2.googleapis.com/token` with the refresh token.
- Updates the `ChannelAccount.config` JSON with the new access token and expiry time.

**Email construction:** Builds RFC 2822 raw email (`From`, `To`, `Subject`, MIME headers) and base64url-encodes it for the Gmail API.

**Thread support:** If an `input.threadId` is provided, the email is sent as a reply in the same Gmail thread.

### 2. Google OAuth 2.0

| Detail | Value |
|--------|-------|
| **Purpose** | Connect workspace's Gmail account for email sending |
| **Auth URL** | `https://accounts.google.com/o/oauth2/v2/auth` |
| **Token URL** | `https://oauth2.googleapis.com/token` |
| **UserInfo URL** | `https://www.googleapis.com/oauth2/v3/userinfo` |
| **Files** | `src/app/api/oauth/google/initiate/route.ts`, `src/app/api/oauth/google/callback/route.ts` |
| **Env vars** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL` |

### 3. Twilio SMS

| Detail | Value |
|--------|-------|
| **Purpose** | Send and receive SMS messages |
| **API endpoint** | `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` |
| **Auth method** | HTTP Basic Auth (`accountSid:authToken` base64-encoded) |
| **Inbound webhook** | `POST /api/public/sms/inbound` (Twilio sends form-urlencoded data) |
| **Files** | `src/lib/channels/twilio.ts`, `src/app/api/public/sms/inbound/route.ts` |
| **Env vars** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |

**Provider resolution:** Twilio credentials can come from either:
1. Per-workspace `ChannelAccount` record (provider: `"twilio"`, config stored as JSON)
2. Global environment variables (`TWILIO_ACCOUNT_SID`, etc.) as fallback

**Inbound SMS flow:**
1. Twilio sends `POST` to `/api/public/sms/inbound` with `From`, `To`, `Body` as form data.
2. Server matches the `To` number against `ChannelAccount.fromNumber` records.
3. Finds the customer by phone number, finds/creates a conversation, saves the message.
4. Returns empty TwiML `<Response></Response>` (required by Twilio).

### 4. Google Generative AI (Gemini)

| Detail | Value |
|--------|-------|
| **Purpose** | AI-powered suggestions during onboarding + inbox reply suggestions |
| **SDK** | `@google/generative-ai` v0.24.1 |
| **Model** | `gemini-2.0-flash` |
| **File** | `src/lib/gemini.ts`, `src/app/api/workspaces/[id]/ai-suggest/route.ts` |
| **Env var** | `GEMINI_API_KEY` |

---

## Database Schema (Prisma / PostgreSQL)

**File:** `prisma/schema.prisma`  
**Database:** PostgreSQL (via `@prisma/adapter-pg` driver adapter)  
**Client output:** `src/generated/prisma/`

### Enums

| Enum | Values |
|------|--------|
| `MemberRole` | `OWNER`, `STAFF` |
| `WorkspaceStatus` | `DRAFT`, `ACTIVE` |
| `ChannelType` | `EMAIL`, `SMS` |
| `MessageDirection` | `INBOUND`, `OUTBOUND` |
| `MessageStatus` | `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `RECEIVED` |
| `BookingStatus` | `REQUESTED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW` |
| `EventType` | `LEAD_CREATED`, `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `FORM_SUBMITTED`, `INVENTORY_LOW`, `MESSAGE_INBOUND` |

### Models & Relationships

```
User ──────── 1:N ──── WorkspaceMember ──── N:1 ──── Workspace
 │                                                       │
 ├── Account (NextAuth)                                  ├── ChannelAccount (Gmail, Twilio, mock)
 ├── Session (NextAuth)                                  ├── BookingType ──── 1:N ──── Booking
 └── VerificationToken                                   ├── Customer ──┬─── 1:N ──── Lead
                                                         │              ├─── 1:N ──── Booking
                                                         │              └─── 1:N ──── Conversation
                                                         ├── Conversation ──── 1:N ──── Message
                                                         ├── FormDefinition ── 1:N ──── FormAssignment
                                                         ├── InventoryItem ─── 1:N ──── InventoryTransaction
                                                         ├── AutomationRule
                                                         └── EventLog
```

### Key Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Application user | email (unique), password (bcrypt hash), name |
| `Workspace` | Multi-tenant workspace | name, slug (unique), status (DRAFT/ACTIVE), timezone, address |
| `WorkspaceMember` | User ↔ Workspace join table | role (OWNER/STAFF), permissions (JSON) |
| `ChannelAccount` | Communication channel config | type (EMAIL/SMS), provider (google/twilio/mock), config (JSON with tokens) |
| `Customer` | End customer (booked or contacted) | name, email, phone — indexed by workspace+email |
| `Lead` | Contact form submission | source, message, status, linked to Customer |
| `Conversation` | Thread of messages | links to Customer, optionally to Lead or Booking; has gmailThreadId for thread replies |
| `Message` | Individual email or SMS | channel, direction, status, fromAddress, toAddress, body, providerRef |
| `BookingType` | Appointment type template | name, durationMin, availability (JSON), linkedFormIds (string array) |
| `Booking` | Scheduled appointment | status, startAt, endAt, publicToken (UUID for public access) |
| `FormDefinition` | Dynamic form template | fields (JSON array of field definitions) |
| `FormAssignment` | Form linked to a booking | status (pending/submitted), sentAt, completedAt |
| `FormSubmission` | Submitted form data | data (JSON), linked 1:1 to FormAssignment |
| `InventoryItem` | Tracked supply/material | quantity, lowStockThreshold, unit |
| `InventoryTransaction` | Stock change record | type (add/remove), delta, note, bookingId |
| `AutomationRule` | Event-triggered action | trigger (EventType), actions (JSON array of send_email/send_sms actions) |
| `EventLog` | Audit log of all events | type, entityType, entityId, payload (JSON) |

---

## Automation Engine

**File:** `src/lib/events.ts`

### How It Works

1. Any significant action calls `logEvent({ workspaceId, type, entityType, entityId, payload })`.
2. `logEvent()` persists an `EventLog` record, then calls `runAutomations()`.
3. `runAutomations()` queries all active `AutomationRule` records matching the trigger `EventType`.
4. For each rule, iterates over `actions` (JSON array):
   - `send_email`: Sends via the channel dispatcher with template-resolved `to`, `subject`, `body`.
   - `send_sms`: Same, via SMS channel.
5. Template variables use `{{variableName}}` syntax, resolved from the event payload (e.g., `{{customerName}}`, `{{customerEmail}}`, `{{bookingType}}`, `{{startAt}}`, `{{formUrl}}`).
6. If the send returns a Gmail `threadId`, it's saved to the conversation's `gmailThreadId` for thread tracking.

### Default Automation Rules (Created on Workspace Activation)

| Rule | Trigger | Action |
|------|---------|--------|
| Welcome message on new lead | `LEAD_CREATED` | Send email + SMS to customer with thank-you message |
| Booking confirmation | `BOOKING_CREATED` | Send email with booking details and form URL |
| Booking confirmed notification | `BOOKING_CONFIRMED` | Send email confirming the booking |
| Booking cancelled notification | `BOOKING_CANCELLED` | Send email notifying cancellation |

---

## Messaging Channels Architecture

**File:** `src/lib/channels/index.ts`

```
sendMessage(input) ─────────────────────────────────────┐
    │                                                    │
    ├── channel === "EMAIL"                              │
    │   ├── ChannelAccount(provider: "google") exists?   │
    │   │   └── Yes → sendViaGmail()                     │
    │   └── No → MockEmailProvider (console.log)         │
    │                                                    │
    ├── channel === "SMS"                                │
    │   ├── ChannelAccount(provider: "twilio") exists?   │
    │   │   └── Yes → sendViaTwilio()                    │
    │   ├── TWILIO_ACCOUNT_SID env var set?              │
    │   │   └── Yes → sendViaTwilio() (global config)    │
    │   └── No → MockSmsProvider (console.log)           │
    │                                                    │
    └── Returns: { success, providerRef?, threadId?, error? }
```

Mock providers log messages to the console — useful for development without configuring real email/SMS services.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (e.g., Neon, Supabase, or local) |
| `AUTH_SECRET` | **Yes** | Secret key for NextAuth JWT signing (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | **Yes** | Application base URL (`http://localhost:3000` for dev, production URL for deploy) |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI suggestions. If unset, hardcoded fallbacks are used. |
| `GOOGLE_CLIENT_ID` | No* | Google OAuth client ID (required for Gmail integration) |
| `GOOGLE_CLIENT_SECRET` | No* | Google OAuth client secret (required for Gmail integration) |
| `TWILIO_ACCOUNT_SID` | No* | Twilio Account SID (required for SMS via global config) |
| `TWILIO_AUTH_TOKEN` | No* | Twilio Auth Token (required for SMS via global config) |
| `TWILIO_FROM_NUMBER` | No* | Twilio sender phone number (required for SMS via global config) |

\* These are required only if you want to enable the respective integration. The app functions without them using mock providers.

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** database (local, [Neon](https://neon.tech), or [Supabase](https://supabase.com))

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Kishan-kp-ai/careOps.git
cd careOps

# 2. Install dependencies
npm install

# 3. Set up environment variables
#    Create a .env file in the project root:
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@host:5432/careops"
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: AI suggestions
GEMINI_API_KEY="your-gemini-api-key"

# Optional: Gmail integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: SMS integration
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_FROM_NUMBER="+1234567890"
EOF

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database (or run migrations)
npx prisma db push

# 6. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Development Notes

- **Mock providers:** Without Gmail/Twilio credentials, emails and SMS are logged to the console via mock providers — no real messages are sent.
- **AI fallbacks:** Without `GEMINI_API_KEY`, the onboarding wizard uses hardcoded industry-specific suggestions.
- **Database singleton:** The Prisma client uses a global singleton pattern (`src/lib/db.ts`) to avoid connection exhaustion during hot reloads in development.

---

## Production Deployment (Vercel)

### Steps

1. **Push to GitHub** — The repository is at `github.com/Kishan-kp-ai/careOps`.

2. **Connect to Vercel:**
   - Import the repository in [Vercel](https://vercel.com).
   - Framework preset: **Next.js** (auto-detected).
   - Build command: `next build` (default).
   - Output directory: `.next` (default).

3. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL` — your production PostgreSQL connection string.
   - `AUTH_SECRET` — a strong random secret.
   - `NEXTAUTH_URL` — your production domain (e.g., `https://careops.vercel.app`).
   - `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TWILIO_*` as needed.

4. **Database:** Run `npx prisma db push` against your production database, or configure Prisma migrations.

5. **Google OAuth redirect URI:** Add `https://your-domain.com/api/oauth/google/callback` as an authorized redirect URI in the [Google Cloud Console](https://console.cloud.google.com).

6. **Twilio webhook:** Set `https://your-domain.com/api/public/sms/inbound` as the SMS webhook URL in your Twilio phone number configuration.

7. **Deploy** — Vercel auto-deploys on every push to the main branch.

### Production Checklist

- [ ] PostgreSQL database provisioned and accessible
- [ ] All required environment variables set in Vercel
- [ ] Prisma schema pushed to production database
- [ ] Google OAuth redirect URI configured (if using Gmail)
- [ ] Twilio webhook URL configured (if using SMS)
- [ ] `AUTH_SECRET` is a strong, unique value
- [ ] `NEXTAUTH_URL` matches the production domain exactly
