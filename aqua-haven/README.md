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
- **Sezon etkinlikleri:** Yılda 4 festival takvime göre kendiliğinden başlar: Bahar (20 Mart–20 Nisan, +%25 büyüme), Yaz (1 Temmuz–15 Ağustos, +%50 ziyaretçi geliri), Cadılar Bayramı (15 Ekim–7 Kasım, +%25 GP) ve Kış (10 Aralık–10 Ocak, +%25 satış fiyatı). Her festivalde 4 görev, yalnızca o sırada satılan bir dekor, etkinliğe özel renkte bir balık ve tüm görevler bitince kazanılan efsanevi bir dekor vardır. Etkinlik renkleri rastgele mutasyonla çıkmaz, yalnızca ebeveynden yavruya geçer.
- **Fotoğraf modu:** Arayüzü gizleyip kareyi ayarlarsınız, ışıkları açıp kapatabilirsiniz. Fotoğraf köşesinde logo ile kaydedilir ve iOS paylaşım menüsüyle paylaşılır. Günlük görevlerden biri de "fotoğraf çek" olabilir.
- **Game Center:** 3 sıralama (seviye, en güzel akvaryum, toplam kazanç) ve 14 başarım vardır. Başarımlar oyundaki kademelere göre yüzde yüzde ilerler. Bağlantı, harici bir eklenti olmadan `ios/App/App/AquaNativePlugin.swift` içinde yapılır.
- **Öğretici:** Yeni oyuncuya 8 adımda besleme, balık inceleme, yosun temizleme, mağaza ve görevler gösterilir; tamamlayınca küçük bir ödül verilir.
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

Tarayıcı önizlemesinde reklamlar ve satın almalar **sahte** çalışır, böylece akışları test edebilirsiniz. Bir etkinliği tarihini beklemeden denemek için adrese `?event=halloween` (ya da `#event-halloween`) ekleyin; `spring`, `summer` ve `winter` de geçerlidir.

```bash
npm run balance -- --hours 110 --session 10 --gap 240 --feed 10   # denge simülasyonu (bot oyuncu)
node scripts/store-shots.mjs                                     # App Store ekran görüntüleri (dev sunucusu açıkken)
node scripts/make-gc-images.mjs                                  # Game Center başarım görselleri (dev sunucusu açıkken)
```

`.github/workflows/aqua-haven.yml` her push'ta tip denetimi, test ve web derlemesi yapar. Ayrıca macOS üzerinde Xcode ile imzasız iOS simülatör derlemesi alır.

### Denge (bot simülasyonu sonuçları)

Günde ~6 kez 10 dakika oynayan, 10 dakikada bir besleyen ve otomatik yemlik alan bir oyuncu için:

| Seviye | 5 | 10 | 15 | 20 | 25 | 30 | 50 |
|---|---|---|---|---|---|---|---|
| Gün | 1 | 3 | 8 | 16 | 26 | 41 | ~100 |

Oyun hızını `src/game/balance.ts` içindeki `xpToNext`, satış ve büyüme sabitleriyle değiştirebilirsiniz.

## App Store'a yayınlama (adım adım)

**Gerekenler:** Mac + Xcode 16 veya üzeri, Apple Developer Program üyeliği (yıllık 99 $), AdMob hesabı ve RevenueCat hesabı (ücretsiz başlar).

1. **Kimlikleri doldurun.**
   - `capacitor.config.ts` → `appId` alanına kendi Bundle ID'nizi yazın (örn. `com.sirketiniz.aquahaven`).
   - `src/config/app.ts` → destek e-postası, gizlilik politikası URL'si, AdMob kimlikleri, RevenueCat API anahtarı. Yayında `ADS.testing = false` yapın.
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier` değerine kendi AdMob uygulama kimliğinizi yazın. `SKAdNetworkItems` içinde Google'ın önerdiği 49 kimlik hazırdır (2024 sonu listesi). Yayından önce [Google'ın güncel listesiyle](https://developers.google.com/admob/ios/3p-skadnetworks) karşılaştırın.
2. **Derleyip Xcode'u açın.**
   ```bash
   npm install
   npm run ios        # build + cap sync ios + Xcode'u açar
   ```
   Xcode'da: App hedefi → *Signing & Capabilities* → Team seçin ve **In-App Purchase** yeteneğini ekleyin. **Game Center** yetkisi `App.entitlements` dosyasında hazırdır; Xcode bunu App ID'nize kendisi ekler. Gizlilik manifesti (`PrivacyInfo.xcprivacy`) ve Türkçe/İngilizce izin metinleri projeye zaten eklidir. Önce gerçek bir cihazda test edin.
3. **App Store Connect'i hazırlayın.**
   - Yeni uygulama oluşturun (aynı Bundle ID). Kategori olarak *Games → Simulation* seçin.
   - **Uygulama İçi Satın Almalar:** `src/config/monetization.ts` dosyasındaki kimliklerle birebir ürün oluşturun:
     - Tüketilebilir: `aquahaven.pearls.80`, `.500`, `.1200`, `.2600`, `.7000`
     - Tüketilemez: `aquahaven.removeads`, `aquahaven.starterpack`
     - Otomatik yenilenen abonelik: `aquahaven.vip.monthly`
   - **RevenueCat:** Uygulamayı ekleyin, App Store Connect paylaşılan gizli anahtarını ve In-App Purchase anahtarını girin. `no_ads` ve `vip` adlı iki entitlement tanımlayın; ilgili ürünleri bu entitlement'lara bağlayın.
   - **Gizlilik:** `docs/gizlilik-politikasi.md` dosyasını bir web sayfasında yayınlayın ve URL'sini girin. App Privacy formunda şunları bildirin: Tanımlayıcılar (reklam, takip), Satın Alma Geçmişi (işlevsellik), Kullanım/Tanılama verileri (AdMob).
   - **Yaş derecelendirmesi:** Reklam ve uygulama içi satın alma içerir. Sürpriz Yumurta olasılıkları oyun içinde gösterilir (Apple kuralı 3.1.1).
   - **Ekran görüntüleri:** `store-assets/screenshots/` klasöründe iPhone 6.9" ve iPad 13" için Türkçe ve İngilizce hazır görüntüler var.
   - **Game Center:** Uygulama sürümü sayfasında Game Center'ı açın. 3 sıralama ve 14 başarımı `docs/app-store-metinleri.md` dosyasındaki tablolara göre oluşturun. Başarım görselleri `store-assets/game-center/` klasöründedir.
   - **Mağaza metinleri:** Ad, alt başlık, açıklama, anahtar kelimeler, inceleme notu ve ürün tablosu `docs/app-store-metinleri.md` dosyasında.
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
