import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '@/app/three-door.css';
import '@/app/sealed-doors.css';
import '@/app/ivory-experience.css';
import { SealedDoor } from '@/app/davet/[token]/sealed-door';
import { defaultAppearance } from '@/lib/invitation-appearance';
import type { DoorTheme } from '@/lib/door-themes';

document.documentElement.style.setProperty('--font-serif', '"Cormorant Garamond"');
const params = new URLSearchParams(location.search);
const theme = (params.get('tema') ?? 'rolyef') as DoorTheme;
const bake = params.has('pisir');
if (bake) {
  const style = document.createElement('style');
  style.textContent = '.sealed-door, .door3d-snow, .wax-seal { display: none !important; }';
  document.head.append(style);
}

function Test() {
  const [opened, setOpened] = useState(false);
  if (opened) return <main style={{ minHeight: '100svh', background: '#f7f1e7' }}>AÇILDI</main>;
  return (
    <SealedDoor
      theme={theme}
      name1={bake ? '' : 'Selin'}
      name2={bake ? '' : 'Arda'}
      guest="Sevgili dostumuz"
      date={bake ? undefined : '12 · 06 · 2027'}
      appearance={{ ...defaultAppearance, opening: (params.get('acilis') as 'gentle') ?? 'cinematic' }}
      open={false}
      paused={false}
      onStart={() => undefined}
      onComplete={() => setOpened(true)}
      onEngine={(scene) => ((window as unknown as { __door: unknown }).__door = scene)}
    />
  );
}
createRoot(document.getElementById('root')!).render(<Test />);
