# Antigravity için çalışma kuralları

*Labor® pazarlama işleri: reklam, karusel, poster, metin, otomasyon. Son güncelleme: 2026-10-24.*

**Nasıl kullanılır:** Antigravity'ye her yeni işin başında bu dosyayı verin ve "bu kurallara uy" deyin. Kurallar değişirse yalnızca bu dosya güncellenir.

Bu belge sitenin (`apps/store`) gerçek durumunu anlatır. Burada yazmayan bir telefon, adres, fiyat, promo kodu veya link uydurulmaz. Emin olunmayan bilgi `[DOĞRULA: …]` diye işaretlenip insana sorulur.

---

## 1. Marka bilgileri (tek kaynak)

| Konu | Değer |
| --- | --- |
| Marka | Labor® (Labor perfume atelier) |
| Kurucu ve parfümör | Tillaev Dilmurod, Instagram [@perfumer.tillaev](https://instagram.com/perfumer.tillaev) |
| Telefon | +998 33 180 73 73 |
| Instagram | [@labor_parfum](https://instagram.com/labor_parfum) |
| Ocean şubesi | Toshkent, Shota Rustaveli koʻchasi, 34 |
| Gulzor şubesi | Toshkent, General Oʻzoqov koʻchasi, 60A |
| Site | https://laborparfum.com: dil öneki zorunlu, `/uz/…`, `/ru/…`, `/en/…` |
| Telegram botu | Sitenin footer'ındaki bot. Kullanıcı adını sitedeki linkten alın, ezbere yazmayın. |
| Çalışma saatleri | `[DOĞRULA]`: henüz onaylı değil |

**Sitede satılanlar:**
- 10 ml dekant, yani tam boy ürün.
- 2 ml deneme numunesi (probnik).

Fiyatlar yalnızca sitedeki ürün sayfasından alınır.

**Henüz kararlaştırılmamış konu:** Reklamlar Labor'u kendi kompozisyonlarını yapan bir atölye olarak anlatıyor. Site ise birçok markanın parfümünü satan bir katalog. Hangi mesajın öne çıkacağına mağaza karar verene kadar:
- Her reklam kendi mesajına uyan sayfaya gider (bkz. 2).
- "100% mualliflik" gibi tüm ürünleri kapsayan bir iddia yazılmaz.

## 2. İniş sayfaları

Reklam her zaman vaadiyle eşleşen sayfaya gider.

| Reklamın vaadi | Gideceği sayfa |
| --- | --- |
| Aksiya (2+1 vb.) | `/uz/campaigns/<slug>`. Sayfa admin'de (`/ru/admin/campaigns`) oluşturulmadan link verilmez. |
| "Hangi koku bana uyar?" | `/uz/find-your-perfume`: 4 soruluk kviz ve danışma formu |
| Belirli bir koku | `/uz/product/<slug>` |
| Şirket hediyeleri | `/uz/corporate` |
| Şubeye gel, ücretsiz dene | `/uz/contacts` |
| Genel tanıtım | `/uz` (ana sayfa) |

Rusça içerikte linkler `/ru/…` ile başlar.

## 3. Link kuralı (UTM)

Siteye giden **her** link etiket taşır. Etiketsiz link, satışın nereden geldiğini kaybettirir. Sonuçlar sitenin admin panelinde, `/ru/admin/sources` sayfasında görünür.

```
?utm_source=<kanal>&utm_medium=<tür>&utm_campaign=<kampanya>&utm_content=<kreatif>
```

| Etiket | Değerler |
| --- | --- |
| `utm_source` | `instagram`, `facebook`, `telegram`, `google` |
| `utm_medium` | `paid` (ücretli reklam), `bio`, `post`, `story`, `channel` (Telegram kanalı), `reminder` (otomatik hatırlatma, sistem kullanır) |
| `utm_campaign` | Küçük harf, boşluk yerine `_`, sonda ay: `2plus1_oct`, `bespoke_nov`, `newyear_dec` |
| `utm_content` | Kreatif adı: `dark_4x5`, `story_9x16`, `reel_perfumer_01` |

**Meta Ads Manager'da** reklam düzeyindeki **URL parameters** alanına şu satır bir kez yazılır, elle link kurmaya gerek kalmaz:

```
utm_source=instagram&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Bu yüzden kampanya ve reklam adları da yukarıdaki biçimde verilir: `2plus1_oct`, `dark_4x5`.

## 4. Promo kodları

- Kodları yalnızca mağaza, site admin'inden (`/ru/admin/promo`) oluşturur. **Admin'de oluşturulmamış bir kod görsele veya metne yazılmaz.**
- Biçim: büyük harf ve rakam, örneğin `2PLUS1`, `WELCOME10`, `NEWYEAR25`.
- Sitedeki kod tipleri:
  - yüzde indirim;
  - sabit tutar (so'm);
  - "N+1": her N tam boy üründen en ucuzu bedava; 2+1 için N=3.
- Kodun geçerlilik tarihleri görseldeki tarihlerle aynı olur.
- Sitede bir siparişe tek kod uygulanır. "Başka indirimlerle birleşir" yazılmaz.

## 5. İddia ve dil kuralları

Reklam metinleri Meta tarafından denetlenir; yanıltıcı iddia reklamın reddedilmesine veya hesabın kısıtlanmasına yol açar.

**Yazılmaz:**
- Kaynağı olmayan istatistikler: "90% inson bilmaydi".
- Kesin süre vaatleri: "24+ soat stoykost", "kafolatlangan".
- Mutlak ifadeler: "100%", "eng yaxshi", "yagona".
- Başka markaları kötüleme: "$150 lik atirlar ham tez uchadi".
- Gerçekte olmayan aciliyet: "faqat bugun". Aksiya gerçekten bugün bitiyorsa yazılabilir.

**Yerine:**
- "Teride uzun saqlanadi".
- "Parfyumerning oʻz formulasi". Bu yalnızca Labor'un kendi kompozisyonları için yazılır.
- "Filialda bepul sinab koʻring". Bu gerçek bir uygulama, yazılabilir.

**Konsantrasyon bilgisi:** Parfum, EdP, EdT gibi genel bilgiler verilebilir. Ama "bizim kokular X saat kalır" denmez.

**Dil:**
- Özbekçe Latin alfabesiyle ve doğru işaretle yazılır: `oʻ`, `gʻ`, `ʼ`. Düz `'` kullanılmaz.
- Her reklamın **uz** ve **ru** versiyonu hazırlanır.
- Rusça metin çeviri gibi değil, doğal okunmalı.

**Ton:** premium, samimi, bilgili. Bağırmayan bir dil kullanılır; büyük harfle başlık en fazla bir satır olur.

## 6. Kreatif ölçüleri

| Format | Boyut | Not |
| --- | --- | --- |
| Feed / reklam | 1080×1350 (4:5) | Ana format |
| Story / Reels | 1080×1920 (9:16) | Üstte ve altta ~250 px boş bırakılır; Instagram arayüzü oraları kapatır. Yazı ve kod ortada durur. |
| Kare | 1080×1080 (1:1) | Yedek format |

**Her görselde:**
- logo;
- teklif;
- varsa promo kodu;
- kısa site adresi (`laborparfum.com`);
- varsa tarih aralığı.

**Görsel dili:**
- Görselin üzerinde az yazı kullanılır; ayrıntı reklam metnine gider.
- Gerçek ürün fotoğrafları kullanılır. Yapay zekâyla üretilmiş şişe görseli gerçek ürün gibi gösterilmez.
- Renkler marka paletinden seçilir: Dark Luxury `#070709`, `#d4a359`, `#ffd875`; Ivory `#faf8f5`.

## 7. Kod ve otomasyon

- **Meta Graph API sürümü:** v25.0. v19.0 gibi eski sürümler kullanılmaz; ömrü dolmuş sürüm sessizce başka sürüme yönlendirilir ve davranışı değişebilir.
- **Gizli bilgiler:** Token ve şifreler dosyaya yazılmaz, commit edilmez, sohbete yapıştırılmaz. Yalnızca ortam değişkeninden okunur, örneğin `META_ADS_TOKEN`.
- **Yayın öncesi:** Otomatik oluşturulan kampanyalar önce `PAUSED` durumunda oluşturulur, bir insan kontrol edip açar.
- **Site koduna dokunma:** Sitede değişiklik gerekiyorsa bu bir istek olarak yazılır; Antigravity site koduna dokunmaz. Site tarafı zaten şunları yapıyor:
  - Meta Pixel ve Conversions API ile `Purchase` ve `Lead` olaylarını Meta'ya gönderiyor.
  - Siparişlere reklam kaynağını kaydediyor.
  - Alıcı ve talep listelerini `/ru/admin/sources` sayfasından CSV olarak veriyor (yalnızca admin).

## 8. Teslim

**Klasör:** Her iş repoda kendi klasörüne konur: `docs/marketing/<YYYY-MM-DD>-<konu>/`, örneğin `docs/marketing/2026-10-25-2plus1/`.

**Klasörde olması gerekenler:**
- `README.md`: amaç, tarih aralığı, kitle, bütçe önerisi ve kreatif listesi. Her kreatif için dosya adı, `utm_content` değeri, iniş sayfası ve promo kodu yazılır.
- Metinler `.md` olarak, uz ve ru ayrı bölümlerde.
- Görseller PNG veya JPG olarak; dosya adı `utm_content` ile aynı (`dark_4x5.png`).
- Script'ler `.sh` veya `.py` olarak; içinde token olmaz.

**Kendi kendine kontrol:** Teslimden önce aşağıdaki kontrol listesi doldurulur.

## 9. Ölçüm döngüsü (haftalık)

1. Ads Manager'dan kampanya ve kreatif başına harcama alınır.
2. Site admin'inden (`/ru/admin/sources`, 7 gün) kampanya başına sipariş, ciro ve talep sayısı alınır.
3. Antigravity'ye ikisi birlikte verilir. Beklenen çıktılar:
   - kampanya başına **ROAS** (ciro ÷ harcama) ve talep başına maliyet;
   - en iyi ve en kötü kreatif (`utm_content`);
   - gelecek hafta için en fazla 3 yeni kreatif önerisi.
4. Önemli: şubede yapılan satışlar sitede görünmez. Şubeler müşteriye "bizi nereden duydunuz?" diye sorup not alıyorsa o sayılar da eklenir.

## 10. Yayın öncesi kontrol listesi

- [ ] Telefon, adres ve fiyat bu dosyayla veya siteyle birebir aynı.
- [ ] Promo kodu admin'de oluşturulmuş; tarihleri görseldekiyle aynı.
- [ ] Link doğru iniş sayfasına gidiyor ve UTM taşıyor (ya da Ads Manager URL parameters dolu).
- [ ] Kampanya ve reklam adları `kucuk_harf_ay` biçiminde.
- [ ] uz ve ru versiyonları hazır; Özbekçe işaretler doğru (`oʻ`, `gʻ`).
- [ ] Bölüm 5'teki yasak ifadelerden hiçbiri yok.
- [ ] Story formatında üst ve alt ~250 px boş.
- [ ] Teslim klasörü ve `README.md` hazır; içinde token yok.
