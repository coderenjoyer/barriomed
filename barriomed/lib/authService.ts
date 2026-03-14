// ---------------------------------------------------------------------------
// authService.ts – thin re-exports from AuthContext
//
// The primary auth logic now lives in AuthContext.tsx (Supabase Auth).
// This file exists so that non-component code can still import helpers
// and so that the AuthContext types are conveniently available.
// ---------------------------------------------------------------------------

export { AuthProvider, useAuth } from './AuthContext';
export type { UserProfile, DbRole, UiRole } from './AuthContext';
