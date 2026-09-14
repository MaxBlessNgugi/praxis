/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';
import { DemoDataProvider, useDemoData } from './data/demoStore';
import { PermissionsProvider } from './lib/permissions';

/**
 * The console's signed-in identity, as a role. Switching it in the header changes what the
 * permission gates allow, which is the whole point of carrying ECCLESIA's panel rights here.
 */
function SessionPermissions({ children }: { children: React.ReactNode }) {
  const { role } = useDemoData();
  return <PermissionsProvider role={role}>{children}</PermissionsProvider>;
}

/**
 * Praxis Church OS.
 *
 * The sign-in screen is the entry gate: the church console is only reachable behind
 * it. There is no backend — `AuthScreen` runs a demo-only transition and then reports
 * success, so a viewer gets from the gate to the console in one click.
 *
 * `DemoDataProvider` wraps everything the console is allowed to change (the members
 * roll, the trash queue, the tithe ledger, the role being viewed as), so its data
 * outlives navigation and reloads.
 */
export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#FDF8F3] text-[#1C1917]">
      {isSignedIn ? (
        <DemoDataProvider>
          <SessionPermissions>
            <ChurchSystemApp />
          </SessionPermissions>
        </DemoDataProvider>
      ) : (
        <AuthScreen onSignIn={() => setIsSignedIn(true)} />
      )}
    </div>
  );
}
