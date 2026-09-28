# Görsel çekim protokolü — Brandbook Edition 02

Marka kurulunun birinci bulgusu: ana sayfanın "hazır şablon" gibi görünmesinin
sebebi tipografi değil, **11 farklı dünyadan gelen fotoğraf**. Koyu arduvaz
üstünde kırmızı gül, yeşil bergamot, sıcak bej pamuk, koyu gri çay — hepsi
farklı ışık, farklı zemin, farklı doygunluk. Sistem tek yüzey vaat ediyor,
fotoğraflar o yüzeyi deliyor.

Aşağıdaki protokol tek amaç için var: **11 görselin tek bir çekimden çıkmış
gibi durması.** Kural, konudan önce gelir.

## Değişmeyen kurallar

Her prompta kelimesi kelimesine eklenecek blok:

```
Shot on a single sheet of raw off-white paper, colour #F4F1EA, filling the
frame edge to edge — no horizon, no table edge, no second surface.
One soft light source from the upper left at roughly 35 degrees, large
diffuser, no fill card. A single soft-edged shadow falling to the lower
right, short, never longer than the object itself.
Straight-on or 15-degree elevated angle only. Object centred, occupying
about 55 percent of the frame height.
Muted, desaturated colour. No colour grading, no teal-orange, no bloom,
no vignette, no lens flare, no bokeh, no depth-of-field blur.
No props, no hands, no fabric, no wood, no marble, no water droplets,
no scattered petals, no smoke, no sparkle.
Photographic, not illustrated. Not a render. No text, no watermark, no logo.
Square 1:1 crop.
```

Yasak listesi kural kadar önemli. Kaldırılan her şey ("saçılmış yapraklar",
"su damlaları", "duman") stok parfüm fotoğrafçılığının klişesi ve tam olarak
şu anki 11 görseli birbirinden ayıran şey.

## Hero

Tek nesne, sayfanın açılışı. 4:3 (masaüstü) ve 4:5 (mobil) olarak iki kez.

```
A single 10 ml clear glass atomiser vial standing upright, filled with pale
amber liquid, brushed aluminium collar, no label. Beside it, lying flat,
one narrow white paper testing strip with a faint amber stain at one end.
Nothing else in frame.
+ [değişmeyen kurallar bloğu]
```

Gerekçe: dükkânın gerçekten sattığı şey bu — 10 ml dekant ve koku kartı.
Şu anki hero (tarçın çubukları, çiçek yaprakları) herhangi bir baharatçının
görseli olabilir.

## Nota kartları (6 adet)

Her nota için tek malzeme, aynı çerçeve. Malzeme **kuru ve tek parça**
olmalı — dağılmış yığın değil.

| Nota | Konu cümlesi |
|---|---|
| Bergamot | `Two whole bergamot fruits, one cut in half, cut face up.` |
| Gül | `Three dried rose heads, deep red, stems trimmed to 2 cm.` |
| Sandal ağacı | `Four blocks of sandalwood, cut square, dry pale grain.` |
| Vanilya | `Five whole vanilla pods, tied once with plain cotton thread.` |
| Misk | `A small heap of white crystalline powder, one flat spoon beside it.` |
| Amber | `Three pieces of raw amber resin, translucent, irregular edges.` |

Her biri değişmeyen kurallar bloğuyla birleştirilecek.

## Ruh hâli kartları (4 adet)

Kurul bu bölümün başlığının ("Choose a feeling") dört nota filtresine
gittiğini, yani vaadin yanlış olduğunu söyledi. Görsel tarafta çözüm: dört
karo **aynı nesnenin dört hâli** olsun, dört farklı dünya değil.

```
Clean   — One 10 ml vial, empty, clean glass, cap off, lying on its side.
Sensual — One 10 ml vial, filled with deep red liquid, cap on, upright.
Fresh   — One 10 ml vial, filled with pale green liquid, upright, one
          water bead on the glass.
Warm    — One 10 ml vial, filled with dark amber liquid, upright, cap
          resting beside it.
```

Dört görsel yan yana konduğunda tek bir seri okunur. Şu anki dört stok
fotoğrafın hiçbir ortak noktası yok.

## Ara çözüm (çekim yapılamıyorsa)

Yeni çekim mümkün değilse, mevcut 11 görseli tek paletle hizalayın. Tailwind
tarafında tek utility yeter:

```css
.plate-image {
  filter: grayscale(1) sepia(0.12) contrast(1.04) brightness(1.02);
}
```

Bu, fotoğrafı malzeme olarak korur ama paleti tekleştirir. Kalıcı çözüm
değil — nesneler hâlâ farklı ölçekte ve farklı ışıkta — ama "11 ayrı dünya"
problemini bugün kapatır.

## Neyle üretilir

Nano Banana (`mcp__nano-banana__generate_image`) bu oturumda mevcut. Fotoğraf
gerçekçiliği isteniyorsa üretilen görseller yine de tek tek gözle kontrol
edilmeli: üretici modeller cam ve sıvıda düzenli olarak fiziksel olarak
imkânsız yansımalar üretir, ve laboratuvar dili iddiasında bulunan bir sayfada
bu, stok fotoğraftan daha kötü durur.

Gerçek çekim her zaman tercih edilir: dükkânda zaten 10 ml şişe, koku kartı ve
düz beyaz kağıt var. Telefon kamerası, pencere ışığı ve tek kağıt yeterli —
protokolün tamamı bilerek bu ekipmanla uygulanabilir yazıldı.
