# Sodiqlik dasturi, Google Wallet va Apple Wallet: reja

_Sana: 2026-11-15 · Kod: `apps/store` · Oldingi tadqiqot: `docs/research/2026-11-15-exzap-sonrasi-parfum-plani.md`_

## Qisqa xulosa

- **Maqsad:** mijozning telefonida doim turadigan "Labor kartasi". U bonus va darajani koʻrsatadi, filialda skanerlanadi, filial yonida oʻzi qulf ekranida chiqadi. Google Wallet orqali esa SMS cheklovlariga bogʻliq boʻlmagan xabar kanali beradi.
- **Tartib:** avval sodiqlik dasturining yadrosi, keyin Google Wallet, keyin Apple Wallet. Karta koʻrsatadigan narsa (bonus, daraja) boʻlmasa, Wallet'ning maʼnosi yoʻq.
- **Muhim cheklov:**
  - Apple Wallet orqali reklama xabari yuborish **taqiqlangan**.
  - Google Wallet orqali mumkin, lekin bitta kartaga sutkasiga koʻpi bilan 3 ta.
  - Erkin matnli reklama uchun asosiy kanal Telegram boʻlib qoladi. U allaqachon bor.
- **Hajm:** taxminan 3–3,5 hafta dasturlash. Bundan tashqari Apple va Google akkauntlarini ochish hamda Google tekshiruvi kerak; ularning muddati bizga bogʻliq emas.
- **Hammasi oʻzimizda:** tashqi Wallet xizmatlari (PassKit, Litecard va h.k.) ishlatilmaydi. Mijoz maʼlumotlari Labor serverida qoladi.

## 1. Platformalar qoidalari (rasmiy hujjatlardan)

### Apple Wallet

- **Ekrandagi matn qayerdan keladi:**
  - Kartadagi maydon oʻzgarganda Apple shu maydonning `changeMessage` matnini koʻrsatadi, masalan "Bonusingiz: %@".
  - Serverdan yuboriladigan push boʻsh (_"an empty JSON dictionary for the payload"_).
  - Ixtiyoriy matn yuborib boʻlmaydi.
- **Reklama taqiqlangan.** Human Interface Guidelines'da: _"Use change messages only for updates to time-critical information… Never use a change message for marketing or other noncritical communication."_
- **Qulf ekranida paydo boʻlish:**
  - Kartaga 10 tagacha manzil (`locations`, `maxDistance`) va sanalar (`relevantDates`) yoziladi.
  - Mijoz filialga yaqinlashganda tizim kartani qulf ekranida taklif qiladi.
  - Bu xabar emas, lekin eslatma vazifasini bajaradi.
- **Ovozsiz yangilash:** `changeMessage`'i yoʻq maydon xabarsiz yangilanadi. Masalan, kartaning orqa tomonidagi "Hozirgi taklif" maydoni. Mijoz kartani ochganda yangisini koʻradi.
- **Server qismi:**
  - Apple talab qiladigan 5 ta endpoint: qurilmani roʻyxatga olish, roʻyxatdan chiqarish, yangilangan kartalar roʻyxati, yangi kartani berish, log.
  - Faqat HTTPS orqali ishlaydi.
  - Push faqat production muhitida ishlaydi.

### Google Wallet

- **Xabarlar:**
  - `TEXT_AND_NOTIFY` turidagi xabar kartaning orqa tomoniga qoʻshiladi va push yuboradi.
  - Kartaning shabloniga (class) yuborilgan xabar barcha egalariga boradi. Bitta kartaga (object) yuborilgani faqat oʻsha mijozga boradi.
- **Limit:** _"a maximum of 3 messages that trigger a push notification in a 24 hour period"_.
  - Bitta kartaga 24 soatda 3 ta.
  - Bonus yoki daraja oʻzgargandagi bildirishnomalar ham shu limitga kiradi.
  - Google spam deb hisoblasa, bundan ham kamaytirishi mumkin.
- **Qulf ekranidagi matnni Google oʻzi belgilaydi.** Bizning matnimiz kartaning ichida koʻrinadi.
- **Havolalar** faqat kartaga tegishli sayt yoki ilovaga olib borishi kerak. Aks holda Acceptable Use Policy buziladi.
- **Mijoz** Wallet'da bildirishnomalarni yoqqan boʻlishi kerak.
- **Ishga tushirish:**
  - Issuer akkaunt ochiladi va Business Profile toʻldiriladi (toʻlov profili bilan).
  - Google Wallet jamoasi tekshirib, "publishing access" beradi. Shungacha kartalar faqat test akkauntlarida ishlaydi.
- **Ziddiyat:** Google'ning FAQ sahifasida _"Developer authored push notifications are not currently supported"_ deb yozilgan. Bu yuqoridagi xabar sahifasiga zid. Ishga tushirishdan oldin haqiqiy telefonda sinab koʻriladi (3-bosqich).
- **Mamlakat:** Google Wallet Oʻzbekistonda 27-oktyabr 2026 dan ishlaydi. Sodiqlik kartalari aynan Oʻzbekistonda ishlashi rasmiy roʻyxatda tasdiqlanmagan. Bu ham test bilan tekshiriladi.

### SMS va qonun (1-noyabr 2026 dan)

- Reklama SMS va qoʻngʻiroqlari:
  - faqat yozma yoki elektron rozilik bilan;
  - **18:00–09:00** oraligʻida taqiqlangan;
  - operator abonent soʻrovi bilan ularni bloklaydi.
- Reklama yuboruvchi tizim shaxsiy maʼlumotlar bazalari davlat reyestrida roʻyxatdan oʻtadi.
- Yangiliklarda qoida mobil aloqa tarmogʻi orqali yuboriladigan SMS va qoʻngʻiroqlar haqida deyilgan. Wallet va Telegram tilga olinmagan.
- Qaror matnini lex.uz'da tekshira olmadik. Shuning uchun reja **barcha kanallar uchun alohida rozilik** saqlaydi. Reyestrga yozilish yurist bilan hal qilinadi.

## 2. Sodiqlik modeli

Avvalgi rejada "bonus hamyoni emas, faqat daraja chegirmasi" deyilgan edi. Wallet'ga investitsiya qilinganda bu oʻzgaradi. Apple ruxsat bergan yagona muntazam xabar bonus va daraja oʻzgarishi. Faqat darajaning oʻzi yiliga bir-ikki marta oʻzgaradi, shuning uchun karta jim qoladi. Shu sababli **daraja + bonus** tavsiya qilinadi.

Raqamlar taklif; qarorni Zafar qabul qiladi:

| Daraja | Shart (soʻnggi 12 oy xaridlari, sayt + filial) | Bonus |
| ------ | ---------------------------------------------- | ----- |
| Labor  | Roʻyxatdan oʻtgan hamma                        | 3%    |
| Silver | 1 000 000 soʻm dan                             | 5%    |
| Gold   | 3 000 000 soʻm dan                             | 7%    |

- **Bonus qachon yoziladi:**
  - Saytdagi buyurtmada: buyurtma "yetkazildi" holatiga oʻtganda (`deliveredAt` allaqachon bor).
  - Filialda: kassir skanerlaganda.
  - Bekor qilingan buyurtmaga bonus berilmaydi; yozilgan boʻlsa qaytariladi.
- **Bonus qanday ishlatiladi:**
  - Keyingi xaridning koʻpi bilan 30% gacha.
  - Promo-kod bilan birga ishlaydimi: qaror kerak (taklif: ishlamaydi, mijoz bittasini tanlaydi).
  - Namuna toʻplamlari uchun ham bonus beriladi.
- **Muddati:** har bir yozuv 180 kundan keyin yonadi. 14 kun oldin ogohlantirish yuboriladi. Bu Apple ruxsat bergan "muhim maʼlumot".
- **Daraja** har kuni qayta hisoblanadi. Pasayish faqat 12 oylik summa chegaradan tushganda.
- **Hisob:** bonus Labor uchun majburiyat. Admin'da jami yozilgan, ishlatilgan va yongan bonuslar koʻrinadi.

## 3. Maʼlumotlar modeli (Prisma)

- **`LoyaltyAccount`:** `userId` (unique), `cardNumber` (unique, masalan `LB 4821 7730`), `tier`, `balance` (soʻm, butun son), `marketingConsentAt`, `marketingConsentSource` (sayt / bot / filial), `createdAt`.
- **`LoyaltyEntry`** (oʻzgarmas yozuvlar daftari):
  - `accountId`;
  - `kind`: `earn` | `spend` | `expire` | `adjust` | `reverse`;
  - `amount`, `orderId?`, `branch?` (`ocean` | `gulzor`), `purchaseAmount?`, `staffUserId?`, `note?`;
  - `expiresAt?`, `createdAt`.
  - Balans faqat shu daftardan hisoblanadi.
- **`Order.bonusSpent`:** checkout'da ishlatilgan bonus, `discount` va `setDiscount` kabi alohida saqlanadi.
- **`WalletPass`:**
  - `accountId`, `platform` (`google` | `apple`);
  - Apple uchun `serialNumber` va `authToken`;
  - `lastUpdatedAt`;
  - Google uchun `notifyCount24h` hisobi.
- **`AppleDeviceRegistration`:** `deviceLibraryId`, `pushToken`, `passId`. Apple hujjatidagi qurilmalar, kartalar va roʻyxatga olishlar jadvallari shu.
- **`WalletMessage`:** admin yuborgan Google xabarlari tarixi: matn, segment, nechta kartaga yetgani, sana.

## 4. Bosqichlar

### 0-bosqich: qarorlar va akkauntlar (Zafar, parallel)

1. Sodiqlik raqamlari: darajalar, foizlar, 30% chegara, 180 kun, promo-kod bilan birga ishlashi.
2. **Apple Developer Program** kompaniya nomiga.
   - Yillik toʻlov bor.
   - Kompaniya akkaunti uchun odatda D-U-N-S raqami soʻraladi; buni roʻyxatdan oʻtishda tekshirish kerak.
   - Keyin Pass Type ID va sertifikat yaratiladi.
3. **Google Pay & Wallet Console:**
   - Issuer akkaunt, Business Profile, toʻlov profili.
   - Google Cloud'da service account; uning kaliti faqat serverdagi `.env` ga yoziladi.
4. Ikkala filialning aniq koordinatalari. `lib/store-contact.ts` da xarita havolalari hali boʻsh.
5. Yurist: shaxsiy maʼlumotlar reyestri va rozilik matni.

### 1-bosqich: sodiqlik yadrosi (~1 hafta)

- Yuqoridagi modellar va migratsiya. Bonus hisob-kitobi alohida, I/O'siz modulda (`lib/loyalty/rules.ts`), testlar bilan (`lib/sets/rules.ts` kabi).
- **Saytdagi buyurtma:**
  - "Yetkazildi" holatida bonus yoziladi.
  - Bekor qilinganda qaytariladi.
  - Checkout'da "Bonusdan ishlatish" maydoni bor; buyurtma jami bilan birga serverda qayta tekshiriladi.
- **Kabinet** (`/account`): karta raqami, QR, daraja, balans, yonish sanalari, keyingi darajagacha qancha qolgani.
- **Filial sahifasi** (`/admin/scan`, staff roli):
  - Kassir telefon kamerasi bilan QR'ni skanerlaydi.
  - Xarid summasini kiritadi (`MoneyInput`) va filialni tanlaydi.
  - Bonus yoziladi yoki yechiladi.
  - Har bir amal xodim nomi bilan daftarga yoziladi.
  - Bir martalik katta summalar uchun chegara qoʻyiladi; tuzatishni faqat admin qila oladi.
- **Akkaunti yoʻq mijoz filialda:** xodim telefon raqamini kiritadi. Mijozga bir martalik kod yuboriladi (SMS OTP allaqachon bor). Mijoz kodni aytadi va karta ochiladi. Rozilik shu yerda belgilanadi.
- **Telegram bot:** `/karta` buyrugʻi balans va QR'ni koʻrsatadi. Bonus yozilganda va yonishidan 14 kun oldin bot xabari yuboriladi.
- **Admin:** aʼzolar soni, darajalar boʻyicha taqsimot, bonus majburiyati, filial savdolari.
- **Rozilik:** saytda, botda va filialda alohida "reklama xabarlarini olishga roziman" belgisi. Telegram duyurulari ham bundan keyin shu belgiga qaraydi.

### 2-bosqich: Google Wallet (~1 hafta)

- **Karta shabloni:** bitta `LoyaltyClass` (logo, ranglar, filial manzillari). Har bir aʼzoga `LoyaltyObject`: karta raqami (barcode), balans (`loyaltyPoints`), daraja (`rewardsTier`), kabinetga havola.
- **Qoʻshish tugmasi:** kabinetda, buyurtma sahifasida va botda "Google Wallet'ga qoʻshish". Imzolangan JWT havolasi service account kaliti bilan server tomonda tuziladi.
- **Sinxronlash:** daftarga yozuv tushganda kartaning balansi va darajasi `PATCH` bilan yangilanadi.
  - Bildirishnoma faqat bonus yozilganda va daraja oshganda yoqiladi.
  - Ishlatilganda xabarsiz yangilanadi, limitni tejash uchun.
- **Admin'da "Wallet xabari":**
  - Matn, havola (avtomatik `utm_source=wallet&utm_medium=google`), segment (hamma / daraja / 60 kundan beri xarid qilmaganlar).
  - Yuborishdan oldin nechta kartaga yetishini koʻrsatadi.
  - **Ichki qoida:** bitta kartaga haftasiga koʻpi bilan 1 ta reklama xabari. Google'ning 3/sutka limiti bonus xabarlari uchun qoladi.
  - Faqat rozilik bergan aʼzolarga boradi.
- **Sinov:**
  - Test akkauntida qoʻshish, yangilash va xabar.
  - Haqiqiy Android telefonda push kelishini tekshirish (FAQ ziddiyati).
  - Keyin "publishing access" soʻrovi.

### 3-bosqich: Apple Wallet (~1–1,5 hafta)

- **Karta (`.pkpass`):**
  - Turi: `storeCard`.
  - Old tomonda: balans (`changeMessage`: "Bonusingiz: %@") va daraja (`changeMessage`: "Darajangiz: %@").
  - Barcode: karta raqami.
  - Orqa tomonda: "Hozirgi taklif" (`changeMessage`'siz, ovozsiz), kabinet va sayt havolalari (UTM bilan).
  - `locations`: Ocean va Gulzor filiallari.
  - Sertifikat bilan server tomonda imzolanadi.
- **Server:**
  - Apple'ning 5 ta endpoint'i.
  - Qurilma push-tokenlari bazada saqlanadi.
  - Yangilanishda APNs'ga boʻsh push yuboriladi.
  - Yaroqsiz token oʻchiriladi.
- **Qoida:**
  - `changeMessage` faqat bonus yozilishi, daraja oʻzgarishi va bonus yonishi haqida.
  - Reklama matni hech qachon `changeMessage` orqali bormaydi.
  - "Hozirgi taklif" maydoni haftada bir martadan koʻp oʻzgartirilmaydi.
- **Sinov:** haqiqiy iPhone'da qoʻshish, yangilash, qulf ekrani xabari va filial yonida paydo boʻlish.

### 4-bosqich: oʻlchash (doimiy)

- Faol mijozlarning necha foizi aʼzo, necha foizi kartani Wallet'ga qoʻshgan (platforma boʻyicha).
- Aʼzolar va aʼzo boʻlmaganlarning qayta xarid ulushi: 60 va 90 kun ichida.
- Filial savdolarining necha foizi karta bilan aniqlangan.
- Har bir Wallet xabaridan keyingi 7 kundagi buyurtmalar: `/admin/sources` da `utm_source=wallet` boʻyicha.
- Bonus majburiyati va yonish ulushi.

## 5. Xavflar

| Xavf                                                  | Nima qilamiz                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Google "publishing access" bermaydi yoki kechiktiradi | 1-bosqich Wallet'siz ham ishlaydi (kabinet, bot, filial); Google tayyor boʻlgunicha shu bilan yuramiz |
| Google push haqiqatda ishlamaydi (FAQ ziddiyati)      | 2-bosqich oxirida sinov; ishlamasa Google karta faqat bonus va QR uchun qoladi                        |
| Apple akkaunti uzoq ochiladi (D-U-N-S)                | 0-bosqichda darhol boshlanadi; Apple oxirgi bosqichda                                                 |
| Xodim notoʻgʻri bonus yozadi                          | Har amal xodim nomi bilan daftarda; summa chegarasi; tuzatish faqat admin'da; haftalik hisobot        |
| Bonus majburiyati oʻsib ketadi                        | 180 kunlik yonish, 30% ishlatish chegarasi, admin'da jami koʻrinadi                                   |
| Push'ga qonun keyin cheklov qoʻyadi                   | Hamma kanal uchun rozilik saqlanadi; yuborish soati admin'da sozlanadi                                |

## 6. Zafarning qarorlari

1. Darajalar va foizlar (jadvaldagi taklif yoki boshqa).
2. Bonusni ishlatish chegarasi (30%), muddati (180 kun), promo-kod bilan birga ishlashi.
3. Apple Developer va Google Pay & Wallet akkauntlarini kompaniya nomiga ochish (buni faqat kompaniya egasi qila oladi).
4. Filiallardagi jarayon: kassir har xaridda kartani soʻraydimi; filialda telefon yoki planshet bormi.
5. Rozilik matni va shaxsiy maʼlumotlar reyestri (yurist).

## Manbalar

- Apple:
  - [Human Interface Guidelines: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)
  - [PassFieldContent (changeMessage)](https://developer.apple.com/documentation/walletpasses/passfieldcontent)
  - [Pass (locations, relevantDates)](https://developer.apple.com/documentation/walletpasses/pass)
  - [Adding a web service to update passes](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes)
- Google:
  - [Trigger push notifications (loyalty)](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications)
  - [Updates](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates)
  - [JWT](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/jwt)
  - [Redemption methods](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/redemption-methods)
  - [Request publishing access](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/request-publishing-access)
  - [FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq)
- SMS qoidalari:
  - [Spot.uz](https://www.spot.uz/ru/2026/07/16/telecommunications)
  - [Gazeta.uz](https://www.gazeta.uz/ru/2026/07/16/mobile/)
  - [Kursiv](https://uz.kursiv.media/2026-07-16/v-uzbekistane-zapretyat-reklamnye-sms-bez-soglasiya-abonentov-s-1-noyabrya-2026-goda/)
