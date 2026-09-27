# Fildişi Rölyef — dışa aktarma paketi

Bu klasör EVET projesindeki **Fildişi Rölyef** davetiye tasarımının üretimde kullanılan açılış deneyimini, mühür sistemini ve görsel varlıklarını içerir.

## Paketin içeriği

- Çift kanatlı, kabartma haritalı WebGL kapı
- Kapıya gömülü, kırılabilen şampanya balmumu mühür
- Kabartmalar üzerinde dolaşan ışık izleri
- Mobil tam ekran açılış ve WebGL kullanılamadığında CSS yedeği
- Açılış sesleri ve titreşim geri bildirimi
- Fildişi tasarımına özel etkileşimli çiçek/rölyef bölümü
- Kapı, iç sahne, kabartma haritası ve hareket çalışması görselleri

## Klasörler

- `public/`: Kullanıma hazır görsel varlıklar
- `source/app/davet/[token]/`: Kapı sahnesi, React açılış bileşeni ve Fildişi iç etkileşimi
- `source/components/`: Yeniden kullanılabilir balmumu mühür bileşeni
- `source/lib/`: Tema ayarları, mühür çizimi, sesler ve gerekli tipler
- `source/app/*.css`: Üretimde kullanılan hareket ve görünüm stilleri
- `example/`: Bileşenin en küçük kullanım örneği
- `preview/`: Tasarımın ışık/rölyef hareket çalışması

## Gereken paketler

```json
{
  "gsap": "3.15.0",
  "react": "19.2.6",
  "react-dom": "19.2.6",
  "three": "0.186.1"
}
```

Kod `@/` yol takma adının uygulamanın kaynak kökünü göstermesini bekler. Kaynak dosyaları aynı dizin yapısıyla bir React/Next/Vite projesine kopyalayın ve aşağıdaki stilleri global giriş dosyanıza ekleyin:

```ts
import './app/three-door.css';
import './app/sealed-doors.css';
import './app/ivory-experience.css';
```

Görseller `public/` köküne kopyalandığında mevcut `/rolyef-door.webp`, `/rolyef-scene.webp` ve `/rolyef-relief-mask.png` yolları değişmeden çalışır.

## Tasarım kimliği

- Tema anahtarı: `rolyef`
- Kapı malzemesi: Fildişi lake
- Rölyef: Kabartma zambak
- Metal: Şampanya altın
- Açılış ritüeli: Mühre dokunma
- Varsayılan süre: 5200 ms
- Öncelikli yüzey: Mobil, en fazla 480 px sahne genişliği

Bu paket kaynak projeden 27 Eylül 2026 tarihinde alınmıştır.
