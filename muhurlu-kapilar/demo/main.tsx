import { createRoot } from 'react-dom/client';
import '@/app/three-door.css';
import '@/app/sealed-doors.css';
import '@/app/ivory-experience.css';
import '@/app/door-experiences.css';
import '../example/davetiye/davetiye.css';
import './demo.css';
import { SealedDoor } from '@/app/davet/[token]/sealed-door';
import { defaultAppearance } from '@/lib/invitation-appearance';
import { doorThemes, type DoorConfig, type DoorTheme } from '@/lib/door-themes';
import { App } from './App';

// Önizleme bir alt dizinde yayınlanabilir: kökten verilen görsel yollarını
// sayfanın bulunduğu yere göre çöz (Next.js projesinde bu gerekmez).
const rebase = (path: string) => (path.startsWith('/') ? new URL(`.${path}`, document.baseURI).href : path);
for (const door of Object.values(doorThemes) as DoorConfig[]) {
  door.art = rebase(door.art);
  if (door.mask) door.mask = rebase(door.mask);
}

const params = new URLSearchParams(location.search);
const root = createRoot(document.getElementById('root')!);

if (params.has('pisir')) {
  // Kapak pişirme (scripts/bake-covers.mjs): mühürsüz, harfsiz kapı.
  const style = document.createElement('style');
  style.textContent = '.sealed-door, .door3d-snow, .wax-seal, .demo-bar { display: none !important; }';
  document.head.append(style);
  root.render(
    <SealedDoor
      theme={(params.get('tema') ?? 'kakma') as DoorTheme}
      name1=""
      name2=""
      guest=""
      appearance={{ ...defaultAppearance, sounds: false }}
      open={false}
      paused={false}
      onStart={() => undefined}
      onComplete={() => undefined}
      onEngine={(scene) => ((window as unknown as { __door: unknown }).__door = scene)}
    />,
  );
} else root.render(<App />);
