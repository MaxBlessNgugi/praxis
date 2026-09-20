/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';
import { OnboardingWizard } from './components/church/OnboardingWizard';
import { SubscriptionLapsed } from './components/church/SubscriptionLapsed';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PermissionsProvider } from './lib/permissions';
import { AuthProvider, useAuth } from './lib/auth';

/**
 * The console's rights come from the **signed-in account**, resolved by the backend and carried on
 * the session user. Nothing here may widen them: there is no client-side override, no role
 * preview — the audited vendor support session is the sanctioned way to see another role's view.
 */
function SessionPermissions({ children }: { children: React.ReactNode }) {
  return <PermissionsProvider>{children}</PermissionsProvider>;
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
 *
 * Two doors sit between the session and the console, and both are read from the session rather than
 * from anything this file decides.
 *
 * A **lapsed** subscription comes first, and it is a screen rather than an error: writes are already
 * refused with a reason, so showing the console would offer a set of buttons the server rejects. The
 * panel says what happened, that nothing is deleted, and how to get it back.
 *
 * The **welcome wizard** comes second. A church that signed itself up has a name and a country and
 * nothing else, so it is asked for the few facts the console displays everywhere. The flag lives on
 * the church, not the browser, so the second administrator is not asked the same questions.
 */
function ConsoleRoot() {
  const { isAuthenticated, isLoading, user, organization, subscription } = useAuth();

  if (isLoading) {
    return <RestoringSession />;
  }

  if (!isAuthenticated || !user) {
    return <AuthScreen />;
  }

  if (subscription?.status === 'expired') {
    return <SubscriptionLapsed />;
  }

  if (organization && !organization.onboardedAt) {
    return <OnboardingWizard />;
  }

  return (
    <SessionPermissions>
      <ChurchSystemApp />
    </SessionPermissions>
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
