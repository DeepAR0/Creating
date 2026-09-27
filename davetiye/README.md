# Mühürlü Davetiyeler — hareketli dijital davetiye motoru

Telefonda dikey, tam ekran açılan; kabartmalı zarfı mühür kırılarak açılan ve hikâyesi
kaydırdıkça sahne sahne anlatılan dijital davetiyeler. Bağımlılık yok: düz HTML + CSS +
JavaScript. Her davetiye tek bir HTML dosyasıdır; bilgiler dosyadaki tek bir yapılandırma
bloğundan gelir.

| Demo | Tema | Tür |
| --- | --- | --- |
| `dugun-barok.html` | Barok — "Saray Salonu" | Düğün |
| `dogum-gunu-gotik.html` | Gotik — "Gece Katedrali" | Doğum günü |
| `index.html` | Katalog / vitrin sayfası | — |

Sonuna `#hikaye` eklenen bağlantı zarfı atlayıp doğrudan hikâyeyi açar
(ör. `dugun-barok.html#hikaye`).

## Deneyim

1. **Zarf** — WebGL ile çizilen kabartmalı zarf. Işık parmağı ve telefonun eğimini izler;
   yaldızlar parlar, fresk mat kalır, vitray arkadan aydınlanır. WebGL yoksa önceden
   ışıklandırılmış görsel (`zarf-pisik.webp`) gösterilir.
2. **Mühür** — dokununca mühür iki parçaya kırılır, mum kırıntıları saçılır, kapak 3B açılır,
   kart yükselir ve kamera zarfın ağzından içeri dalar. Müzik bu dokunuşla başlar.
3. **Hikâye** — yapışkan (sticky) sahneler; her sahnenin animasyonu kaydırma ilerlemesine
   bağlıdır (yumuşatılmış). Geri kaydırınca her şey tersine oynar.

**Barok düğün:** kadife perde → kubbe freskine uçuş → yaldız çerçeveli tablo galerisi →
parşömen davet ve mühür → dönen altın madalyon + geri sayım → sarmaşık program →
saray çizimi + yol tarifi → mühürlü LCV mektubu → gül yaprakları ve kapanan perde.

**Gotik doğum günü:** portal kapıları → mum ışıklı nefte uçuş, gül pencerede yaş →
vitray pencerelerde yıllar → tüy kalemle yazılan el yazması → astronomik saat + geri sayım →
tutuşan mumlarla program → pencereden mekan → LCV → pastanın mumlarını üfleme (konfeti, çan).

## Klasör yapısı

```
davetiye/
  index.html                 katalog sayfası
  dugun-barok.html           demo davetiye (barok)
  dogum-gunu-gotik.html      demo davetiye (gotik)
  motor/
    cekirdek.js              yapılandırma, sahne motoru, geri sayım, takvim, yol tarifi, LCV, paylaş
    zarf.js                  WebGL zarf ve açılış animasyonu
    muzik.js                 WebAudio müzik ve ses efektleri
    davetiye.css             ortak stiller
  temalar/
    barok/  tema.js, tema.css, gorsel/   (zarf dokuları, perde, kubbe, tablolar…)
    gotik/  tema.js, tema.css, gorsel/   (zarf dokuları, portal, vitraylar…)
  yazitipleri/               Türkçe alt kümeli gömülü yazı tipleri (OFL)
  araclar/                   görselleri üreten Python betikleri
```

## Yeni davetiye oluşturma

1. Uygun demo dosyasını kopyalayın (ör. `dugun-barok.html` → `ayse-mehmet.html`).
2. Dosyadaki `window.DAVETIYE = { … }` bloğunu düzenleyin.
3. `<title>`, `description` ve `og:*` etiketlerini güncelleyin. `og:image` WhatsApp önizlemesi
   için **mutlak adres** olmalıdır (ör. `https://evetde.com.tr/davetiye/temalar/barok/gorsel/paylasim.jpg`).
4. Klasörü sunucuya yükleyin. Başka hiçbir şey gerekmez.

### Yapılandırma alanları

| Alan | Açıklama |
| --- | --- |
| `tema` | `'barok'` veya `'gotik'` |
| `tur` | `'dugun'`, `'dogumgunu'`… (yalnızca sınıf adı olarak kullanılır) |
| `baslik` | Sekme başlığı |
| `monogram` | Mühürde yazan harfler (`'A&M'`, `'D'`) |
| `gelin`, `damat` | `{ ad, soyad, anne, baba }` — düğün; aile satırı Türkçe iyelik ekiyle kurulur (Yılmaz'ın, Kaya'nın). Özel metin için `aileMetni` |
| `kisi`, `yas` | Doğum günü: `{ ad, soyad }` ve yaş (pastadaki rakam mumları) |
| `tarih` | ISO tarih-saat, saat dilimiyle: `'2027-06-12T19:00:00+03:00'` |
| `saatDilimi` | Saatin gösterileceği dilim (varsayılan `'Europe/Istanbul'`). Misafir yurt dışında olsa da etkinlik saati doğru görünür |
| `sureSaat` | Takvim etkinliğinin süresi (saat) |
| `mekan` | `{ ad, adres, koordinat: [enlem, boylam], harita }` |
| `hikaye` | `[{ yil, baslik, metin, sahne \| foto, simge, renk }]` — barokta `sahne`: `deniz`, `balon`, `gece` ya da kendi fotoğrafınız için `foto: 'resim.jpg'`; gotikte `renk`: `safir`, `yakut`, `zumrut`, `ametist` ve `simge`: `yildiz`, `kalp`, `tac`, `kitap`, `pusula`, `maske`, `anahtar`, `ay`, `hediye` |
| `davetMetni` | Davet paragrafı |
| `kiyafet` | (gotik) kıyafet notu |
| `program` | `[{ saat, baslik, aciklama, ikon }]` — `ikon`: `kadeh`, `yuzuk`, `yemek`, `muzik`, `pasta`, `kamera`, `dans`… |
| `lcv` | `{ sonTarih, whatsapp, endpoint, enFazla }` (aşağıya bakın) |
| `muzik` | `{ parca: 'kanon' \| 'dogumgunu' }` ya da kendi dosyanız: `{ kaynak: 'muzik.mp3' }`; `ses: 0..1`, `efekt: false` |
| `kapanis` | Kapanış cümlesi |
| `metin` | Arayüz metinlerini değiştirmek için (ör. `{ muhurIpucu: 'Dokunun', zarfUst: 'DÜĞÜN DAVETİYESİ' }`) — tüm anahtarlar `motor/cekirdek.js` içindeki `VARSAYILAN_METIN` listesinde |
| `zarfsiz` | `true` ise zarf gösterilmez |

### Misafire özel bağlantı

Bağlantıya `?kisi=` eklenirse misafirin adı zarftaki kurdelede ("Sayın Ayşe Hanım ve Ailesi")
ve LCV formunda hazır görünür:

```
https://evetde.com.tr/davetiye/ayse-mehmet.html?kisi=Ayşe+Hanım+ve+Ailesi
```

Katalog sayfasındaki araç bu bağlantıyı üretir. Gotik temada el yazması hitabı da bu adı kullanır.

## Katılım (LCV) yanıtları

- **Yalnızca WhatsApp:** `lcv.whatsapp: '905551112233'` — "Yanıtı Gönder" doğrudan hazır
  doldurulmuş bir WhatsApp mesajı açar (açılır pencere engeline takılmaz).
- **Kendi sunucunuz:** `lcv.endpoint: 'https://…'` — form şu JSON'u POST eder
  (gövde JSON, başlık `text/plain` — tarayıcı ön kontrol isteği yapmaz):

  ```json
  { "ad": "Ayşe Yılmaz", "katilim": "evet", "kisi": 2, "not": "…", "davetiye": "…", "tarih": "2027-05-01T10:00:00.000Z" }
  ```

- **Google E-Tablolar (sunucusuz):** E-tabloda *Uzantılar → Apps Script* açın, aşağıdaki kodu
  yapıştırın, *Dağıt → Web uygulaması* (Erişim: Herkes) seçin ve verilen adresi `endpoint` yapın:

  ```js
  function doPost(e) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sayfa = ss.getSheetByName('LCV') || ss.insertSheet('LCV');
    var v = JSON.parse(e.postData.contents);
    sayfa.appendRow([new Date(), v.ad, v.katilim, v.kisi, v.not, v.davetiye]);
    return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);
  }
  ```

İkisi de boş bırakılırsa (demolardaki gibi) yanıt yalnızca misafirin tarayıcısında saklanır.
Yanıt gönderen misafir sayfayı yeniden açtığında "yanıtınız alındı" durumunu görür.

## Siteye entegrasyon

- Tamamen statik dosyalardır: `davetiye/` klasörünü sitenizin altına (ör. `/davetiye/`)
  yüklemeniz yeterli. Görseller `fetch`/WebGL ile okunduğu için davetiye ve görseller
  **aynı alan adından** sunulmalıdır (görselleri ayrı bir CDN'e koyacaksanız CORS başlığı gerekir).
- Dosyayı doğrudan diskten (`file://`) açmak WebGL dokularını engeller; yerelde denemek için:

  ```
  cd davetiye && python3 -m http.server 8000
  # http://localhost:8000/dugun-barok.html
  ```

- Müşteri paneli / sipariş sistemi kuracaksanız: sunucu tarafında demo HTML'yi şablon olarak
  kullanıp yalnızca `window.DAVETIYE` bloğunu müşterinin bilgileriyle doldurmanız yeterli.
  Motor ve tema dosyaları tüm davetiyelerde ortaktır ve tarayıcıda önbelleğe alınır.
- Zarf ilk açılışta ~0.8 MB doku indirir; astar ve kapak iç yüzü arka planda yüklenir.
  Bir davetiyenin toplam ağırlığı yaklaşık 2.5–3 MB'tır.

## Görselleri yeniden üretmek

Tüm zarf dokuları, fresk, perde, kubbe, vitray, çerçeve ve tablolar kodla üretilir:

```
cd davetiye/araclar
pip install -r requirements.txt
python3 barok_zarf.py      # barok zarf dokuları + zarf.json
python3 barok_sahne.py     # perde, kubbe, bulutlar, çerçeve, tablolar, parşömen, madalyon
python3 gotik_zarf.py      # gotik zarf dokuları + zarf.json
python3 gotik_sahne.py     # portal, kapılar, nef kemeri, gül pencere, vitraylar
python3 paylasim.py        # paylaşım (og:image) ve katalog kapak görselleri
```

Renk, motif ve yerleşim parametreleri betiklerin başındadır (ör. `PAPER`, `GOLD_A`,
`FRESCO_C`). `zarf.json`; mühürün, isim kurdelesinin ve zarf ağzının konumlarını tarayıcıya bildirir.

## Yeni tema eklemek

`temalar/<ad>/tema.js` içinde `Davetiye.temaKaydet('<ad>', { gorselYolu, muzik, fontlar,
kart(cfg), hikaye(cfg), sahneler(cfg, D, kok) })` tanımlayın. Sahneler
`D.sahne.kaydet(bolum, function (p) { … })` ile kaydedilir; `p` 0→1 kaydırma ilerlemesidir.
Zarf dokularını `barok_zarf.py` / `gotik_zarf.py` örnek alınarak üretebilirsiniz.

## Tarayıcı desteği ve erişilebilirlik

- iOS Safari 15+, Android Chrome, masaüstü tarayıcılar. WebGL yoksa yedek görsel kullanılır.
- "Hareketi azalt" tercihinde animasyonlar kısalır; tüm metinler gerçek HTML metnidir.
- Mühür bir düğmedir (klavyeyle de açılır); müzik yalnızca kullanıcı dokununca başlar ve
  sağ üstteki düğmeyle kapatılır.

## Lisanslar

- Yazı tipleri SIL Open Font License 1.1 ile dağıtılır (`yazitipleri/OFL-*.txt`).
  Ayrılmış font adı taşıyan iki yazı tipinin alt kümeleri yeniden adlandırılmıştır
  (`Davetiye Fraktur`, `Davetiye Suslu`).
- Dahili müzikler kamu malı eserlerin (Pachelbel — Kanon; "İyi ki doğdun" ezgisi) kodla
  sentezlenmiş düzenlemeleridir; ses dosyası içermez.
- Tüm görseller bu depodaki betiklerle üretilmiştir. Demo bilgileri kurgusaldır.
