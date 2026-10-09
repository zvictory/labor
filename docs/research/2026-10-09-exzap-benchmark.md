# exzap.uz incelemesi — Labor'a neler alabiliriz

_Tarih: 2026-10-09 · Kapsam: exzap.uz (Taşkent, oto yedek parça ve yağ e-ticareti) ile `apps/store` karşılaştırması_

## Yöntem ve sınır

exzap.uz bu çalışma ortamından doğrudan açılamadı (ağ politikası ve DNS engeli). Bu yüzden
inceleme, sitenin arama motorunda indekslenmiş sayfalarına (başlıklar, URL yapısı, sayfa
metinleri), Telegram kanalına, mağaza listelerine ve haberlere dayanıyor. Ekran düzeni, renkler ve
ana sayfa blok sırası görülemedi; aşağıdaki maddeler yalnızca kaynaklarda doğrulanabilen
özelliklerden oluşuyor. Labor tarafındaki durum doğrudan koddan okundu.

## exzap.uz'da ne var (doğrulanan)

| Özellik | Nasıl yapıyorlar | Kaynak |
| --- | --- | --- |
| Özbekçe öncelikli dil | Kök URL Özbekçe (`exzap.uz/`), Rusça `/ru` altında; dil değiştirme `/set-language/ru` | site:exzap.uz indeksleri |
| SEO odaklı sayfa başlıkları | Her marka/model için ayrı sayfa: "KYB ehtiyot qismlari — katalog, narxi, mavjudligi" (katalog, fiyat, stok) | `/brands/KYB`, `/brands/ATC`, `/marki-avtomobiley/chevrolet/gentra` |
| Marka sayfaları | `/brands/{Marka}` — gerçek, sayfalı landing page'ler (yönlendirme değil) | aynı |
| Yeni gelenler sayfası | `/new-arrival` — "yaqinda qo'shilgan mahsulotlar" | site:exzap.uz |
| Kartta taksit fiyatı | Fiyatın yanında aylık tutar: "57 000 сум" → "6 840 сум x 12 мес" | `/ru/avtoximiia` |
| Para birimi etiketi | Fiyatlar "сум" / "so'm" ile, "UZS" değil | aynı |
| Stok rozeti | Kartlarda "В наличии" | katalog sayfaları |
| Telefonla seçim talebi | `/vin/`: VIN + telefon bırak, yönetici arayıp seçenek sunar; Telegram'da "5–10 dakikada seçim" | `/vin/`, t.me/exzapuz |
| SMS kodlu kayıt | Kayıt sonrası "Подтверждение регистрации" + kod alanı | `/login` |
| İlk alışveriş bonusu | Kayıtla bağlantılı "Бонус к первой покупке" banner'ı; düzenli müşteriye ek indirim/bonus | katalog sayfası, `/ru/avtoximiia` |
| Teslimat mesajı | "Taşkent içinde hızlı ve ücretsiz teslimat", tüm bölgelere gönderim, mağazadan teslim alma; bölge listesi (Andijan, Buhara, Karşı, Kokand, Namangan, Semerkant, Surhanderya, Fergana) | ana sayfa, UzNews, Telegram |
| Güven sinyalleri | "10 000+ orijinal ürün", "tüm ürünlere garanti", resmi distribütörlük (Petronas), GROUPAUTO üyeliği, 2GIS'te 5.0 | ana sayfa, `/o-kompanii`, Facebook, eai.uz |
| Kısa numara + saatler | 1175 kısa hattı, +998 71 203 33 44, 9:00–18:00 Pzt–Cmt | Telegram, dizinler |
| Çok kanallı satış | Kendi sitesi + Android/iOS uygulaması + Uzum Market mağazası (4.8, 1689+ yorum) + Telegram kanalı + Instagram/Threads/YouTube | Google Play, uzum.uz/ru/shop/exzap, sosyal hesaplar |
| Uygulamada aylık kampanyalar | Uygulama "en iyi teklifler ve aylık kampanyalar" vaat ediyor | Google Play |
| Toptan/B2B | Menüde "Оптовикам", ayrı exzap-business.uz | `/o-kompanii`, exzap-business.uz |
| Haberler bölümü | `/news` | site:exzap.uz |

## Labor'da şu an ne var

Koddan doğrulandı (`apps/store`):

- Katalog filtreleri: nota, marka, aile, cinsiyet, parfümör, metin araması (`lib/catalog/products.ts`). Fiyat aralığı filtresi ve otomatik tamamlama yok.
- Marka/nota/parfümör `[slug]` sayfaları yalnızca filtreli kataloğa **yönlendiriyor**; kendi landing page'leri yok.
- `app/sitemap.ts`, `app/robots.ts` ve JSON-LD yok. `generateMetadata` sadece `delivery/page.tsx`'te var.
- Fiyat gösterimi `formatUzs` ile (`lib/money.ts:17`) her dilde "… UZS" yazıyor.
- Fiyatlar: 16 000 UZS/ml; 10 ml decant = 160 000, 2 ml tester = 32 000 (`lib/money.ts`, `lib/cart/cart.ts`).
- Ödeme: Payme, Click, kapıda ödeme. Tiplerde `'uzum'` var ama uygulanmamış (`lib/payments/types.ts:10`). Taksit yok.
- Teslimat: tek Taşkent teslim noktası (ücretsiz), Taşkent kurye 30 000, bölgeler 50 000 (`lib/delivery/`).
- `WishlistItem` ve `Vote` modelleri şemada var ama UI'ları yok (`prisma/schema.prisma:226`, `:245`).
- Kampanyalar admin'de yönetiliyor ama vitrinde gösterilmiyor (ana sayfa hero'su `getHeroProducts` kullanıyor).
- Promo kodu, indirim fiyatı, ilk alışveriş bonusu yok.
- İletişim yalnızca Telegram linkleri. Telefon, adres/harita, çalışma saatleri, SSS, "hakkımızda" sayfası yok.
- Analitik yok (GA, Yandex Metrica, Meta Pixel).
- Telegram botu (`/start`, `/help`, `/lang`) ve WebApp köprüsü var. Bot ve WebApp'te kampanya yayını yok.

## Ne alalım — öncelikli öneriler

Etki/efor tahmini: **S** ≈ 1 gün, **M** ≈ 2–4 gün, **L** ≈ 1 hafta+.

### P1 — Hızlı ve yüksek etkili

1. **Para birimi etiketini yerelleştir (S).**
   - exzap fiyatları "сум" / "so'm" ile gösteriyor; Özbek alıcı "UZS" yerine bunu bekliyor.
   - Yapılacak: `formatUzs` içinde dile göre ek seç: ru → `сум`, uz → `so'm`, en → `UZS`.
   - Saklama birimi ve tek para birimi kuralı değişmiyor, yalnızca etiket değişiyor.

2. **SEO temeli (M).** Kendi alanlarındaki aramalarda bu yapı exzap'ı öne çıkarıyor:
   - `app/sitemap.ts` ve `app/robots.ts` ekle.
   - Ürün, marka, nota ve katalog sayfalarına `generateMetadata` ekle.
   - Her sayfaya `hreflang` alternatifleri (ru/uz/en) ekle.
   - Ürün sayfasına JSON-LD ekle: `Product` + `Offer` (priceCurrency `UZS`) + `AggregateRating`.
   - Başlık kalıbı exzap'tan alınabilir, örneğin uz: "{Marka} atirlari — katalog, narxi", ru: "Парфюмерия {Marka} — каталог, цены".

3. **Gerçek marka landing page'leri (M).**
   - Şu an `brands/[slug]` sayfası kataloğa yönlendiriyor.
   - Bunun yerine sayfanın kendisi şunları göstermeli: marka hikâyesi (`resolveLocaleText` ile), ürün ızgarası ve sayfalama.
   - Kanonik URL `/{locale}/brands/{slug}` olsun.
   - Aynı yaklaşım notalar için de uygulanabilir: "Ud notalı parfümler" gibi aramalar yüksek niyetli.

4. **"Parfüm seçimine yardım" talebi (S–M).**
   - exzap'ın VIN formunun parfüm karşılığı: kullanıcı telefonunu ve kısa bir tercih notunu bırakır ("sevdiğim koku…", "hediye, bütçe…").
   - Talep admin Telegram sohbetine düşer (`lib/telegram/notify.ts` zaten var), danışman geri arar.
   - `find-your-perfume` sonuç sayfasına ve ürün sayfasındaki "ask us" alanına bağlanır.
   - Özbek pazarında telefonla dönüş, yüksek dönüşüm sağlayan bir kanal.

5. **İletişim ve güven bloğu (S).**
   - Footer'a ve ayrı bir `contacts` sayfasına telefon, çalışma saatleri, mağaza adresi, 2GIS/Yandex Maps linki ve Instagram ekle.
   - Ürün sayfasına ve sepete "orijinal ürün" ve "mağazadaki fiyatın aynısı" vaadini ekle.
   - `PRICE_PER_ML` yorumundaki "bench rate" zaten bu vaadi destekliyor.

6. **Favoriler UI (S–M).**
   - `WishlistItem` modeli hazır.
   - Ürün kartına ve ürün sayfasına kalp ikonu ekle, `account/wishlist` sayfası aç.
   - Giriş yapmamış kullanıcı için favorileri cookie'de tut, girişte birleştir (sepetteki desen).

### P2 — Satış ve sadakat

7. **İlk alışveriş bonusu ve promo kodları (M–L).**
   - exzap kaydı ilk alışveriş bonusuyla teşvik ediyor.
   - Yeni `PromoCode` modeli: yüzde veya sabit indirim, minimum sepet, kullanım limiti, tek kullanımlık ve tarih aralığı.
   - Checkout'ta kod alanı ve admin CRUD.
   - Telegram veya telefonla kayıt olana otomatik "ilk sipariş" kodu.
   - Sipariş satırlarına indirim snapshot'ı yazılmalı (`OrderItem` zaten fiyat snapshot'ı tutuyor).

8. **Kampanyaları vitrine bağla (S–M).**
   - Admin'deki `Campaign` / `CampaignSlide` / `CampaignProduct` zaten var.
   - Ana sayfa hero'su ve "Selection" bloğu bu verilerden okunsun.
   - "Yeni gelenler" için ayrı bir sayfa ve ana sayfa bloğu eklenebilir (`sort=new` hazır, exzap'ın `/new-arrival` sayfası gibi).

9. **Ücretsiz teslimat eşiği (S, iş kararı).**
   - exzap'ın ana mesajı "Taşkent'te ücretsiz teslimat".
   - Öneri: Taşkent kuryesi belirli bir sepet tutarının üstünde ücretsiz olsun, örneğin 3 decant ≈ 480 000. Eşik Zafar'ın kararı.
   - Kodda: `lib/delivery/methods.ts` içine eşik ekle, sepette "ücretsiz teslimata X so'm kaldı" çubuğu göster.
   - Teslimat sayfasında bölgeler ve süreler tablo halinde açıkça yazılsın.

10. **Telegram'ı "uygulama" olarak kullan (M).**
    - exzap ayrı Android/iOS uygulaması tutuyor. Labor'un buna ihtiyacı yok: Telegram Mini App aynı işi görür.
    - WebApp köprüsü ve otomatik giriş zaten var.
    - Botun menü butonu mağazayı açsın.
    - Admin'den kampanya duyurusu bot abonelerine gönderilsin (broadcast, dil başına metin).
    - Botun `/start` mesajında ilk alışveriş bonusu verilsin.

11. **Analitik (S).**
    - Yandex Metrica (Özbekistan'da yaygın) ve GA4 ekle.
    - Olay takibi: sepete ekleme, checkout başlangıcı, ödeme.
    - Ölçüm olmadan yukarıdaki maddelerin etkisi bilinemez; bu yüzden P1'e çekilebilir.

### P3 — Kanallar ve sonrası

12. **Uzum Bank ödemesi ve taksit (M–L).**
    - exzap her kartta "x 12 мес" gösteriyor. Ama onların sepeti (akü, lastik, parça) Labor'un 160 000'lik decantından çok daha büyük.
    - Bu yüzden taksiti kartlarda göstermek Labor'da anlamsız.
    - Sadece belirli bir sepet tutarının üstünde (hediye setleri, çoklu sipariş) Uzum Nasiya veya Alif seçeneği değerlendirilebilir.
    - Uzum Bank ödemesi daha basit: tip zaten tanımlı.

13. **Uzum Market'te mağaza (iş kararı + S kod).**
    - exzap'ın Uzum mağazasında 1689+ yorum var; pazaryeri, kendi sitesine trafik ve güven taşıyor.
    - Labor için tester/decant setleri Uzum'da listelenebilir.
    - Kod tarafı: admin'den ürün feed'i dışa aktarma (CSV/YML).

14. **Ürün yorumları (M).**
    - `Vote` modeli var ama UI yok.
    - Teslim edilmiş siparişi olan kullanıcıya bot üzerinden "puan ver" mesajı gönderilebilir.
    - Puanlar ürün sayfasına ve JSON-LD'ye beslenir.

15. **Kurumsal hediye / toptan talep formu (S).**
    - exzap'ın "Оптовикам" bölümünün Labor karşılığı: kurumsal hediye, düğün ve bayram siparişleri için basit bir talep formu.

## Almayacaklarımız

- VIN ve araç modeline göre seçim, oto-spesifik katalog ağacı: alana özgü.
- Kartlarda "x 12 мес" taksit gösterimi: decant fiyatında anlamsız (bkz. madde 12).
- Ayrı native mobil uygulama: Telegram Mini App yeterli.
- Ayrı B2B alan adı ve portalı: ölçeğimize göre fazla.
- Kök URL'yi Özbekçe yapmak: CLAUDE.md'ye göre varsayılan dil ru kalıyor. Özbekçe aramalardan pay almak için `hreflang` ve Özbekçe metadata yeterli.

## Önerilen sıra

1. **Hafta 1:** madde 1 (para birimi etiketi), 2 (SEO temeli), 5 (iletişim ve güven bloğu), 11 (analitik).
2. **Hafta 2:** madde 3 (marka landing page'leri), 4 (seçim talebi), 6 (favoriler UI).
3. **Hafta 3–4:** madde 7 (promo ve ilk alışveriş bonusu), 8 (kampanyaları vitrine bağla), 9 (ücretsiz teslimat eşiği, Zafar'ın kararıyla), 10 (Telegram broadcast).
4. **Sonra:** madde 12–15.

## Kaynaklar

- [exzap.uz ana sayfa (uz)](https://exzap.uz/), [ru](https://exzap.uz/ru), [О компании](https://exzap.uz/o-kompanii), [Подбор по VIN](https://exzap.uz/vin/), [Yeni gelenler](https://exzap.uz/new-arrival), [Brands/KYB](https://exzap.uz/brands/KYB?page=2), [Chevrolet Gentra](https://exzap.uz/ru/marki-avtomobiley/chevrolet/gentra), [Avtoximiia](https://exzap.uz/ru/avtoximiia), [Login](https://exzap.uz/login), [News](https://exzap.uz/news)
- [Telegram kanalı EXZAP MARKETPLACE](https://t.me/s/exzapuz?before=338)
- [Google Play — Exzap](https://play.google.com/store/apps/details?id=uz.exzap.app&hl=en)
- [Uzum Market — EXZAP mağazası](https://uzum.uz/ru/shop/exzap)
- [UzNews — EXZAP.UZ haberi](https://uznews.uz/ru/news/63210)
- [eai.uz — Taşkent oto parça mağazaları sıralaması 2025](https://eai.uz/en/articles/top-autoparts-tashkent-2025)
- [exzap-business.uz](https://exzap-business.uz/), [2GIS kaydı](https://2gis.uz/tashkent/firm/70000001040645851), [Facebook](https://www.facebook.com/exzap/)
