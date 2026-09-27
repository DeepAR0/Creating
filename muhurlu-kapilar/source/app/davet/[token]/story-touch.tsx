'use client';

import type { DoorTheme } from '@/lib/door-themes';
import { ChampagneToast } from './deco-experience';
import { FrostNote } from './frost-experience';
import { IvoryBloom } from './ivory-experience';
import { PearlStar } from './pearl-experience';
import type { StoryTouchProps } from './story-touch-copy';

export type { StoryTouchProps };

/** Kapının kendi hikâye dokunuşu; tanınmayan temalarda zambak. */
export function StoryTouch({ theme, ...props }: StoryTouchProps & { theme: DoorTheme }) {
  if (theme === 'kakma') return <PearlStar {...props} />;
  if (theme === 'kisbahcesi') return <FrostNote {...props} />;
  if (theme === 'pera') return <ChampagneToast {...props} />;
  return <IvoryBloom {...props} />;
}
