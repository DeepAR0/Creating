import type { DoorRitual } from './door-themes';
import type { Lang } from './invitation-appearance';

/* Mühürlü kapı arayüzünün metinleri. Türkçe asıl metindir; İngilizce ve
   Almanca aynı tonda, kısa ve sıcak tutuldu. Ritüel ipuçları büyük harfle
   yazılır: Türkçe büyük İ/I ayrımı metinde korunur. */

export type SealedDoorCopy = {
  greeting: string;
  hints: Record<DoorRitual, string>;
  /** Ritüelin ortasında gösterilen teşvik (tokmak, anahtar, cam, sürgü). */
  progress: Partial<Record<DoorRitual, string>>;
  knockAgain: string;
  opening: string;
  loading: string;
  skip: string;
  sealLabel: string;
  actions: Record<DoorRitual, string>;
  soundOn: string;
  soundOff: string;
  knockLabel: (count: number, total: number) => string;
  /** Kapı ekranı için erişilebilir ad. */
  doorLabel: (name: string) => string;
};

export const sealedDoorCopies: Record<Lang, SealedDoorCopy> = {
  tr: {
    greeting: 'SİZE ÖZEL BİR DAVET',
    hints: {
      tap: 'MÜHRE DOKUNUN',
      knock: 'TOKMAKLA İKİ KEZ ÇALIN',
      ribbon: 'KURDELEYİ AŞAĞI ÇEKİN',
      hold: 'MÜHRE BASILI TUTUN',
      key: 'ANAHTARI ÇEVİRİN',
      wipe: 'CAMDAKİ BUĞUYU SİLİN',
      slide: 'KANATLARI İKİ YANA ÇEKİN',
    },
    progress: {
      knock: 'BİR KEZ DAHA',
      key: 'BİRAZ DAHA ÇEVİRİN',
      wipe: 'IŞIKLAR GÖRÜNÜYOR…',
      slide: 'MÜHÜR ZORLANIYOR…',
    },
    knockAgain: 'BİR KEZ DAHA',
    opening: 'HİKÂYEMİZ AÇILIYOR…',
    loading: 'DAVETİNİZ HAZIRLANIYOR…',
    skip: 'Doğrudan davetiyeye geç',
    sealLabel: 'Mührü kırın, kapıyı açın',
    actions: {
      tap: 'Mührü kırın, kapıyı açın',
      knock: 'Kapıyı çalın',
      ribbon: 'Kurdeleyi çözün, kapıyı açın',
      hold: 'Mührü uyandırın, kapıyı açın',
      key: 'Anahtarı çevirin, kapıyı açın',
      wipe: 'Buğuyu silin, kapıyı açın',
      slide: 'Kanatları çekin, kapıyı açın',
    },
    soundOn: 'Sesi aç',
    soundOff: 'Sesi kapat',
    knockLabel: (count, total) => `Kapıyı çalın (${count}/${total})`,
    doorLabel: (name) => `${name} — mühürlü davetiye kapısı`,
  },
  en: {
    greeting: 'AN INVITATION JUST FOR YOU',
    hints: {
      tap: 'TOUCH THE SEAL',
      knock: 'KNOCK TWICE',
      ribbon: 'PULL THE RIBBON DOWN',
      hold: 'PRESS AND HOLD THE SEAL',
      key: 'TURN THE KEY',
      wipe: 'WIPE THE MIST FROM THE GLASS',
      slide: 'PULL THE DOORS APART',
    },
    progress: {
      knock: 'ONCE MORE',
      key: 'A LITTLE FURTHER',
      wipe: 'THE LIGHTS ARE APPEARING…',
      slide: 'THE SEAL IS GIVING WAY…',
    },
    knockAgain: 'ONCE MORE',
    opening: 'OUR STORY IS OPENING…',
    loading: 'PREPARING YOUR INVITATION…',
    skip: 'Go straight to the invitation',
    sealLabel: 'Break the seal and open the door',
    actions: {
      tap: 'Break the seal and open the door',
      knock: 'Knock on the door',
      ribbon: 'Untie the ribbon and open the door',
      hold: 'Wake the seal and open the door',
      key: 'Turn the key and open the door',
      wipe: 'Wipe the mist and open the door',
      slide: 'Pull the doors and open them',
    },
    soundOn: 'Turn sound on',
    soundOff: 'Turn sound off',
    knockLabel: (count, total) => `Knock on the door (${count}/${total})`,
    doorLabel: (name) => `${name} — sealed invitation door`,
  },
  de: {
    greeting: 'EINE EINLADUNG NUR FÜR SIE',
    hints: {
      tap: 'BERÜHREN SIE DAS SIEGEL',
      knock: 'ZWEIMAL ANKLOPFEN',
      ribbon: 'ZIEHEN SIE DAS BAND NACH UNTEN',
      hold: 'HALTEN SIE DAS SIEGEL GEDRÜCKT',
      key: 'DREHEN SIE DEN SCHLÜSSEL',
      wipe: 'WISCHEN SIE DAS GLAS FREI',
      slide: 'ZIEHEN SIE DIE FLÜGEL AUSEINANDER',
    },
    progress: {
      knock: 'NOCH EINMAL',
      key: 'NOCH EIN STÜCK',
      wipe: 'DIE LICHTER ERSCHEINEN…',
      slide: 'DAS SIEGEL GIBT NACH…',
    },
    knockAgain: 'NOCH EINMAL',
    opening: 'UNSERE GESCHICHTE ÖFFNET SICH…',
    loading: 'IHRE EINLADUNG WIRD VORBEREITET…',
    skip: 'Direkt zur Einladung',
    sealLabel: 'Siegel brechen, Tür öffnen',
    actions: {
      tap: 'Siegel brechen, Tür öffnen',
      knock: 'An die Tür klopfen',
      ribbon: 'Band lösen, Tür öffnen',
      hold: 'Siegel wecken, Tür öffnen',
      key: 'Schlüssel drehen, Tür öffnen',
      wipe: 'Glas freiwischen, Tür öffnen',
      slide: 'Flügel aufziehen, Tür öffnen',
    },
    soundOn: 'Ton einschalten',
    soundOff: 'Ton ausschalten',
    knockLabel: (count, total) => `An die Tür klopfen (${count}/${total})`,
    doorLabel: (name) => `${name} — versiegelte Einladungstür`,
  },
};

export function doorCopy(lang: Lang | undefined) {
  return sealedDoorCopies[lang ?? 'tr'] ?? sealedDoorCopies.tr;
}
