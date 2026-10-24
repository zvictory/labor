# Meta reklamları ↔ laborparfum.com: inceleme ve kurulum

*2026-10-24. Kaynaklar: Antigravity ile hazırlanan `LABOR_CLAUDE_COLLAB.md`, `ads_manager_targeting_guide.md`, `carousels_content.md` ve `apps/store` kodu.*

## 1. Özet

1. **Reklamlar şu an siteyi hiç kullanmıyor.** Rehberdeki kampanyalar Instagram profiline ya da Direct'e gidiyor. Bu yüzden harcanan $5/gün'ün kaç satış getirdiği bilinemiyor; rehberdeki metrik tablosu da yalnızca CTR, CPC ve CPM içeriyor, satış yok.
2. **Sitede ölçüm altyapısı yoktu.** Meta Pixel ve Conversions API yoktu. Siparişler hangi reklamdan geldiğini kaydetmiyordu. Bu PR ikisini de kuruyor.
3. **2+1 aksiyası (25 Ekim – 2 Kasım) sitede uygulanamıyordu.** Promosyon motoru yalnızca yüzde ya da sabit tutar indirim biliyordu. Bu PR "N+1" kod tipini ekliyor: her N üründen en ucuzu bedava.
4. **Reklam mesajı ile site farklı şeyler söylüyor.** Reklamlar Labor'u kendi kompozisyonlarını yapan bir atölye olarak anlatıyor (bespoke, 10 ml, parfümör Tillaev Dilmurod). Site ise çok markalı bir katalog. Reklamdan gelen kişi, vaat edilen sayfaya inmeli (bkz. 4.3).
5. **İletişim bilgileri sitede boştu.** Brief'teki telefon, Instagram ve iki şube adresi bu PR ile eklendi.

## 2. Materyallerin değerlendirmesi

### 2.1 `ads_manager_targeting_guide.md`

**İyi olanlar:**
- Müşteri tabanıyla retargeting ve %1 lookalike ayrımı doğru kurulmuş.
- Frekans takibi ve kreatifin 10–14 günde bir değiştirilmesi doğru.
- Üç metin varyantı mevcut müşteriye "tanıdık" diliyle yazılmış.

**Eksikler ve riskler:**

| Konu | Durum | Öneri |
| --- | --- | --- |
| Hedef | Traffic → Instagram profili | Profil ziyareti satışa çevrilmiyor ve ölçülemiyor. Bütçenin bir kısmını **Sales** ya da **Leads** hedefiyle siteye yönlendirin. Optimizasyon olayı başlangıçta `Lead` veya `InitiateCheckout` olsun; haftada ~50 satın almaya ulaşınca `Purchase`. |
| Ölçüm | Satış yok | Pixel + CAPI (bu PR) ve `/admin/sources` raporu: kampanya başına sipariş ve ciro. Harcamayla birlikte ROAS hesaplanır. |
| Aksiya bitince | Sabit $5/gün | 2+1 bittiğinde (2 Kasım) reklamı kapatın ya da kreatifi değiştirin. Bitmiş aksiyonun reklamı şikâyet getirir. |
| Lookalike büyüklüğü | "30–50 bin kişi" yazıyor | %1 lookalike, ülkedeki Meta kullanıcılarının %1'idir. Gerçek rakamı Ads Manager'da kontrol edin. Ayrıca kaynak listede en az 100 eşleşen kişi gerekir. |
| `launch_meta_ads.sh` | Graph API **v19.0** | Bu dosya bana gönderilmedi; sürümü brief'ten okudum. v19.0, Ocak 2024 sürümü ve iki yıllık ömrü doldu. Meta eski sürüm çağrılarını sessizce bir sonraki sürüme yönlendiriyor, davranış değişebilir. **v25.0**'a yükseltin; bu PR'daki CAPI kodu da v25.0 kullanıyor. |
| Kişisel veri | Müşteri telefonları Meta'ya yükleniyor | Yükleme sırasında Meta, veriyi tarayıcıda hash'liyor. Yine de Özbekistan kişisel veri mevzuatı açısından müşteri onayını ve gizlilik metnini bir hukukçuya teyit ettirin. Bu PR'daki CAPI da telefonu hash'leyip gönderiyor. |

### 2.2 `carousels_content.md`

- Yapı güçlü: kanca → bilgi → kaydetme tetikleyicisi → mağazada ücretsiz deneme. Organik paylaşım için uygun.
- **Reklam olarak boost edilecekse** bazı iddialar Meta'nın reklam politikasına ve tüketici mevzuatına takılabilir: "90% inson bilmaydi", "24+ soat stoykost", "100% mualliflik", "$150 lik atirlar ham tez uchadi". Kanıtlanamayan rakamları yumuşatın; örneğin "24+ soat" yerine "teride uzun süre kalır".
- "Directga SIR deb yozing" çağrısı sitede ölçülemez. Bio linkine UTM ekleyin (bkz. 4.2), böylece karuselden siteye gelenler raporda görünür.

### 2.3 `LABOR_CLAUDE_COLLAB.md`

Brief'teki altı fırsatın sitedeki karşılığı:

| Fırsat | Sitede durum |
| --- | --- |
| Scent Finder kvizi | **Zaten var:** `/find-your-perfume`, 4 soru, 3 öneri ve danışma formu. Reklamda doğrudan bu sayfaya link verilebilir. |
| Satış hunisi (Direct → satış) | Sitede danışma formu, Telegram bildirimi ve `/admin/requests` var. Bu PR ile talepler reklam kaynağını da taşıyor. |
| Çok dillilik | Site ru/uz/en. Reklam linkleri dile göre `/uz/…` ya da `/ru/…` olmalı. |
| Retention (25. gün hatırlatma) | Yapılmadı, bkz. 5. |
| Storytelling / parfümör | Sitede parfümör sayfaları var. Tillaev Dilmurod için ayrı bir sayfa yok. |
| Midjourney promptları | Site dışı. |

## 3. Bu PR'da kurulanlar

1. **İletişim** (`lib/store-contact.ts`):
   - Telefon `+998 33 180 73 73`, Instagram `@labor_parfum`, Ocean (Shota Rustaveli 34) ve Gulzor (General Oʻzoqov 60A) şubeleri.
   - İletişim sayfasında, footer'da ve her şube için schema.org `Store` kaydında görünüyor.
   - Çalışma saatleri ve harita linkleri doğrulanmadığı için boş bırakıldı.
2. **Reklam kaynağı takibi** (`lib/attribution`):
   - Siteye `utm_*` veya `fbclid` ile gelen ziyaretçinin etiketleri 30 gün saklanır. Son etiketli ziyaret geçerlidir.
   - Sipariş ve danışma talebi bu etiketleri kaydeder.
   - Admin'de siparişte "Источник", talepte "Реклама" satırı ve Telegram bildiriminde kaynak görünür.
   - Yeni sayfa **`/admin/sources`**: kaynak/kanal/kampanya başına sipariş, ciro, ödenmiş ciro ve talep sayısı (7/30/90 gün).
   - Migration: `20261024120000_ad_attribution` (yalnızca yeni kolonlar ve bir index).
3. **Meta Pixel** (`lib/analytics.ts`):
   - Olaylar: `PageView`, `ViewContent` (ürün sayfası), `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `Purchase` (sipariş numarasıyla), `Lead` (danışma formu).
   - `NEXT_PUBLIC_META_PIXEL_ID` boşken hiçbir şey yüklenmez.
4. **Conversions API** (`lib/meta`):
   - `Purchase` ve `Lead` sunucudan da gönderilir, Pixel'le aynı `event_id` ile; Meta ikisini tek olay sayar.
   - Ad blocker veya iOS Pixel'i engellese bile satış Meta'ya ulaşır.
   - Telefon SHA-256 ile hash'lenir; isim ve adres gönderilmez.
   - Gönderim cevaptan sonra yapılır, hata siparişi etkilemez.
   - `META_CAPI_TOKEN` boşken kapalıdır.
5. **N+1 promosyon kodu** (`lib/promo/rules.ts`):
   - `/admin/promo` → Tip: "N+1". 2+1 için boyut 3 girilir.
   - Sepetteki tam boy ürünler fiyata göre sıralanır, her 3'lük grubun en ucuzu bedava olur. Örnek: 2,39 + 2,15 + 1,34 mln → −1,34 mln. Probnikler sayılmaz.
   - Grup tamamlanmamışsa checkout "daha fazla ürün ekleyin" der.
6. **Meta için müşteri listeleri** (`/api/admin/audience-csv`, yalnızca admin rolü):
   - Alıcılar listesi: telefon, e-posta, isim, ülke ve **value**, yani ödenmiş siparişlerin toplamı. Değere dayalı lookalike için kullanılır.
   - Satın almamış talepler listesi: retargeting için.
   - Linkler `/admin/sources` sayfasında.

## 4. Çalıştırmak için yapılacaklar

### 4.1 Bir kerelik kurulum

1. **Deploy.** Bu PR'ı merge edip deploy edin. `deploy.sh` migration'ı kendisi uygular. Deploy için Zafar'ın onayı gerekir.
2. **Pixel.**
   - Events Manager → **Connect data sources** → Web → bir dataset (pixel) oluşturun.
   - ID'yi sunucudaki `/srv/labor/.env` dosyasına `NEXT_PUBLIC_META_PIXEL_ID=…` olarak yazın ve tekrar deploy edin. ID build sırasında koda gömülüyor.
   - Eski `apps/web` aynı değişkeni zaten kullanıyordu. `.env`'de önceden bir değer varsa doğru pixel olduğunu kontrol edin.
3. **CAPI.**
   - Pixel → Settings → Conversions API → **Generate access token**.
   - `/srv/labor/.env` dosyasına `META_CAPI_TOKEN=…` ve geçici olarak `META_TEST_EVENT_CODE=…` ekleyin. Test kodu Events Manager → Test events ekranında çıkar.
   - Store konteynerini yeniden başlatın.
   - Sitede bir sipariş ve bir danışma talebi bırakın; Test events'te `Purchase` ve `Lead` iki kaynaktan (Browser + Server) "Deduplicated" görünmeli.
   - Sonra `META_TEST_EVENT_CODE` değerini silin.
4. **Domain doğrulama.** Business Manager → Brand safety → Domains: `laborparfum.com`.
5. **2+1 kodu.** Aksiyanın kapsamı netleşince `/admin/promo`'da kodu oluşturun: kod `2PLUS1`, tip N+1, boyut 3, tarih 25.10–02.11. Kapsam soruları:
   - Sadece 10 ml mi, her şey mi?
   - Başka kodla birleşir mi? (Şu an tek kod uygulanabiliyor.)
   - Online'da da geçerli mi?

   Kod yalnızca girildiğinde uygulanır; otomatik değildir.
6. **Kampanya sayfası.** `/admin/campaigns`'te `2-plus-1` slug'lı bir kampanya oluşturun: posterler, metin ve "Promokod: 2PLUS1". Reklamlar bu sayfaya gitsin: `https://laborparfum.com/uz/campaigns/2-plus-1`.

### 4.2 Linkler (UTM)

En kolay yol, Ads Manager'da reklam düzeyindeki **URL parameters** alanına bir kez şunu yazmak:

```
utm_source=instagram&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Kampanya ve reklam adlarında boşluk yerine `_` kullanın; site etiketleri küçük harfe çevirir.

Elle verilecek linkler:

| Nerede | Link |
| --- | --- |
| 2+1, Dark 4:5 | `https://laborparfum.com/uz/campaigns/2-plus-1?utm_source=instagram&utm_medium=paid&utm_campaign=2plus1_oct&utm_content=dark_4x5` |
| 2+1, Ivory 4:5 | `…&utm_content=ivory_4x5` |
| 2+1, Story 9:16 | `…&utm_content=story_9x16` |
| 2+1, Square 1:1 | `…&utm_content=square_1x1` |
| Instagram bio | `https://laborparfum.com/uz?utm_source=instagram&utm_medium=bio` |
| Scent finder reklamı | `https://laborparfum.com/uz/find-your-perfume?utm_source=instagram&utm_medium=paid&utm_campaign=scent_finder` |
| Telegram kanalı | `https://laborparfum.com/uz?utm_source=telegram&utm_medium=channel` |

Rus dilli kitleye `/ru/…` ile aynı linkleri verin.

### 4.3 Ads Manager tarafı

- **Kitleler:**
  - **Website visitors 30 gün:** Pixel'den otomatik dolar.
  - **Alıcılar:** `/admin/sources` → Покупатели CSV. Value-based lookalike için kullanılır.
  - **Talep bırakıp almayanlar:** Заявки CSV. Retargeting için kullanılır.
  - Rehberdeki eski baza ek olarak bu listeleri ayda bir yenileyin.
- **İniş sayfaları mesajla eşleşmeli:**
  - 2+1 posterleri → kampanya sayfası.
  - Bespoke / Tillaev Dilmurod metni → bespoke anlatan bir sayfa. Ana sayfadaki "custom parfum" bloğu şimdilik yeterli; ayrı bir sayfa önerilir.
  - Kararsız kitleye → `/find-your-perfume`.
- **Haftalık kontrol:** `/admin/sources` → kampanya cirosu ÷ Ads Manager harcaması = ROAS. Kreatif bazında `utm_content` ile karşılaştırın.

## 5. Yapılmayanlar ve sıradakiler

1. **25. gün hatırlatması.** 10 ml alan ve Telegram'a bağlı müşteriye, siparişin teslimden 25 gün sonra kişisel mesaj. Mesaj altyapısı (bot, `/stop`) hazır; eksik olan, sunucuda günlük çalışan bir zamanlayıcı (cron). Ayrıca mesaj metni ve sıklığı mağazanın kararı.
2. **Meta katalog feed'i.** Advantage+ katalog reklamları ve Instagram Shopping için Meta'nın formatında `/feed-meta.csv`. Şu anki `/feed.yml` Yandex formatında.
3. **Bespoke iniş sayfası** ve parfümör Tillaev Dilmurod'un sayfası.
4. **Scent finder tamamlanma olayı.** Kviz bitince Pixel'e özel bir olay; reklamı "kvizi bitirenler"e göre optimize etmek için.
5. **Gizlilik metni ve çerez onayı.** Hukuki teyitten sonra.
