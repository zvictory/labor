# Google Wallet'ni ishga tushirish: Zafar uchun qadamlar

_Sana: 2026-11-16 · Kod: `apps/store/lib/wallet/google` · Reja: `2026-11-15-sodiqlik-va-wallet-rejasi.md`, 2-bosqich_

Kod tayyor. Ishga tushirish uchun Google tomonida akkaunt va kalit kerak; ularni faqat kompaniya egasi ochadi. Kalit hech qachon chatga, xatga yoki repoga yozilmaydi: faqat serverdagi `/srv/labor/.env` ga.

## 1. Google Pay & Wallet Console

1. https://pay.google.com/business/console ga kompaniya Google akkaunti bilan kiring.
2. Chap menyuda **Google Wallet API** ni tanlang. **Issuer ID** ni yozib oling (uzun raqam).
3. **Business profile** ni toʻldiring: kompaniya nomi, manzil, toʻlov profili. Google tekshiruvi buni soʻraydi.

## 2. Google Cloud: API va xizmat akkaunti

1. https://console.cloud.google.com da yangi loyiha oching (masalan `labor-wallet`).
2. **APIs & Services → Library** dan **Google Wallet API** ni yoqing (Enable).
3. **IAM & Admin → Service Accounts → Create service account**. Nomi: `labor-wallet`. Rol berish shart emas.
4. Yaratilgan akkaunt → **Keys → Add key → Create new key → JSON**. Fayl kompyuteringizga tushadi.
5. Akkauntning emailini yozib oling (`…@….iam.gserviceaccount.com`).

## 3. Xizmat akkauntiga ruxsat

Google Pay & Wallet Console → **Users** → **Invite a user** → 2-qadamdagi email → rol **Developer**.

## 4. Serverga yozish

Mac'da JSON fayl turgan papkada:

```bash
base64 -i key.json | tr -d '\n' > key.b64
scp key.b64 root@labor-prod:/root/key.b64
ssh root@labor-prod 'cd /srv/labor && cp .env .env.bak-$(date +%F) && sed -i "/^GOOGLE_WALLET_/d" .env && echo "GOOGLE_WALLET_ISSUER_ID=ISSUER_ID_SHU_YERGA" >> .env && echo "GOOGLE_WALLET_SERVICE_ACCOUNT=$(cat /root/key.b64)" >> .env && shred -u /root/key.b64'
rm key.b64
```

`ISSUER_ID_SHU_YERGA` oʻrniga 1-qadamdagi raqamni yozing. JSON faylni xavfsiz joyda saqlang yoki oʻchiring. Keyin deploy: `./infra/deploy/deploy.sh`.

## 5. Sinov (demo rejim)

Akkaunt avval **demo rejimda**: kartani faqat Console'da test foydalanuvchi qilib qoʻshilgan Google akkauntlari saqlay oladi.

1. Console → **Google Wallet API → Test users** ga oʻz Google akkauntingizni qoʻshing.
2. Android telefonda saytga kiring, **Kabinet → Google Wallet'ga qoʻshish**. Karta "[TEST ONLY]" belgisi bilan saqlanadi.
3. Filial kassasida oʻzingizga xarid kiriting: kartadagi bonus yangilanishi va telefonga bildirishnoma kelishi kerak.
4. `/ru/admin/wallet` dan oʻzingizga xabar yuboring: kartaning orqasida chiqishi va telefon jiringlashi kerak.

## 6. Hamma uchun ochish

Console → **Google Wallet API → Get publishing access → Request publishing access**. Google jamoasi tekshiradi va xat yuboradi. Shundan keyin "[TEST ONLY]" yoʻqoladi va karta hammaga ochiladi.

## 7. Filial yonida eslatma (geozona)

Google kartaga filial koordinatalari qoʻshilsa, mijoz yaqinlashganda telefon oʻzi eslatadi. Buning uchun ikkala filialning aniq koordinatalari kerak (Yandex Maps yoki 2GIS'dan: kenglik, uzunlik). Menga yuboring, `lib/store-contact.ts` ga yozaman.

## Bilish kerak

- **Bildirishnomalar:** bonus yozilganda, tugʻilgan kunda va daraja oshganda telefon jiringlaydi; bonus ishlatilganda karta jim yangilanadi.
  - Google limiti: bitta kartaga sutkasiga 3 ta.
  - Labor qoidasi: reklama xabari haftasiga 1 ta.
  - Shaxsiy va reklama xabarlari kunlik limitning oxirgi oʻrnini egallamaydi: u mijozning oʻz yangiligi (bonus, tugʻilgan kun) uchun qoladi.
- **Kim oladi:** xabarlar faqat reklama olishga rozilik bergan aʼzolarga boradi.
- **"Saqlandi" belgisi:** Google kartani saqlagan-saqlamaganini keyingi sinxronlashda xabar qiladi. Saqlash va oʻchirish haqidagi darhol xabarlar (callback) hozircha ulanmagan.
- **Tugma matni:** Oʻzbekcha tugmani Google oʻzi beradi ("Kiriting Google Wallet"); brend qoidalariga koʻra uni oʻzgartirish mumkin emas.
