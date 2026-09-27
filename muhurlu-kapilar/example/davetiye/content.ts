import type { Lang } from '../../source/lib/invitation-appearance';

/* Örnek davetiye içeriği. Kapının ardında açılan sayfanın metinleri üç
   dilde; çift kendi bilgilerini bu biçimde verir. Türkçe asıl metindir,
   diğer diller aynı sıcaklıkta yeniden yazıldı (kelime kelime çeviri
   değil). */

export type InvitationEvent = {
  title: string;
  /** Yerel saat, "18:30". */
  time: string;
  /** ISO başlangıç ve süre (takvim dosyası için). */
  start: string;
  minutes: number;
  place: string;
  address: string;
  note?: string;
};

export type InvitationContent = {
  kicker: string;
  intro: string;
  dateLine: string;
  placeLine: string;
  countdownTitle: string;
  units: [string, string, string, string];
  countdownToday: string;
  countdownAfter: string;
  scrollHint: string;
  sections: Record<'story' | 'event' | 'program' | 'menu' | 'gift' | 'rsvp', string>;
  story: string[];
  milestones: { year: string; text: string }[];
  events: InvitationEvent[];
  directions: string;
  addToCalendar: string;
  calendarTitle: string;
  program: { time: string; title: string; note: string }[];
  menu: { course: string; dish: string }[];
  menuNote: string;
  gift: { text: string; iban: string; holder: string; copy: string; copied: string };
  rsvp: {
    intro: string;
    name: string;
    attending: string;
    yes: string;
    no: string;
    guests: string;
    meal: string;
    meals: string[];
    message: string;
    messageHint: string;
    send: string;
    thanksYes: string;
    thanksNo: string;
    edit: string;
  };
  hashtag: string;
  hashtagLine: string;
  footer: string;
};

const venue = {
  place: 'Mehtap Yalısı',
  address: 'Köybaşı Caddesi No: 12, Yeniköy, Sarıyer / İstanbul',
};

export const invitationContent: Record<Lang, InvitationContent> = {
  tr: {
    kicker: 'EVLENİYORUZ',
    intro: 'Hayatımızın en güzel gününde sizi de yanımızda görmek istiyoruz.',
    dateLine: '12 Haziran 2027 · Cumartesi',
    placeLine: 'Yeniköy, İstanbul',
    countdownTitle: 'BÜYÜK GÜNE',
    units: ['GÜN', 'SAAT', 'DAKİKA', 'SANİYE'],
    countdownToday: 'Bugün, büyük gün!',
    countdownAfter: 'Evlendik; bizimle olduğunuz için teşekkürler.',
    scrollHint: 'Davetiyeyi keşfedin',
    sections: {
      story: 'Hikâyemiz',
      event: 'Tören ve Davet',
      program: 'Gecenin Akışı',
      menu: 'Menü',
      gift: 'Hediye',
      rsvp: 'Katılım',
    },
    story: [
      'Her şey bir sonbahar akşamı, Moda sahilinde başladı. Aynı kitabı okuyan iki yabancıydık; kitaplar değişti, sohbet hiç bitmedi.',
      'Yedi yıl, üç şehir ve sayısız çay bardağından sonra şimdi aynı kapıdan birlikte geçiyoruz. Bu kapının ardında sizi de görmek, hikâyemizin en güzel sayfasını sizinle yazmak istiyoruz.',
    ],
    milestones: [
      { year: '2019', text: 'Moda sahilinde ilk sohbet' },
      { year: '2022', text: 'Kadıköy’de ilk evimiz' },
      { year: '2026', text: 'Kapadokya’da gün doğarken “Evet”' },
      { year: '2027', text: 'Ve şimdi, sizinle' },
    ],
    events: [
      {
        title: 'Nikâh Töreni',
        time: '18:30',
        start: '2027-06-12T18:30:00+03:00',
        minutes: 45,
        ...venue,
        note: 'Boğaz’a karşı, yalının bahçesinde.',
      },
      {
        title: 'Akşam Yemeği ve Kutlama',
        time: '20:00',
        start: '2027-06-12T20:00:00+03:00',
        minutes: 240,
        ...venue,
        note: 'Bahçe terasında, gece yarısına kadar.',
      },
    ],
    directions: 'Yol tarifi',
    addToCalendar: 'Takvime ekle',
    calendarTitle: 'Selin & Arda’nın düğünü',
    program: [
      { time: '18:00', title: 'Karşılama', note: 'Boğaz’a karşı ilk kadehler' },
      { time: '18:30', title: 'Nikâh', note: '“Evet” dediğimiz an' },
      { time: '19:15', title: 'Kokteyl', note: 'Fotoğraflar ve sohbet' },
      { time: '20:00', title: 'Akşam yemeği', note: 'Uzun masada, hep birlikte' },
      { time: '22:00', title: 'İlk dans ve pasta', note: 'Işıklar biraz kısılacak' },
      { time: '22:30', title: 'Dans', note: 'Gece yarısına kadar' },
    ],
    menu: [
      { course: 'Başlangıç', dish: 'Zeytinyağlı enginar, taze otlar ve limon' },
      { course: 'Ara sıcak', dish: 'Safranlı risotto, fırında levrek' },
      { course: 'Ana yemek', dish: 'Ağır ateşte kuzu incik, közlenmiş sebzeler' },
      { course: 'Vejetaryen', dish: 'Mantar ve kestane dolması, adaçayı tereyağı' },
      { course: 'Tatlı', dish: 'Fıstıklı katmer, kaymaklı dondurma ve düğün pastası' },
    ],
    menuNote: 'Alerjiniz ya da özel bir beslenme tercihiniz varsa katılım formunda belirtmeniz yeterli.',
    gift: {
      text: 'Varlığınız bizim için en güzel hediye. Yine de bir şey yapmak isterseniz, yeni evimiz için açtığımız hesaba katkıda bulunabilirsiniz.',
      iban: 'TR00 0000 0000 0000 0000 0000 00',
      holder: 'Selin Yılmaz',
      copy: 'IBAN’ı kopyala',
      copied: 'Kopyalandı',
    },
    rsvp: {
      intro: 'Lütfen 15 Mayıs 2027’ye kadar yanıtlayın.',
      name: 'Adınız ve soyadınız',
      attending: 'Katılım',
      yes: 'Seve seve geliyorum',
      no: 'Maalesef gelemiyorum',
      guests: 'Kaç kişi geleceksiniz?',
      meal: 'Menü tercihi',
      meals: ['Standart', 'Vejetaryen', 'Çocuk menüsü'],
      message: 'Bize bir notunuz var mı?',
      messageHint: 'Alerji, şarkı isteği ya da güzel bir dilek…',
      send: 'Yanıtı gönder',
      thanksYes: 'Teşekkürler! Sizi aramızda görmek için sabırsızlanıyoruz.',
      thanksNo: 'Teşekkürler, sizi özleyeceğiz. Kalbiniz bizimle olsun.',
      edit: 'Yanıtı değiştir',
    },
    hashtag: '#SelinileArda',
    hashtagLine: 'Fotoğraflarınızı bu etiketle paylaşın; hepsini bir albümde toplayacağız.',
    footer: 'Sevgiyle, Selin & Arda',
  },
  en: {
    kicker: 'WE ARE GETTING MARRIED',
    intro: 'On the most beautiful day of our lives, we would love to have you with us.',
    dateLine: 'Saturday, 12 June 2027',
    placeLine: 'Yeniköy, Istanbul',
    countdownTitle: 'UNTIL THE BIG DAY',
    units: ['DAYS', 'HOURS', 'MINUTES', 'SECONDS'],
    countdownToday: 'Today is the day!',
    countdownAfter: 'We are married; thank you for being with us.',
    scrollHint: 'Explore the invitation',
    sections: {
      story: 'Our Story',
      event: 'Ceremony & Celebration',
      program: 'The Evening',
      menu: 'Menu',
      gift: 'Gifts',
      rsvp: 'RSVP',
    },
    story: [
      'It all began one autumn evening on the Moda shore. We were two strangers reading the same book; the books changed, the conversation never ended.',
      'Seven years, three cities and countless glasses of tea later, we are walking through the same door together. We would love to see you on the other side, and to write the most beautiful page of our story with you.',
    ],
    milestones: [
      { year: '2019', text: 'A first conversation by the sea in Moda' },
      { year: '2022', text: 'Our first home in Kadıköy' },
      { year: '2026', text: 'A sunrise “yes” in Cappadocia' },
      { year: '2027', text: 'And now, with you' },
    ],
    events: [
      {
        title: 'Wedding Ceremony',
        time: '18:30',
        start: '2027-06-12T18:30:00+03:00',
        minutes: 45,
        ...venue,
        note: 'In the garden of the waterside mansion, facing the Bosphorus.',
      },
      {
        title: 'Dinner & Celebration',
        time: '20:00',
        start: '2027-06-12T20:00:00+03:00',
        minutes: 240,
        ...venue,
        note: 'On the garden terrace, until midnight.',
      },
    ],
    directions: 'Directions',
    addToCalendar: 'Add to calendar',
    calendarTitle: 'Selin & Arda’s wedding',
    program: [
      { time: '18:00', title: 'Welcome', note: 'First glasses by the Bosphorus' },
      { time: '18:30', title: 'Ceremony', note: 'The moment we say “yes”' },
      { time: '19:15', title: 'Cocktails', note: 'Photos and conversation' },
      { time: '20:00', title: 'Dinner', note: 'All together at one long table' },
      { time: '22:00', title: 'First dance & cake', note: 'The lights will dim a little' },
      { time: '22:30', title: 'Dancing', note: 'Until midnight' },
    ],
    menu: [
      { course: 'To begin', dish: 'Artichokes in olive oil, fresh herbs and lemon' },
      { course: 'Warm course', dish: 'Saffron risotto, oven-roasted sea bass' },
      { course: 'Main', dish: 'Slow-cooked lamb shank, flame-roasted vegetables' },
      { course: 'Vegetarian', dish: 'Mushroom and chestnut dolma, sage butter' },
      { course: 'Dessert', dish: 'Pistachio katmer, clotted-cream ice cream and wedding cake' },
    ],
    menuNote: 'If you have allergies or dietary preferences, just let us know in the RSVP form.',
    gift: {
      text: 'Your presence is the most beautiful gift. If you would still like to give something, you are welcome to contribute to the fund for our new home.',
      iban: 'TR00 0000 0000 0000 0000 0000 00',
      holder: 'Selin Yılmaz',
      copy: 'Copy IBAN',
      copied: 'Copied',
    },
    rsvp: {
      intro: 'Kindly reply by 15 May 2027.',
      name: 'Your full name',
      attending: 'Will you join us?',
      yes: 'Joyfully accepts',
      no: 'Regretfully declines',
      guests: 'Number of guests',
      meal: 'Menu preference',
      meals: ['Standard', 'Vegetarian', 'Children’s menu'],
      message: 'A note for us?',
      messageHint: 'Allergies, a song request or a kind wish…',
      send: 'Send reply',
      thanksYes: 'Thank you! We can’t wait to celebrate with you.',
      thanksNo: 'Thank you, we will miss you. Keep us in your heart.',
      edit: 'Change reply',
    },
    hashtag: '#SelinileArda',
    hashtagLine: 'Share your photos with this tag; we will gather them all in one album.',
    footer: 'With love, Selin & Arda',
  },
  de: {
    kicker: 'WIR HEIRATEN',
    intro: 'Am schönsten Tag unseres Lebens möchten wir Sie an unserer Seite haben.',
    dateLine: 'Samstag, 12. Juni 2027',
    placeLine: 'Yeniköy, Istanbul',
    countdownTitle: 'BIS ZUM GROSSEN TAG',
    units: ['TAGE', 'STUNDEN', 'MINUTEN', 'SEKUNDEN'],
    countdownToday: 'Heute ist der große Tag!',
    countdownAfter: 'Wir sind verheiratet – danke, dass Sie bei uns waren.',
    scrollHint: 'Einladung entdecken',
    sections: {
      story: 'Unsere Geschichte',
      event: 'Trauung & Feier',
      program: 'Der Abend',
      menu: 'Menü',
      gift: 'Geschenke',
      rsvp: 'Zusage',
    },
    story: [
      'Alles begann an einem Herbstabend am Ufer von Moda. Wir waren zwei Fremde, die dasselbe Buch lasen; die Bücher wechselten, das Gespräch hörte nie auf.',
      'Sieben Jahre, drei Städte und unzählige Gläser Tee später gehen wir gemeinsam durch dieselbe Tür. Wir würden Sie gern auf der anderen Seite sehen und die schönste Seite unserer Geschichte mit Ihnen schreiben.',
    ],
    milestones: [
      { year: '2019', text: 'Das erste Gespräch am Meer in Moda' },
      { year: '2022', text: 'Unsere erste Wohnung in Kadıköy' },
      { year: '2026', text: 'Ein „Ja“ bei Sonnenaufgang in Kappadokien' },
      { year: '2027', text: 'Und jetzt, mit Ihnen' },
    ],
    events: [
      {
        title: 'Trauung',
        time: '18:30',
        start: '2027-06-12T18:30:00+03:00',
        minutes: 45,
        ...venue,
        note: 'Im Garten der Uferresidenz, mit Blick auf den Bosporus.',
      },
      {
        title: 'Abendessen & Feier',
        time: '20:00',
        start: '2027-06-12T20:00:00+03:00',
        minutes: 240,
        ...venue,
        note: 'Auf der Gartenterrasse, bis Mitternacht.',
      },
    ],
    directions: 'Route',
    addToCalendar: 'Zum Kalender',
    calendarTitle: 'Hochzeit von Selin & Arda',
    program: [
      { time: '18:00', title: 'Empfang', note: 'Die ersten Gläser am Bosporus' },
      { time: '18:30', title: 'Trauung', note: 'Der Moment unseres „Ja“' },
      { time: '19:15', title: 'Cocktails', note: 'Fotos und Gespräche' },
      { time: '20:00', title: 'Abendessen', note: 'Alle zusammen an einer langen Tafel' },
      { time: '22:00', title: 'Eröffnungstanz & Torte', note: 'Das Licht wird etwas gedämpft' },
      { time: '22:30', title: 'Tanz', note: 'Bis Mitternacht' },
    ],
    menu: [
      { course: 'Vorspeise', dish: 'Artischocken in Olivenöl, frische Kräuter und Zitrone' },
      { course: 'Zwischengang', dish: 'Safranrisotto, Wolfsbarsch aus dem Ofen' },
      { course: 'Hauptgang', dish: 'Geschmorte Lammhaxe, gegrilltes Gemüse' },
      { course: 'Vegetarisch', dish: 'Gefüllte Pilze mit Maronen, Salbeibutter' },
      { course: 'Dessert', dish: 'Pistazien-Katmer, Kaymak-Eis und Hochzeitstorte' },
    ],
    menuNote: 'Allergien oder besondere Ernährungswünsche können Sie einfach im Zusageformular angeben.',
    gift: {
      text: 'Ihre Anwesenheit ist das schönste Geschenk. Wenn Sie uns dennoch etwas schenken möchten, freuen wir uns über einen Beitrag für unser neues Zuhause.',
      iban: 'TR00 0000 0000 0000 0000 0000 00',
      holder: 'Selin Yılmaz',
      copy: 'IBAN kopieren',
      copied: 'Kopiert',
    },
    rsvp: {
      intro: 'Bitte antworten Sie bis zum 15. Mai 2027.',
      name: 'Ihr vollständiger Name',
      attending: 'Sind Sie dabei?',
      yes: 'Ich komme sehr gern',
      no: 'Leider kann ich nicht',
      guests: 'Anzahl der Gäste',
      meal: 'Menüwunsch',
      meals: ['Standard', 'Vegetarisch', 'Kindermenü'],
      message: 'Eine Nachricht an uns?',
      messageHint: 'Allergien, ein Musikwunsch oder ein lieber Gruß…',
      send: 'Antwort senden',
      thanksYes: 'Danke! Wir freuen uns sehr darauf, mit Ihnen zu feiern.',
      thanksNo: 'Danke, wir werden Sie vermissen. Feiern Sie in Gedanken mit.',
      edit: 'Antwort ändern',
    },
    hashtag: '#SelinileArda',
    hashtagLine: 'Teilen Sie Ihre Fotos mit diesem Hashtag; wir sammeln alle in einem Album.',
    footer: 'In Liebe, Selin & Arda',
  },
};
