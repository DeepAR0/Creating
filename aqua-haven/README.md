# Aqua Haven — Akvaryum Tycoon (iOS)

Yatay ekranda oynanan bir akvaryum simülasyonu. Balıkları besleyip büyütür, satar, akvaryumu dekore eder ve seviye atladıkça daha büyük tanklara geçersiniz. Oyun TypeScript ve Canvas ile yazıldı, Capacitor 8 ile iOS uygulamasına paketlendi. Tüm çizimler ve sesler kodla üretiliyor; harici görsel ya da ses dosyası kullanılmıyor.

## Oyunda neler var

- **Besleme ve büyüme:** Suya yem atılır, balıklar yemin peşinden yüzer. Tok kalan balık yavru → genç → yetişkin evrelerinden geçer ve büyüdükçe Gelişim Puanı (GP) kazandırır. Altı çeşit yem vardır; her birinin beslenme tipine (etçil/otçul/hepçil) göre etkisi farklıdır.
- **Satış ekonomisi:** Satış değeri büyüme oranına, sağlığa ve mutluluğa göre hesaplanır. Her gün iki "gözde tür" +%50 fiyatla satılır. Ayrıca akvaryumun güzelliğine göre ziyaretçi geliri birikir.
- **Gerçekçi bakım:** Su kalitesi (kirlilik), oksijen, sıcaklık, camda yosun ve dipte kir takip edilir. Sünger, sifon, su değişimi ve ilaç ile bakım yapılır. Isıtıcı, soğutucu, filtre, hava motoru, ışık, UV, otomatik yemlik ve CO₂ gibi ekipmanlar vardır. Hastalık, gece modu ve çevrimdışı ilerleme de simüle edilir.
- **44 canlı:** Tatlı su ve deniz balıklarının yanında karides, salyangoz, yengeç, kerevit, kurbağa, aksolotl, denizanası, denizatı ve deniz yıldızı bulunur. Her türün gerçek bakım bilgisi ve bir ilginç bilgisi vardır.
- **Özellikli balıklar:** GP Aurası (tüm tanka ek GP), Bilge (+GP), Hızlı Büyüyen, Altın Pul (daha değerli), Şanslı (altın/inci baloncuğu bırakır), Yosun Yiyici, Temizlikçi ve Şifacı gibi özellikler vardır.
- **Üreme:** Değerli türler belirli koşullarda ürer. Gerekenler: yetişkin erkek-dişi çift, yeterli mutluluk, su kalitesi ve sıcaklık, uygun yuva (mağara, geniş yaprak, yüzen bitki, deniz şakayığı vb.) ve tankta boş yer. Süreç kur → yumurta → yavru şeklinde ilerler ve yavruda nadir renk mutasyonu çıkabilir.
- **Tank kademeleri:** Tatlı suda 20 L'den 1000 L'ye 6 kademe vardır. 12. seviyede ayrı bir resif (tuzlu su) akvaryumu açılır. Oyunda 18 bitki/mercan, 24 dekor ve 7 tema bulunur.
- **Görevler:** Günde 3 görev ve bir bonus sandığı, 7 günlük giriş takvimi ve 14 başarım var.
- **Gelir modeli:**
  - AdMob ödüllü reklamlar oyuncunun isteğine bağlıdır (bedava inci, x2 gelir, hızlandırma). Araya giren reklamlar seyrek ve sınırlıdır.
  - Uygulama içi satın almalar RevenueCat üzerinden yapılır: inci paketleri, Reklamları Kaldır, Başlangıç Paketi ve VIP aylık abonelik.
- **Dil:** Türkçe ve İngilizce, cihaz diline göre otomatik seçilir.

## Geliştirme

```bash
npm install
npm run dev        # tarayıcıda: http://localhost:5173  (?demo=fresh / ?demo=marine hazır sahne)
npm test           # birim testleri
npm run build      # üretim derlemesi (dist/)
```

Tarayıcı önizlemesinde reklamlar ve satın almalar **sahte** çalışır, böylece akışları test edebilirsiniz.

## App Store'a yayınlama (adım adım)

**Gerekenler:** Mac + Xcode 16 veya üzeri, Apple Developer Program üyeliği (yıllık 99 $), AdMob hesabı ve RevenueCat hesabı (ücretsiz başlar).

1. **Kimlikleri doldurun.**
   - `capacitor.config.ts` → `appId` alanına kendi Bundle ID'nizi yazın (örn. `com.sirketiniz.aquahaven`).
   - `src/config/app.ts` → destek e-postası, gizlilik politikası URL'si, AdMob kimlikleri, RevenueCat API anahtarı. Yayında `ADS.testing = false` yapın.
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier` değerine kendi AdMob uygulama kimliğinizi yazın. Google'ın güncel `SKAdNetworkItems` listesini de buraya ekleyin.
2. **Derleyip Xcode'u açın.**
   ```bash
   npm install
   npm run ios        # build + cap sync ios + Xcode'u açar
   ```
   Xcode'da: App hedefi → *Signing & Capabilities* → Team seçin ve **In-App Purchase** yeteneğini ekleyin. `PrivacyInfo.xcprivacy`, `tr.lproj` ve `en.lproj` klasörlerini App hedefine sürükleyin. Önce gerçek bir cihazda test edin.
3. **App Store Connect'i hazırlayın.**
   - Yeni uygulama oluşturun (aynı Bundle ID). Kategori olarak *Games → Simulation* seçin.
   - **Uygulama İçi Satın Almalar:** `src/config/monetization.ts` dosyasındaki kimliklerle birebir ürün oluşturun:
     - Tüketilebilir: `aquahaven.pearls.80`, `.500`, `.1200`, `.2600`, `.7000`
     - Tüketilemez: `aquahaven.removeads`, `aquahaven.starterpack`
     - Otomatik yenilenen abonelik: `aquahaven.vip.monthly`
   - **RevenueCat:** Uygulamayı ekleyin, App Store Connect paylaşılan gizli anahtarını ve In-App Purchase anahtarını girin. `no_ads` ve `vip` adlı iki entitlement tanımlayın; ilgili ürünleri bu entitlement'lara bağlayın.
   - **Gizlilik:** `docs/gizlilik-politikasi.md` dosyasını bir web sayfasında yayınlayın ve URL'sini girin. App Privacy formunda şunları bildirin: Tanımlayıcılar (reklam, takip), Satın Alma Geçmişi (işlevsellik), Kullanım/Tanılama verileri (AdMob).
   - **Yaş derecelendirmesi:** Reklam ve uygulama içi satın alma içerir. Sürpriz Yumurta olasılıkları oyun içinde gösterilir (Apple kuralı 3.1.1).
   - **Ekran görüntüleri:** 6.9"/6.7" iPhone ve 13" iPad, yatay. Tarayıcıda `?demo=fresh` ile hazır sahne açıp çekebilirsiniz.
4. **Gönderin.** Xcode'da *Product → Archive → Distribute App → App Store Connect*. Ardından TestFlight'ta deneyip incelemeye gönderin.

## Proje yapısı

```
src/data/        türler, bitkiler, dekorlar, ekipman, yemler, tanklar, görevler
src/game/        durum, simülasyon (su, balık, üreme, ekonomi, görevler), eylemler, kayıt
src/render/      Canvas sahnesi, prosedürel çizim, balık yapay zekâsı, dokunmatik girdi
src/ui/          Preact arayüzü (HUD, mağaza, bakım, üreme, görevler, inci mağazası)
src/services/    AdMob, RevenueCat, ses sentezi, titreşim, bildirimler
src/i18n/        Türkçe/İngilizce metinler
ios/             Xcode projesi (Swift Package Manager)
```

Denge ayarları (büyüme hızı, fiyatlar, GP eğrisi, kirlilik hızı) `src/game/balance.ts` ve `src/data/*.ts` dosyalarındadır.
