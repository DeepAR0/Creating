import type { Lang } from '@/lib/invitation-appearance';

/* Hikâye dokunuşlarının ortak sözleşmesi ve metinleri. Her tema kendi
   dokunuşunu çizer; davetiye sayfası yalnızca bu dört alanı bilir. */

export type StoryTouchProps = {
  /** Kapı açıldı, davetiye görünür. */
  active: boolean;
  /** Sayfa arka planda ya da atölye önizlemesi duraklatıldı. */
  paused: boolean;
  /** Hikâye metni açık mı. */
  expanded: boolean;
  onToggle: () => void;
  /** Çift ve konuk sese izin verdiyse kısa bir tını çalar. */
  sounds?: boolean;
  lang?: Lang;
};

type TouchText = {
  kicker: string;
  kickerOpen: string;
  line: string;
  lineOpen: string;
  labelOpen: string;
  labelClose: string;
};

type Touches = 'ivory' | 'pearl' | 'frost' | 'deco';

export const storyTouchCopy: Record<Lang, Record<Touches, TouchText>> = {
  tr: {
    ivory: {
      kicker: 'ZAMBAĞA DOKUNUN',
      kickerOpen: 'BİRLİKTE AÇAN BİR HİKÂYE',
      line: 'Hikâyemiz çiçek açsın.',
      lineOpen: 'Hikâyemiz sizinle.',
      labelOpen: 'Zambağı aç, hikâyemizi oku',
      labelClose: 'Zambağı kapat, hikâyeyi gizle',
    },
    pearl: {
      kicker: 'YILDIZI TAMAMLAYIN',
      kickerOpen: 'SEKİZ PARÇA, TEK YILDIZ',
      line: 'Her parça bir anı.',
      lineOpen: 'Hikâyemiz bu yıldızda saklı.',
      labelOpen: 'Sedef yıldızı birleştir, hikâyemizi oku',
      labelClose: 'Yıldızı dağıt, hikâyeyi gizle',
    },
    frost: {
      kicker: 'BUĞUYU SİLİN',
      kickerOpen: 'CAMIN ARDINDAKİ NOT',
      line: 'Camın ardında bir not var.',
      lineOpen: 'Soğukta, sıcacık bir hikâye.',
      labelOpen: 'Camdaki buğuyu sil, notu oku',
      labelClose: 'Camı yeniden buğula, hikâyeyi gizle',
    },
    deco: {
      kicker: 'KADEH KALDIRIN',
      kickerOpen: 'ŞEREFE!',
      line: 'Hikâyemize bir kadeh.',
      lineOpen: 'Birlikte, nice yıllara.',
      labelOpen: 'Kadehleri tokuştur, hikâyemizi oku',
      labelClose: 'Kadehleri indir, hikâyeyi gizle',
    },
  },
  en: {
    ivory: {
      kicker: 'TOUCH THE LILY',
      kickerOpen: 'A STORY IN BLOOM',
      line: 'Let our story bloom.',
      lineOpen: 'Our story, with you.',
      labelOpen: 'Open the lily and read our story',
      labelClose: 'Close the lily and hide the story',
    },
    pearl: {
      kicker: 'COMPLETE THE STAR',
      kickerOpen: 'EIGHT PIECES, ONE STAR',
      line: 'Every piece a memory.',
      lineOpen: 'Our story lives in this star.',
      labelOpen: 'Join the pearl star and read our story',
      labelClose: 'Scatter the star and hide the story',
    },
    frost: {
      kicker: 'WIPE THE MIST',
      kickerOpen: 'A NOTE BEHIND THE GLASS',
      line: 'There is a note behind the glass.',
      lineOpen: 'A warm story on a cold night.',
      labelOpen: 'Wipe the misted glass and read the note',
      labelClose: 'Mist the glass again and hide the story',
    },
    deco: {
      kicker: 'RAISE A GLASS',
      kickerOpen: 'CHEERS!',
      line: 'A toast to our story.',
      lineOpen: 'Together, for many years to come.',
      labelOpen: 'Clink the glasses and read our story',
      labelClose: 'Lower the glasses and hide the story',
    },
  },
  de: {
    ivory: {
      kicker: 'BERÜHREN SIE DIE LILIE',
      kickerOpen: 'EINE GESCHICHTE IN BLÜTE',
      line: 'Lassen Sie unsere Geschichte erblühen.',
      lineOpen: 'Unsere Geschichte, mit Ihnen.',
      labelOpen: 'Lilie öffnen und unsere Geschichte lesen',
      labelClose: 'Lilie schließen und Geschichte ausblenden',
    },
    pearl: {
      kicker: 'VOLLENDEN SIE DEN STERN',
      kickerOpen: 'ACHT TEILE, EIN STERN',
      line: 'Jedes Teil eine Erinnerung.',
      lineOpen: 'Unsere Geschichte wohnt in diesem Stern.',
      labelOpen: 'Perlmuttstern zusammensetzen und Geschichte lesen',
      labelClose: 'Stern auflösen und Geschichte ausblenden',
    },
    frost: {
      kicker: 'WISCHEN SIE DAS GLAS FREI',
      kickerOpen: 'EINE NOTIZ HINTER DEM GLAS',
      line: 'Hinter dem Glas wartet eine Notiz.',
      lineOpen: 'Eine warme Geschichte in kalter Nacht.',
      labelOpen: 'Beschlagenes Glas freiwischen und Notiz lesen',
      labelClose: 'Glas wieder beschlagen und Geschichte ausblenden',
    },
    deco: {
      kicker: 'ERHEBEN SIE DAS GLAS',
      kickerOpen: 'PROST!',
      line: 'Ein Glas auf unsere Geschichte.',
      lineOpen: 'Gemeinsam, auf viele Jahre.',
      labelOpen: 'Gläser anstoßen und Geschichte lesen',
      labelClose: 'Gläser senken und Geschichte ausblenden',
    },
  },
};
