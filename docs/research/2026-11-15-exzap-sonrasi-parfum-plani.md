# exzap'tan sonra: ne aldık, parfüm satıcısı olarak sırada ne var

_Tarih: 2026-11-15 · Önceki belge: `2026-10-09-exzap-benchmark.md` · Kapsam: `apps/store`_

## Kısa sonuç

- exzap'tan alınabilecek genel e-ticaret mekaniklerinin 15'inden 13'ü kodda. Kalan ikisi (taksit, Uzum Market mağazası) bilinçli olarak yapılmadı.
- Asıl açık artık kodda değil, **açma ve ölçme** tarafında: birkaç özellik ortam değişkeni girilmeden çalışmıyor, PR #19 üç haftadır merge bekliyor, sitenin satış verisini henüz hiç görmedik.
- exzap bir oto parça mağazası. Parfümün asıl sorunu olan "koklamadan almak" için ondan öğrenecek bir şey yok. Sıradaki işler parfüme özel: keşif setleri, numuneden 10 ml'ye geçiş kredisi, hediye, yorum isteme.
- İlk tarih Yeni Yıl. Altı hafta var; hediye seti ve teslimat son günü 1 Aralık'ta yayında olmalı.

## Yöntem ve sınır

- **Kod:** her madde bu depoda doğrulandı (branch `claude/beautiful-planck-i5cc78`, `main` + PR #19).
- **Canlı site ve veriler:** görülemedi. Sunucudaki `.env`, admin'deki kodlar ve kampanyalar, sipariş sayıları bu ortamdan okunamıyor.
- **Dış araştırma:** exzap.uz ve dekant satıcılarının siteleri ağ politikası yüzünden yine açılamadı. Bulgular arama motorlarındaki sayfa özetlerinden geliyor; fiyat ve ifade ayrıntıları canlı kontrol ister. Kanıt gücü aşağıda **[veri]**, **[satıcı beyanı]**, **[uygulama]**, **[çıkarım]** diye işaretli.

## 1. exzap listesinden ne alındı

"main'de" = merge edildi. Sunucuda en son doğruladığım sürüm `cfc9c00`; PR #18 ondan sonra merge edildi, deploy edildiğini görmedim.

| # | Madde | Durum | Eksik kalan |
| --- | --- | --- | --- |
| 1 | "сум / soʻm" etiketi | main'de, deploy doğrulandı | — |
| 2 | SEO temeli (sitemap, robots, metadata, hreflang, ürün JSON-LD) | main'de, deploy doğrulandı | Nota ve parfümör sayfaları hâlâ kataloğa yönlendiriyor |
| 3 | Marka landing sayfaları | main'de, deploy doğrulandı | Aynısı notalar için yapılmadı |
| 4 | Seçim yardımı (kviz + talep formu, admin'e ve Telegram'a düşer) | main'de, deploy doğrulandı | Kviz sonucu satın alınabilir bir sete bağlanmıyor |
| 5 | İletişim ve güven bloğu | main'de (#18), deploy doğrulanmadı | Çalışma saatleri ve harita linkleri boş (`lib/store-contact.ts:42,51,54`) |
| 6 | Favoriler | main'de, deploy doğrulandı | — |
| 7 | Promo kodları, ilk sipariş bonusu, N+1 | main'de (N+1 #18'de) | Kodların admin'de oluşturulmuş olması gerekir |
| 8 | Kampanyalar vitrinde | main'de, deploy doğrulandı | "Yeni gelenler" ve "çok satanlar" sayfası yok |
| 9 | Ücretsiz teslimat eşiği | main'de | `FREE_DELIVERY_TASHKENT_FROM` boşsa kapalı |
| 10 | Telegram duyurusu, `/start`'ta ilk sipariş kodu | main'de | Botun menü butonu koddan ayarlanmıyor |
| 11 | Analitik (Metrica, GA4, Meta Pixel + CAPI) | main'de (Meta #18'de) | ID'ler `.env`'de yoksa hiçbir şey ölçülmez |
| 12 | Uzum ödemesi, taksit | Yapılmadı | Bilinçli (bkz. bölüm 6) |
| 13 | Ürün feed'i (`/feed.yml`, admin CSV) | main'de | Uzum'da mağaza açılmadı (bkz. bölüm 6) |
| 14 | Alıcı yorumları | main'de | Form kalıcılık ve yayılımı sormuyor (teslim bildirimi yorum davetini zaten içeriyor) |
| 15 | Kurumsal talep formu | main'de | — |

**PR #19'da bekleyenler (24 Ekim'den beri taslak):** 25. gün "yenileme" hatırlatması, deodorant lansman sayfası, parfüm hikâye sayfası, Antigravity kuralları.

## 2. exzap'ta yeni görülenler

Hepsi arama özetlerinden; sayfa görülmedi.

| Bulgu | Labor için |
| --- | --- |
| "Bonus CLUB" menüde; şartları görülemedi | Sadakat mekaniği gerekli; biçimi bölüm 4'te |
| "İlk 3 alışverişe indirim" banner'ı | Tek seferlik bonustan iyi: ikinci ve üçüncü siparişi de teşvik ediyor. Numune kredisiyle aynı işi görür (4.2) |
| `/hits` çok satanlar sayfası | Al (4.7). Bizde "popüler" sıralaması Fragrantica puanına göre, satışa göre değil (`lib/catalog/products.ts:186`) |
| Alışverişe hediye (kupa) | Parfümde karşılığı: siparişe 1 ücretsiz numune. İş kararı |
| "14 kun ichida qaytarish" + ayrı iade sayfası | İade ve değişim sayfamız yok. Açılmış dekant iade edilmez; bunu açıkça yazmak güven verir (4.8) |
| "5–10 dakikada seçim" sözü, ayrı danışman hesabı | Talep formuna yanıt süresi sözü ekle; ancak şubeler tutabiliyorsa |
| Kategori sayfalarında "nasıl seçilir" metinleri, "Jurnal" | Nota ve aile sayfalarına kısa rehber metni (4.6) |
| "Garaj" (kayıtlı araç) | Karşılığı "koku profilim": kviz sonucu + favoriler + alınanlar. Sonraya |
| Uzum taksiti | Almıyoruz |

Bulunamayanlar: referans programı, promo kodu, paket teklif, yorum, sipariş takibi.

## 3. Parfüm satarken neyi doğru yapmak gerekir

1. **Koklamadan alma engeli asıl sorundur.** Yeni başlayanların %15'i, deneyimlilerin %30'u koklamadan alır [veri, Highsnobiety]. 2 ml numune bizim cevabımız; ama numune bugün tek tek seçiliyor ve 10 ml'ye bağlanmıyor.
2. **Küçük boy ve keşif seti büyüyen formattır.** ABD prestij parfümde mini/keşif setleri 2025 3. çeyrekte adet olarak +%41 [veri, Circana]. Dekant satıcılarının hepsi tema, mevsim veya marka setleri satıyor [uygulama: ScentSplit, Luckyscent].
3. **Numuneyi büyük boya bağlayan kredi yaygın uygulamadır.** Sephora setine tam boy kuponu koyar; The Fragrance World 90 gün geçerli kredi verir [uygulama]. Dönüşüm rakamları (%13–25) yalnızca satıcı beyanı.
4. **Kalıcılık, satın alma nedenlerinin ilk üçündedir** (özgünlük %51, değer %45, kalıcılık %28) [veri, GWI]. Bizde bu veri Fragrantica'dan geliyor; kendi alıcılarımıza sormuyoruz, oysa `Vote` tablosunda kolonları hazır (`prisma/schema.prisma:235`).
5. **Parfümde tekrar alış zayıftır** (yaklaşık %17, güzellik ortalaması %23) [satıcı beyanı, eski rapor]. Dekant alan kokuyu değiştirir; hatırlatma aynı kokuyu değil benzerini de önermeli [çıkarım].
6. **Hediye takvimi satışın büyük kısmıdır.** Özbekistan'da 1–8 Mart 2023'te harcama +%20, kozmetik en çok artanlar arasında [veri]. Özbekistan'da erkekler 8 Mart hediyesine 100 dolardan fazla ayırıyor [veri, Wildberries anketi]. Navruz, Ramazan ve Öğretmenler Günü için yerel veri bulunamadı; bunlar deneme.
7. **Sahte ürün yerel ve belgelenmiş bir sorundur.** Adalet Bakanlığı Uzum'da yaklaşık 220 sahte ilan buldu; marka ihlali 2025'ten beri cezai sorumluluk taşıyor [veri]. Sitede "Только оригинал" ve "проверка подлинности каждой партии" yazıyor (`messages/ru.json:172,460`). Bu söz doğru olmalı ve dekantın Labor'da yeniden şişelendiği açıkça yazılmalı. Saygın dekantçıların hepsi bunu yazıyor [uygulama: ScentSplit, ScentDecant].
8. **Kanal:** Telegram internet kullanıcılarının %76'sına ulaşıyor; alışveriş için Instagram %45, Telegram %44 [veri]. Arama: Google %77, Yandex %20 [veri]. Kapıda ödeme payı için güvenilir veri yok; kapıda ödeme kalmalı.

## 4. Plan

Efor: **S** ≈ 1 gün, **M** ≈ 2–4 gün, **L** ≈ 1 hafta+.

### Adım 0 — Bu hafta: var olanı aç (kod yok)

| İş | Kim | Not |
| --- | --- | --- |
| PR #19'u merge et, deploy et | Zafar | Sonra `CRON_SECRET` ve crontab (PR açıklamasında) |
| Sunucudaki sürümü ve ayarları doğrula | Zafar | Aşağıdaki komut değerleri göstermez, yalnızca dolu mu boş mu söyler |
| Çalışma saatleri ve iki şubenin harita linki | Mağaza → kod (S) | Bana yazılırsa eklerim |
| Admin'de ilk sipariş kodu ve en az bir canlı kampanya var mı | Mağaza | `/ru/admin/promo`, `/ru/admin/campaigns` |
| "Оригинал" sözünü doğrula, yeniden şişeleme notunu onayla | Zafar | Metin: "Разлито в ателье Labor из оригинального флакона" |
| İki hafta veri topla | — | Metrica hunisi ve `/ru/admin/sources`; sonraki adımların ölçüsü bu |

```bash
cd /srv/labor && git log --oneline -1
awk -F= '/^(NEXT_PUBLIC_YANDEX_METRICA_ID|NEXT_PUBLIC_GA_MEASUREMENT_ID|NEXT_PUBLIC_META_PIXEL_ID|META_CAPI_TOKEN|FREE_DELIVERY_TASHKENT_FROM|TELEGRAM_ADMIN_CHAT_ID|CRON_SECRET)=/ {print $1, (($2=="" || $2=="\"\"") ? "BOŞ" : "dolu")}' /srv/labor/.env
```

Listede hiç çıkmayan değişken dosyada yok demektir.

### Adım 1 — 17–30 Kasım: Yeni Yıl'a yetişecekler

_Durum (15 Kasım): 4.1 ve 4.4 kodlandı, PR #19'da. Set, admin'de bir kampanyaya "set fiyatı" girilerek açılır; hediye paketi ücretsiz._

- **4.1 Keşif setleri (M).** 3 veya 5 numuneden oluşan, tek tuşla sepete giren, set fiyatlı ürün. İlk setler: "Yeni Yıl hediyesi (kadın / erkek)", "Kış", "İlk niş". Kviz sonucu da "bu üçünü numune olarak al" tuşuyla bitsin. Ölçü: set siparişlerinin payı, ortalama sepet.
- **4.4 Hediye seçeneği (S–M).** Checkout'ta "hediye" işareti: not kartı metni, fiyatsız fiş, alıcı farklıysa adı ve telefonu. Hediye paketi ücretli mi, mağaza kararı.
- **Yeni Yıl kampanyası (kod yok).** Mevcut kampanya sayfasıyla; teslimat son günü hero'da ve teslimat sayfasında yazsın. Reklamlar `ANTIGRAVITY.md` kurallarıyla.

### Adım 2 — Aralık: numuneden 10 ml'ye

- **4.2 Numune kredisi (M).** Numune siparişi teslim edilince alıcıya kişisel kod: numunenin bedeli (32 000 soʻm) aynı kokunun 10 ml'sinden düşer, 60 gün geçerli. Teslimde ve 7. günde Telegram mesajı. Promo ve hatırlatma altyapısı hazır. Ölçü: numune alanların 60 günde 10 ml alma oranı.
- **4.3 Yorumları zenginleştir (S–M).** "Teslim edildi" bildirimi yorum davetini zaten içeriyor (`lib/telegram/notify.ts`). Eksik olan: forma kalıcılık, yayılım ve mevsim soruları, ve yorum bırakmayanlara 7. günde tek bir hatırlatma. Ürün sayfasında Fragrantica oylarının yanında "Labor alıcıları" görünür.
- **4.5 Hatırlatma v2 (S).** 25. gün mesajına benzer bir koku eklenir (`ProductSimilar` hazır); 75. günde sipariş vermeyenlere ikinci ve son mesaj.

### Adım 3 — Ocak: arama ve vitrin

- **4.6 Nota ve parfümör sayfaları (M).** Marka sayfası kalıbıyla; kısa rehber metni, sitemap'e eklenir. "Oud atir", "ванильные духи" gibi aramalar için.
- **4.7 Çok satanlar ve yeni gelenler (S).** "Popüler" sıralaması gerçek satışa göre; iki sayfa ve ana sayfa bloğu.
- **4.8 SSS ve iade/değişim sayfası (S).** Politika mağaza kararı.

### Adım 4 — Şubat–Mart: en güçlü hediye dönemi

- 14 Şubat, 23 Şubat, 8 Mart ve aynı haftalara denk gelen Ramazan sonu (tarih teyit edilmeli). "Ona / ona" çift setleri, hediye rehberi sayfası, şube teslim son günleri. 8 Mart için kreatifler şubat ortasında hazır olmalı.

### Sonra (veriye göre)

- **Sadakat:** birikimli indirim kademesi (toplam harcamaya göre %3 / %5 / %7). Puan cüzdanı kurmuyoruz; kademe aynı işi daha az kodla görür.
- **Koku profilim**, atomizer/seyahat kabı eklentisi, siparişe ücretsiz numune, referans kodu.

## 5. Kurulun görüşü

| Koltuk | Karar |
| --- | --- |
| Pazarlama | Yeni özellikten önce ölçüm. ID'ler girilmeden reklam bütçesi kör harcanır. Sonra keşif seti ve hediye. |
| Ürün / UX | Numune ile 10 ml arasında köprü yok; en büyük kayıp orada. 4.1 ve 4.2 birlikte tek akış. |
| Operasyon | Her mesaj sözü (yanıt süresi, teslimat son günü, "orijinal") şubelerin tutabileceği kadar verilmeli. |
| Hukuk / risk | Yeniden şişeleme notu şart. Başka markaların dekantlarını pazaryerine koymadan önce marka izni kuralına bakılmalı. |
| Teknik | Adım 1–2 mevcut promo, kampanya ve hatırlatma altyapısına oturuyor; yeni ödeme veya dış servis gerekmiyor. |

## 6. Yapmayacaklarımız

- **Taksit:** 160 000 soʻm'luk sepette anlamı yok.
- **Ayrı mobil uygulama:** Telegram Mini App yeterli.
- **Abonelik (Scentbird modeli):** aylık dolum ve tahsilat operasyonu ister; önce set ve kredi.
- **Puan cüzdanı:** kademe indirimi yeter.
- **Uzum Market'te başka markaların dekantları:** Uzum 200'den fazla marka için yetki belgesi istiyor. Orada yalnızca Labor'un kendi kompozisyonları ve deodorant listelenebilir.

## 7. Zafar'ın kararları

1. PR #19 merge ve deploy.
2. Keşif seti fiyatı (ör. 3 numune 96 000 yerine 85 000 soʻm) ve ilk üç setin içeriği.
3. Numune kredisi tutarı ve süresi (öneri: 32 000 soʻm, 60 gün).
4. Hediye paketi: ücretsiz mi, ücretli mi.
5. İade/değişim kuralı ve talep formuna yanıt süresi sözü.
6. Yeniden şişeleme notunun metni.
7. Depo herkese açık görünüyor: arama sonuçlarında PR #13 başlığı çıktı. Bu planlar ve pazarlama notları rakiplerce okunabilir; istenmiyorsa depo özel yapılmalı.

## Kaynaklar

- exzap: [ana sayfa](https://exzap.uz/), [/hits](https://exzap.uz/hits), [oferta](https://exzap.uz/ru/oferta), [iade](https://exzap.uz/ru/obmyen-i-vozvrat), [iletişim](https://exzap.uz/ru/kontakty), [Telegram](https://t.me/s/exzapuz), [Uzum mağazası](https://uzum.uz/ru/shop/exzap), [Google Play](https://play.google.com/store/apps/details?id=uz.exzap.app&hl=en)
- Format ve keşif setleri: [Circana, Q3 2025](https://www.circana.com/post/us-beauty-industry-sales-accelerate-in-q3-circana-reports), [Circana, Holiday 2025](https://www.circana.com/post/beauty-sales-sparkle-in-holiday-2025), [ScentSplit SSS](https://www.scentsplit.com/a/faq), [ScentDecant SSS](https://www.scentdecant.com/pages/faq), [Luckyscent setleri](https://www.luckyscent.com/collections/brand-luckyscent-sample-packs), [Sephora kuponlu set](https://www.sephora.com/product/perfume-sampler-set-w-redeemable-voucher-P520718), [The Fragrance World](https://thefragranceworld.co.uk/discovery-set/)
- Alıcı davranışı: [Highsnobiety](https://www.highsnobiety.com/p/state-of-fragrance-trends/), [GWI / Premium Beauty News](https://www.premiumbeautynews.com/en/research-unique-scents-outweigh,25581), [Metrilo](https://metrilo.com/blog/?p=7333)
- Özbekistan: [8 Mart harcamaları, UzDaily](https://www.uzdaily.uz/ru/kakie-tovary-i-servisy-polzovalis-sprosom-v-preddverii-8-marta-v-uzbekistane/), [Wildberries 8 Mart anketi](https://thesun.my/business-news/media-outreach/wildberries-identifies-the-most-popular-gifts-for-international-women-s-day-DC13772537), [dijital alışkanlıklar, Uzum](https://uzum.com/en/press-center/news-and-press-releases/first-digital-habits-study-of-uzbekistan-uzum-ecosystem-services-are-the-most-in-demand-digital-products-in-the-country/), [Telegram erişimi](https://uzdaily.ru/en/telegram-76-reach-youtube-no-1-e-commerce-on-the-rise-inside-uzbekistans-digital-landscape/), [arama payı, StatCounter](https://gs.statcounter.com/search-engine-market-share/all/uzbekistan), [pazaryerinde sahte ürün, Spot](https://www.spot.uz/ru/2025/05/16/marketplace-counterfeit/), [marka ihlali, Legal 500](https://www.legal500.com/developments/?p=54100)
