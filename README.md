<div align="center">

```
BARRIOMED
```

**Barangay Health Link**

*Digitizing Philippine public healthcare — one barangay at a time.*

---

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-0ea5e9.svg?style=flat-square)]()
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-6366f1.svg?style=flat-square)]()
[![Backend](https://img.shields.io/badge/Backend-Supabase%20%2F%20PostgreSQL-3ecf8e.svg?style=flat-square)](https://supabase.com)
[![Mobile](https://img.shields.io/badge/Mobile-React%20Native%20%2F%20Expo-61dafb.svg?style=flat-square)](https://expo.dev)
[![Offline First](https://img.shields.io/badge/Offline--First-WatermelonDB-f59e0b.svg?style=flat-square)](https://nozbe.github.io/WatermelonDB/)
[![RA 10173](https://img.shields.io/badge/Compliant-RA%2010173%20Data%20Privacy-ef4444.svg?style=flat-square)]()

</div>

---

## The Problem

Barangay Health Centers (BHCs) are the first point of care for millions of Filipinos — yet they run almost entirely on paper. Residents line up at dawn for queue numbers. Medicine availability is a mystery until you physically arrive. Immunization records ("Yellow Cards") are lost, water-damaged, or simply never updated. Doctors have no access to a patient's history between visits.

**B-Health Connect** resolves all of this with a hybrid mobile + web system designed specifically for the constraints of barangay-level healthcare: intermittent connectivity, limited hardware, and zero budget for proprietary software.

---

## ✦ What It Does

| Feature | Who It's For | How It Works |
|---|---|---|
| **Virtual Pila** | Residents | Get a queue number offline. Server assigns the real slot when connectivity returns. |
| **E-Botika Viewer** | Residents | Traffic-light medicine availability — Green/Red — updated live by BHC staff. |
| **Digital Yellow Card** | Residents / Dependents | Immunization records for adults and infants, replacing paper cards. |
| **E-Reseta** | Doctors → Residents | Digital prescriptions with a QR code for pharmacy scanning. |
| **SOAP Consultations** | Doctors | Structured visit notes with vitals, linked to the patient's full history. |
| **Queue Dashboard** | BHC Staff | Call Next, No-Show, Complete — real-time across all connected devices. |
| **Merge Tool** | Admins | AI-assisted duplicate patient detection with one-click record consolidation. |
| **Audit Trail** | Admins | Append-only log of every destructive action, compliant with RA 10173. |

---

## ✦ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
│                                                                 │
│  ┌─────────────────────────┐   ┌───────────────────────────┐   │
│  │   Android APK           │   │   Web Dashboard           │   │
│  │   React Native / Expo   │   │   React (Expo Web)        │   │
│  │   WatermelonDB (SQLite) │   │   Staff · Doctor · Admin  │   │
│  │   SQLCipher encrypted   │   │                           │   │
│  │   Offline sync queue    │   │                           │   │
│  └────────────┬────────────┘   └─────────────┬─────────────┘   │
└───────────────┼─────────────────────────────┼─────────────────┘
                │  TLS 1.3 · JWT Auth          │  WebSocket (Realtime)
                ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                              │
│                                                                 │
│   PostgreSQL ──► PostgREST API ──► Edge Functions (Deno)       │
│   Row-Level Security              pg_cron Scheduler            │
│   Realtime WebSocket              Supabase Auth (JWT/OTP)      │
│   pg_trgm fuzzy search            Supabase Vault (secrets)     │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTP POST (fallback)
                              ▼
                   ┌────────────────────┐
                   │   Semaphore SMS    │
                   │   (or Android      │
                   │    SMS Bridge)     │
                   └────────────────────┘
```

### The Offline-First Sync Loop

```
[Resident opens app — no internet]
        │
        ▼
 WatermelonDB saves local_token UUID
 UI updates instantly (optimistic)
        │
        ▼
 Connectivity detected by background service
        │
        ▼
 sync-queue-token Edge Function called
        │
        ├─► pg_advisory_lock(bhc_id + service_type)
        ├─► MAX(ticket_number) + 1  for today
        ├─► UPSERT on local_token   (safe for retries)
        └─► Returns assigned number to app
                │
                ▼
        Staff calls the number
                │
                ├─► Realtime WebSocket push to app
                └─► [No ACK in 5s] → SMS via Semaphore
```

---

## ✦ Tech Stack

### Mobile (Android APK)
- **React Native** via Expo managed workflow
- **WatermelonDB** — reactive offline-first local database
- **SQLCipher** — encrypted SQLite at rest
- **Expo EAS Build** — CI/CD APK generation

### Web Dashboard
- **React** (compiled via Expo Web)
- **Supabase JS Client** — Realtime subscriptions + REST

### Backend
- **Supabase** (PostgreSQL 15 + Edge Functions + Auth + Realtime)
- **PostgreSQL Extensions:** `pg_trgm`, `pg_cron`, `uuid-ossp`
- **Row-Level Security** — enforced at the database layer, not just app layer
- **SECURITY DEFINER functions** — privileged operations scoped tightly

### Notifications
- **Semaphore API** (production SMS gateway)
- **Android SMS Bridge** (low-cost pilot option)

---

## ✦ Database Schema

13 tables, full RLS, 20+ indexes. See the full schema in [`/supabase/schema.sql`](./supabase/schema.sql).

```
public
├── bhcs                    ← Barangay Health Centers (multi-BHC scalability anchor)
├── users                   ← Extends auth.users; roles: resident/staff/doctor/admin
├── dependents              ← Infants & offline family members (REQ-RES-04)
├── account_links           ← SMS-consent record sharing between adults (REQ-RES-05)
├── queue_tickets           ← Virtual Pila; local_token for offline dedup (REQ-RES-02)
├── consultations           ← SOAP notes + structured vitals (REQ-DOC-02)
├── medicines               ← E-Botika inventory; is_available toggle (REQ-STF-02)
├── prescriptions           ← E-Reseta header; qr_token for pharmacy scan (REQ-RES-06)
├── prescription_items      ← Individual medicine line items
├── immunization_records    ← Digital Yellow Card; patient OR dependent, not both
├── duplicate_flags         ← pg_trgm similarity flags for Admin merge tool (REQ-ADM-01)
├── audit_logs              ← Append-only; no role can UPDATE/DELETE (REQ-ADM-02)
└── sync_queue_items        ← Server-side mirror of client offline sync queue
```

**Key design decisions:**
- Every table is scoped by `bhc_id` — the schema scales from 1 BHC to 1,000+
- `audit_logs` is written exclusively through a `SECURITY DEFINER` function — never directly
- `queue_tickets.local_token` has a `UNIQUE` constraint — retries never create duplicates
- `prescriptions.qr_token` is an opaque UUID — a pharmacy scanner never sees a patient's internal ID
- `immunization_records` has a `CHECK` constraint enforcing it belongs to either a `user` OR a `dependent`, never both

---

## ✦ Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `sync-queue-token` | Mobile sync | Assigns ticket number with advisory lock |
| `call-next-ticket` | Staff action | Updates status + Realtime push + SMS fallback |
| `issue-prescription` | Doctor action | Stock check + atomic prescription insert |
| `merge-patient-records` | Admin action | Re-parents all FKs + soft-delete + audit log |
| `send-account-link` | Resident action | Generates signed invite token + SMS delivery |

---

## ✦ Security & Compliance

This system handles sensitive health data under the **Philippine Data Privacy Act of 2012 (RA 10173)**. Security is enforced at every layer:

| Layer | Mechanism |
|---|---|
| **Transit** | TLS 1.3 on all endpoints |
| **Cloud at rest** | AES-256 on Supabase PostgreSQL managed disks |
| **Device at rest** | SQLCipher encryption on WatermelonDB SQLite file |
| **Authentication** | Supabase Auth (OTP for residents, email+password for staff) |
| **PIN** | bcrypt hash (cost 12) — never stored in plaintext |
| **Access control** | PostgreSQL RLS policies — enforced at DB layer, not app layer |
| **Audit** | Append-only `audit_logs` table; no role can UPDATE or DELETE rows |
| **QR Privacy** | `qr_token` UUID is opaque — pharmacy scanners never see patient UUIDs |

### Role Permissions Matrix

```
Action                          Resident  Staff   Doctor  Admin
──────────────────────────────────────────────────────────────
View own health records            ✓        —       —       ✓
View any patient at BHC            —        ✓*      ✓       ✓
Issue E-Reseta                     —        —       ✓       —
Toggle medicine availability       —        ✓       —       ✓
Call / complete queue tickets      —        ✓       —       ✓
Permanently delete records         —        —       —       ✓
Merge duplicate records            —        —       —       ✓
View audit logs                    —        —       —       ✓

* Staff sees queue-context view only
```

---

## ✦ Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- Android device or emulator (for mobile)

### 1 — Clone & Install

```bash
git clone https://github.com/your-org/b-health-connect.git
cd b-health-connect
npm install
```

### 2 — Set Up Supabase (Local)

```bash
supabase start
```

This spins up a local Supabase instance (PostgreSQL + Auth + Realtime + Edge Functions) via Docker.

### 3 — Apply the Schema

```bash
supabase db push
# or run directly:
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/schema.sql
```

### 4 — Configure Environment

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# SMS (for production — leave empty for local dev)
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=BHealthConnect
```

Secrets for Edge Functions go in Supabase Vault (not `.env`):
```bash
supabase secrets set SEMAPHORE_API_KEY=your_key
```

### 5 — Deploy Edge Functions

```bash
supabase functions deploy sync-queue-token
supabase functions deploy call-next-ticket
supabase functions deploy issue-prescription
supabase functions deploy merge-patient-records
supabase functions deploy send-account-link
```

### 6 — Run

```bash
# Mobile (Android)
npx expo start --android

# Web dashboard
npx expo start --web
```

---

## ✦ Project Structure

```
b-health-connect/
├── apps/
│   ├── mobile/                 # React Native (Expo) Android APK
│   │   ├── src/
│   │   │   ├── screens/        # Resident-facing screens
│   │   │   ├── db/             # WatermelonDB models & schema
│   │   │   ├── sync/           # Offline sync queue service
│   │   │   └── components/
│   │   └── app.json
│   └── web/                    # React web dashboard
│       └── src/
│           ├── pages/          # Staff / Doctor / Admin views
│           └── components/
├── supabase/
│   ├── schema.sql              # ← Complete PostgreSQL schema
│   ├── migrations/             # Version-controlled schema changes
│   └── functions/              # Edge Functions (Deno)
│       ├── sync-queue-token/
│       ├── call-next-ticket/
│       ├── issue-prescription/
│       ├── merge-patient-records/
│       └── send-account-link/
├── packages/
│   └── shared/                 # Shared types, constants, utilities
├── docs/
│   ├── SRS-v2.0.md             # Software Requirements Specification
│   ├── schema-visual.html      # Interactive schema reference
│   └── backend-infra.docx      # Backend infrastructure document
└── .github/
    └── workflows/
        ├── deploy-functions.yml
        └── eas-build.yml
```

---

## ✦ Deployment

### Environments

| Environment | Supabase | Mobile |
|---|---|---|
| **Local dev** | `supabase start` (Docker) | Expo Go / Dev Build |
| **Staging** | Separate Supabase project | EAS Preview build |
| **Production** | Supabase Pro (99.9% SLA) | EAS Production APK |

### CI/CD (GitHub Actions)

**Edge Functions** deploy automatically on merge to `main`:
```yaml
# .github/workflows/deploy-functions.yml
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']
```

**Android APK** built on every version tag:
```bash
git tag v2.1.0
git push --tags
# EAS Build triggers automatically via .github/workflows/eas-build.yml
```

### Scaling Path

| Phase | Scale | Infrastructure |
|---|---|---|
| Pilot | 1 BHC · ~500 residents | Supabase Free/Pro — no changes needed |
| City | 10–50 BHCs · ~25k residents | Supabase Pro + Upstash Redis for queue state |
| Provincial | 100+ BHCs · 50k+ residents | Supabase Enterprise or self-hosted on GKE/EKS |

---

## ✦ Scheduled Jobs

Two `pg_cron` jobs run automatically after schema deployment:

```sql
-- Fuzzy duplicate patient detection every 6 hours
SELECT cron.schedule('detect-duplicate-patients', '0 */6 * * *',
  $$ SELECT public.detect_duplicate_patients(); $$);

-- Expire stale prescriptions daily at midnight Manila time (UTC+8)
SELECT cron.schedule('expire-prescriptions', '0 16 * * *',
  $$ SELECT public.expire_prescriptions(); $$);
```

---

## ✦ SRS Requirement Coverage

| Requirement | Status | Implementation |
|---|---|---|
| REQ-RES-01 Offline Auth | ✅ | WatermelonDB + bcrypt PIN hash |
| REQ-RES-02 Virtual Queue | ✅ | `queue_tickets` + `assign_ticket_number()` |
| REQ-RES-03 E-Botika | ✅ | `medicines.is_available` + Realtime |
| REQ-RES-04 Dependents | ✅ | `dependents` table + `immunization_records` |
| REQ-RES-05 Account Linking | ✅ | `account_links` + SMS invite token |
| REQ-RES-06 Digital Reseta | ✅ | `prescriptions.qr_token` + `resolve_qr_prescription()` |
| REQ-DOC-01 Patient Lookup | ✅ | GIN `pg_trgm` index on `users.full_name` |
| REQ-DOC-02 SOAP Notes | ✅ | `consultations` with structured vitals |
| REQ-DOC-03 E-Prescribing | ✅ | `issue-prescription` Edge Function + stock check |
| REQ-STF-01 Queue Control | ✅ | `call-next-ticket` Edge Function + Realtime |
| REQ-STF-02 Inventory Toggles | ✅ | `PATCH /medicines` + Realtime broadcast |
| REQ-ADM-01 Entity Resolution | ✅ | `duplicate_flags` + `merge_patient_records()` |
| REQ-ADM-02 Audit Trail | ✅ | Append-only `audit_logs` + `log_audit_event()` |
| REQ-SYS-01 Optimistic Sync | ✅ | `sync_queue_items` + `local_token` UPSERT |
| REQ-SYS-02 SMS Fallback | ✅ | 5s WebSocket timeout → Semaphore HTTP POST |

---

## ✦ Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat(queue): add estimated wait time calculation"`
4. Push and open a Pull Request

### Branch Conventions

```
main          ← production-ready
staging       ← integration testing
feat/*        ← new features
fix/*         ← bug fixes
chore/*       ← migrations, tooling, dependencies
```

### Running Schema Migrations

```bash
# Create a new migration
supabase migration new your_migration_name

# Apply all pending migrations
supabase db push

# Reset local database (destructive)
supabase db reset
```

---

## ✦ License

MIT License — see [LICENSE](./LICENSE) for details.

---

## ✦ Acknowledgments

Built for the barangay health workers, nurses, and doctors who show up every day with limited resources and unlimited dedication.

---

<div align="center">

**B-Health Connect** · Barangay Health Link · v2.0

*Built with [Supabase](https://supabase.com) · [Expo](https://expo.dev) · [WatermelonDB](https://nozbe.github.io/WatermelonDB/)*

</div>
