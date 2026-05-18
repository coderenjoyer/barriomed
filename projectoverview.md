# Project Title: BarrioMed — Barangay Health Link

---

## Overview

Rural barangay health centers in the Philippines still rely heavily on paper-based systems for patient queuing, medical records, and medicine inventory. Long physical queues, lost health cards, handwritten prescriptions, and manual stock tracking create delays, errors, and inequitable access to primary healthcare — especially for the elderly and low-income communities.

BarrioMed was built to digitize and modernize these workflows at the barangay level, giving patients, health staff, doctors, and administrators a unified platform that is simple enough for first-time smartphone users yet robust enough to handle real clinical workflows. The goal is to reduce wait times, eliminate lost records, improve medicine traceability, and bring Philippine barangay healthcare closer to compliance with RA 10173 (Data Privacy Act of 2012).

---

## Outcomes

**Capabilities of the Software:**

- **Virtual Pila (Digital Queue)** — Patients join a real-time queue from their phone without physically lining up. They receive live updates on their queue position and an SMS alert (via Twilio) the moment their number is called.
- **E-Botika (Medicine Inventory)** — Health staff and admins manage medicine stock digitally. Inventory changes are tracked with a full audit trail (who changed what, when, and what the old value was).
- **E-Reseta (Digital Prescriptions)** — Doctors issue prescriptions electronically, linked directly to a patient's consultation record.
- **Medical Records / SOAP Notes** — Doctors create structured consultation records. Patients can view their own health history from their phone at any time.
- **Digital Yellow Card** — A patient's vaccination and immunization history is stored and accessible digitally, replacing the easily lost paper Yellow Card.
- **Doctor–Patient Chat** — Secure in-app messaging between patients and their assigned doctor for follow-up consultations.
- **Push & In-App Notifications** — Patients and staff receive real-time alerts for queue updates, broadcast announcements, and system events.
- **Admin Dashboard** — A web-based control panel for system administrators to manage user accounts, oversee all queues and medical data, broadcast notifications, view audit logs, and control system-wide feature toggles (enable/disable login, queue, or chat during maintenance).

---

## Specifications

**Platforms / Coded In:**
- Language: TypeScript
- Framework: React Native (Expo SDK 54) with React 19
- Styling: NativeWind 4 (Tailwind CSS adapted for React Native)
- Backend: Supabase (PostgreSQL database, Auth, Realtime subscriptions, Edge Functions)
- Edge Functions runtime: Deno
- SMS Gateway: Twilio
- Push Notifications: Expo Notifications

**Cross-Platform / Single Platform:**
- Cross-platform — a single shared codebase targets Android, iOS, and Web simultaneously using Expo and React Native Web.

**Can work on:**
- Android devices (primary mobile target)
- iOS devices (supported, secondary target)
- Web browsers (used for the Admin and Staff dashboards)

**How the Project Works:**

1. **Authentication** — Users register and log in with an email and a PIN (used as password). Supabase Auth manages sessions, which are persisted locally via AsyncStorage so users stay logged in between app restarts. Deactivated accounts are blocked at login and the attempt is recorded in an audit log.

2. **Role-Based Access** — Four roles exist: `patient`, `doctor`, `health_staff`, and `system_admin`. The app detects the logged-in user's role from the database and renders the correct dashboard automatically. The Admin dashboard is restricted to web browsers only and is blocked from rendering on mobile at the router level.

3. **Queue System** — When a patient requests a queue ticket, the app generates a UUID locally and stores it in AsyncStorage (offline-first). A Postgres RPC (`assign_queue_number`) is then called to assign the official queue number server-side, eliminating clock-skew issues. Staff call patients forward using another RPC (`call_next`), which triggers a fire-and-forget SMS alert to the patient via a Supabase Edge Function that calls the Twilio API. All queue state changes are broadcast in real time to all connected clients via Supabase Realtime.

4. **Database Security** — Every table is protected by Row-Level Security (RLS) policies in PostgreSQL, ensuring users can only read or write data their role permits. Admin operations are additionally guarded by a session verification check.

5. **Feature Toggles** — The admin can enable or disable the login system, queue system, or chat feature in real time from the dashboard. Non-admin users are blocked immediately without requiring a redeployment.

6. **Audit Logging** — Every significant admin action (user role changes, deactivations, inventory edits, queue overrides, feature toggle changes) is recorded in the `admin_logs` table with before/after values for full traceability.
