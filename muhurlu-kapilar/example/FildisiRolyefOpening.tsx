'use client';

import { useState } from 'react';
import { SealedDoor } from '../source/app/davet/[token]/sealed-door';
import { defaultAppearance } from '../source/lib/invitation-appearance';

export function FildisiRolyefOpening() {
  const [opened, setOpened] = useState(false);

  if (opened) {
    return (
      <main style={{ minHeight: '100svh', background: '#f7f1e7' }}>
        {/* Davetiye içeriğinizi burada gösterin. */}
      </main>
    );
  }

  return (
    <SealedDoor
      theme="rolyef"
      name1="Selin"
      name2="Arda"
      guest="Sevgili dostumuz"
      coverText="Hikâyemize açılan kapı."
      appearance={{
        ...defaultAppearance,
        wax: 'altin',
        emblem: 'monogram',
        seal: 'round',
      }}
      open={false}
      paused={false}
      onStart={() => undefined}
      onComplete={() => setOpened(true)}
    />
  );
}
