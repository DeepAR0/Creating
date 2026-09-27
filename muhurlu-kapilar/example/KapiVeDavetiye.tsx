'use client';

import { useEffect, useState } from 'react';
import { SealedDoor } from '../source/app/davet/[token]/sealed-door';
import type { DoorTheme } from '../source/lib/door-themes';
import { defaultAppearance, type InvitationAppearance, type Lang } from '../source/lib/invitation-appearance';
import { Invitation } from './davetiye/Invitation';

/* Kapı davetiyenin üstünde durur; açılırken ardındaki sayfa görünür.
   Kapı kapalıyken sayfa kaymaz; açıldıktan kısa süre sonra 3B sahne
   kaldırılır ve GPU belleği boşalır. Dört kapının hepsiyle çalışır. */
export function KapiVeDavetiye({
  theme = 'kakma',
  lang = 'tr',
  appearance = defaultAppearance,
}: {
  theme?: DoorTheme;
  lang?: Lang;
  appearance?: InvitationAppearance;
}) {
  const [opened, setOpened] = useState(false);
  const [door, setDoor] = useState(true);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpened(true);
      setDoor(false);
    }
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = opened ? '' : 'hidden';
    if (!opened) return;
    const id = window.setTimeout(() => setDoor(false), 900);
    return () => window.clearTimeout(id);
  }, [opened]);

  return (
    <>
      <Invitation
        theme={theme}
        lang={lang}
        name1="Selin"
        name2="Arda"
        guest="Sevgili dostumuz"
        appearance={appearance}
        active={opened}
        sounds={appearance.sounds}
      />
      {door && (
        <SealedDoor
          theme={theme}
          name1="Selin"
          name2="Arda"
          guest="Sevgili dostumuz"
          date="12 · 06 · 2027"
          lang={lang}
          appearance={appearance}
          open={opened}
          paused={false}
          onStart={() => undefined}
          onComplete={() => setOpened(true)}
        />
      )}
    </>
  );
}
