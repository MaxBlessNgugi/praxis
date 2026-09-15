/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DemoDataProvider, useDemoData } from './data/demoStore';
import { PermissionsProvider } from './lib/permissions';
import { AuthProvider, useAuth } from './lib/auth';

/**
 * The console's rights come from the **signed-in account**, resolved by the backend and carried on
 * the session user. Nothing here may widen them.
 *
 * The header's role switcher survives as a *preview* tool for `super_admin` only. That restriction is
 * the point: it can show a bishop what a viewer sees, but a viewer can never use it to promote
 * themselves — the backend would refuse every write anyway, and a console that offers controls the
 * server will reject is worse than one that hides them. For every other role there is no override
 * at all, so `PermissionsProvider` falls through to the real session.
 */
function SessionPermissions({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { role } = useDemoData();
  const previewRole = user?.roleKey === 'super_admin' ? role : undefined;
  return <PermissionsProvider overrideRole={previewRole}>{children}</PermissionsProvider>;
}

/** Shown while the stored token is being checked against GET /api/auth/me. */
function RestoringSession() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#FDF8F3]">
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-[48px] text-[#C2410C] animate-spin">progress_activity</span>
        <p className="font-headline text-lg text-[#57534E]">Restoring session…</p>
      </div>
    </div>
  );
}

/**
 * The gate and the console are mutually exclusive: `AuthScreen` renders while there is no
 * session, and the church console renders once `login()` has stored a token and a user. Both
 * read the same session, so a successful sign-in flips this branch without a reload.
 */
function ConsoleRoot() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <RestoringSession />;
  }

  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  return (
    <DemoDataProvider>
      <SessionPermissions>
        <ChurchSystemApp />
      </SessionPermissions>
    </DemoDataProvider>
  );
}

/**
 * Praxis Church OS.
 *
 * `AuthProvider` wraps the whole console so the gate and the app read one session. On load the
 * provider calls GET /api/auth/me to restore a stored token before either branch renders.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="w-screen h-screen overflow-hidden bg-[#FDF8F3] text-[#1C1917]">
          <ConsoleRoot />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
