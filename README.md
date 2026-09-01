# 🚀 InstaResponse - Instagram 3D Auto-Reply & DM SaaS Platform

InstaResponse — bu Instagram postlari va Reels izohlariga (kommentariyalariga) 0.8 soniyada avtomatik javob yozish va foydalanuvchiga Direct (DM) orqali matn, rasm, video katalog yoki Google Gemini AI orqali aqlli savdo xabarlarini jo'natuvchi to'liq ko'p foydalanuvchili (SaaS) platforma.

---

## 📖 A dan Z gacha To'liq O'rnatish va Sozlash Qo'llanmasi

Instagram botingizni ulash uchun ikkita qulay usul mavjud:
- **1-USUL (Tavsiya etiladi):** ⚡ 1-Bosishda Avtomatik Ulash (Smart Auto-Connect — 1 daqiqada).
- **2-USUL:** 🛠️ Qo'lda Bosqichma-bosqich Sozlash (Advanced Manual Setup).

---

## ⚡ 1-USUL: Tezkor Avtomatik Ulash (Eng Osoni — 1 Daqiqa)

Ushbu usulda sizga hech qanday `Page ID` qidirish yoki `Webhook` sozlamalari bilan ovora bo'lish talab etilmaydi. Tizim hamma narsani **o'zi avtomatik** bajaradi!

### 1-Qadam: Instagramni tayyorlash
1. **Instagram Biznes hisobga o'tish:** Telefoningizda *Settings ➡️ Account type and tools ➡️ Switch to professional account* (Bepul).
2. **Facebook Sahifaga ulash:** Facebookda sahifa ochib, Instagram profilingizni unga ulang.
3. **Xabarlarga ruxsat berish:** Instagramda *Settings ➡️ Messages and story replies ➡️ Message controls ➡️ **Allow access to messages*** ni yoqing.

### 2-Qadam: Meta-dan 1 ta Token olish
1. [developers.facebook.com](https://developers.facebook.com/) ➡️ **Tools** ➡️ **Graph API Explorer** bo'limiga kiring.
2. O'z Facebook Sahifangizni tanlab, quyidagi ruxsatlarni belgilang:
   - `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`
3. **"Generate Access Token"** tugmasini bosing va chiqqan uzun tokenni nusxalab oling.

### 3-Qadam: Saytda 1-bosishda ishga tushirish
1. Saytimizdagi shaxsiy kabinetingizga kiring:
   👉 **[https://instagram-comment-bot-4aeh.onrender.com/dashboard.html](https://instagram-comment-bot-4aeh.onrender.com/dashboard.html)**
2. **"⚡ Tezkor Avtomatik Ulash"** maydoniga olgan tokeningizni tashlang.
3. **`[ 🚀 Avtomatik Bog'lash va Ishga Tushirish ]`** tugmasini bosing.

**TAYYOR! 🎉** Tizim 1 soniyada:
- Facebook Page ID va Instagram ID-ni o'zi aniqlaydi.
- Meta Webhook obunasini o'zi yoqadi.
- Ekranda **`@instagram_akkaunt — 🟢 Faol Ulangan`** yashil belgisi yonadi!

---

## 🛠️ 2-USUL: Qo'lda Bosqichma-bosqich Sozlash (Klassik Usul)

Agar siz har bir parametrni qo'lda kiritishni istasangiz:

### 1-BOSQICH: Meta Developer-da Ilova Ochish
1. [developers.facebook.com](https://developers.facebook.com/) saytiga kiring ➡️ **My Apps** ➡️ **Create App**.
2. Maqsad: **Other** ➡️ **Business** (yoki *Manage messaging & content on Instagram*).
3. Ilovaga nom bering (masalan: `Insta-Auto-Bot`) va yarating.

### 2-BOSQICH: Token va Page ID Olish
1. **Graph API Explorer** bo'limiga kiring.
2. Sahifangizni tanlab, `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages` ruxsatlari bilan **Page Access Token** oling.
3. `me?fields=id,name` so'rovi orqali **Facebook Page ID** raqamingizni oling (masalan: `102938475610293`).

### 3-BOSQICH: Dashboardda Qo'lda Saqlash
1. Shaxsiy kabinetingizdagi **"Qo'lda Kiritish (Kengaytirilgan)"** bo'limini oching:
   - **Facebook Page ID:** Sahifa raqamingizni yozing.
   - **Page Access Token:** Meta-dan olingan tokenni kiriting.
   - **Verify Token:** `instagram_bot_secret_token_2026` deb yozing.
2. Komment va DM xabarlarini sozlab, **"Sozlamalarni Saqlash"** tugmasini bosing.

### 4-BOSQICH: Webhook-ni Qo'lda Yoqish
1. Meta Developer ➡️ **Webhooks** ➡️ **Instagram** bo'limiga kiring.
2. **Edit Subscription** tugmasini bosing:
   - **Callback URL:** `https://instagram-comment-bot-4aeh.onrender.com/webhook`
   - **Verify Token:** `instagram_bot_secret_token_2026`
   - **Verify and Save** tugmasini bosing.
3. Pastdagi `comments`, `messages` va `messaging_postbacks` qatorlariga **Subscribe** tugmasini bosing.

---

### 🚀 Botingiz Qanday Ishlaydi?

1. Istalgan foydalanuvchi Instagram postingiz yoki Reel-ingizga *"narxi qancha?"* deb yozadi.
2. Bot 0.8 soniyada izoh ostiga javob qaytaradi: `@mijoz Javobingizni Direct (DM)ga yubordik! 📩`.
3. Mijozning Direct qutisiga mahsulot rasmi, narxi, video katalogi yoki Gemini AI javobi darhol yetib boradi.
4. Barcha jo'natilgan xabarlar shaxsiy kabinetingizdagi **Analitika & Loglar** jadvalida saqlanadi.

---

## 💳 Tariflar va To'lovlar (Billing)

- **Boshlang'ich (Free):** 0 so'm / oy (Oylik 100 ta komment).
- **Professional (Pro):** 190,000 so'm / oy (Cheksiz komment va DMlar, rasm/video jo'natish).
- **Korporativ (AI):** 490,000 so'm / oy (Google Gemini AI aqlli savdo agenti bilan).

To'lovlar **Payme**, **Click**, **Uzum Bank** yoki **Bank Karta (Uzcard/Humo/Visa)** orqali avtomatik qabul qilinadi.

---

## 👑 Super Admin Boshqaruvi

`asilbekqodirov2015@gmail.com` profili tizimda Super Admin hisoblanadi:
- Barcha foydalanuvchilar bazasini va ulangan sahifalarini ko'rish.
- Platformaning umumiy tushgan daromadini (so'mda) kuzatish.
- Foydalanuvchilarga qo'lda Pro/Business tariflarini berish yoki qoidabuzarlarni bloklash.
