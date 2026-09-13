/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChurchSystemApp } from './components/church/ChurchSystemApp';

/**
 * Praxis Church OS.
 *
 * The app is rendered on its own, full screen. The former Figma studio shell
 * (top toolbar + Canvas / Design Tokens / Dev Mode views) is no longer mounted;
 * its components are kept in src/components/figma/ for reference only.
 */
export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#FDF8F3] text-[#1C1917]">
      <ChurchSystemApp />
    </div>
  );
}
