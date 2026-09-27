'use client';

import { useEffect, useState } from 'react';
import { SealedDoor } from '../source/app/davet/[token]/sealed-door';
import { defaultAppearance } from '../source/lib/invitation-appearance';

/* En küçük kullanım: Fildişi Rölyef kapısı, açılınca davetiye. Hareketi
   azaltmayı seçen konukta kapı CSS ile gizlenir; davetiye doğrudan açılır. */
export function FildisiRolyefOpening() {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setOpened(true);
  }, []);

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
      date="12 · 06 · 2027"
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
