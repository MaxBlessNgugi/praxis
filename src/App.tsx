/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';

/**
 * Praxis Church OS.
 *
 * The sign-in screen is the entry gate: the church console is only reachable behind
 * it. There is no backend — `AuthScreen` runs a demo-only transition and then reports
 * success, so a viewer gets from the gate to the console in one click.
 */
export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#FDF8F3] text-[#1C1917]">
      {isSignedIn ? (
        <ChurchSystemApp />
      ) : (
        <AuthScreen onSignIn={() => setIsSignedIn(true)} />
      )}
    </div>
  );
}
