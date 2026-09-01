# 🚀 InstaResponse - Instagram 3D Auto-Reply & DM SaaS Platform

InstaResponse — bu Instagram postlari va Reels izohlariga (kommentariyalariga) 0.8 soniyada avtomatik javob yozish va foydalanuvchiga Direct (DM) orqali matn, rasm, video katalog yoki Google Gemini AI orqali aqlli savdo xabarlarini jo'natuvchi to'liq ko'p foydalanuvchili (SaaS) platforma.

---

## 📖 A dan Z gacha To'liq O'rnatish va Sozlash Qo'llanmasi

Har bir foydalanuvchi o'z Instagram akkauntini platformaga ulashi uchun quyidagi 5 ta bosqichni ketma-ket bajarishi kerak:

---

### 1-BOSQICH: Instagram Akkauntni Tayyorlash

1. **Instagram profilni Biznes (Professional) rejimga o'tkazish:**
   - Telefoningizda Instagram ilovasini oching.
   - Profilingizga o'ting va yuqori o'ng burchakdagi **3 ta chiziqcha (Menyu)** ni bosing.
   - **Settings and privacy** (Sozlamalar) ➡️ **Account type and tools** bo'limiga kiring.
   - **Switch to professional account** (Professional hisobga o'tish) tugmasini bosing va toifani (masalan: *Creator* yoki *Shopping & Retail*) tanlang.
   *(Bu mutlaqo bepul).*

2. **Facebook Sahifaga (Page) ulash:**
   - [facebook.com/pages/create](https://www.facebook.com/pages/create) manziliga kirib, yangi sahifa oching (yoki mavjud sahifangizni ishlating).
   - Facebook sahifangiz sozlamalaridan **Linked Accounts (Bog'langan hisoblar)** ➡️ **Instagram** bo'limiga kiring va o'z Instagram akkauntingizni ulang.

3. **Instagram xabarlariga ruxsat berish (Majburiy):**
   - Instagram ilovasida: **Settings and privacy** ➡️ **Messages and story replies** ➡️ **Message controls** bo'limiga kiring.
   - **"Allow access to messages"** (Xabarlarga ruxsat berish) tugmasini yoqib qo'ying (Ko'k rangda bo'lishi shart).

---

### 2-BOSQICH: Meta for Developers (Facebook)da Ilova Yaratish

1. [developers.facebook.com](https://developers.facebook.com/) saytiga kiring va Facebook hisobingiz orqali tizimga kiring.
2. Yuqoridagi **"My Apps"** (Mening ilovalarim) ➡️ **"Create App"** (Ilova yaratish) tugmasini bosing.
3. Ilova maqsadi sifatida **"Other"** ➡️ **"Business"** ni tanlang (yoki *Manage messaging & content on Instagram*).
4. Ilovaga istalgan nom bering (masalan: `Insta-Auto-Bot`) va emailingizni kiritib **Create app** tugmasini bosing.

---

### 3-BOSQICH: Meta Tokenlari va Facebook Page ID-ni Olish

1. Meta Developer panelida yuqoridagi **Tools** menyusidan **`Graph API Explorer`** bo'limiga kiring.
2. O'ng tarafdagi sozlamalar panelida:
   - **Meta App:** Boya yaratgan ilovangizni tanlang (`Insta-Auto-Bot`).
   - **User or Page:** Ro'yxatdan **"Page Access Token"** bo'limi ostidagi o'zingizning Facebook sahifangizni tanlang.
3. **Permissions (Ruxsatnomalar):** Pastdagi "Add a Permission" tugmasini bosib quyidagi 4 ta ruxsatnomani qidirib qo'shing:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
4. Ko'k rangli **"Generate Access Token"** tugmasini bosing. Facebook oynasi chiqadi — barcha so'ralgan sahifa va Instagram akkauntingizga ruxsat bering.
5. Ekrandagi uzun **Access Token** maydonidagi kodni nusxalab oling (Bu sizning **`Page Access Token`**ingiz).
6. **Facebook Page ID raqamini aniqlash:**
   - Graph API Explorer qidiruv maydoniga `me?fields=id,name` deb yozib, **Submit** tugmasini bosing.
   - Chiqqan JSON javobidagi `"id": "102938475610293"` raqamini nusxalab oling (Bu sizning **`Facebook Page ID`**ingiz).

---

### 4-BOSQICH: InstaResponse Saytidagi Shaxsiy Kabinetga Kiritish

1. Bizning rasmiy saytimizga kiring:
   👉 **[https://instagram-comment-bot-4aeh.onrender.com/login.html](https://instagram-comment-bot-4aeh.onrender.com/login.html)**
2. Ro'yxatdan o'ting yoki tizimga kiring.
3. Shaxsiy kabinetingizdagi **📱 Bot Boshqaruvi** bo'limida:
   - **Facebook Page ID:** 3-bosqichda olgan raqamli ID-ni kiriting.
   - **Page Access Token:** 3-bosqichda nusxalangan uzun tokenni kiriting.
   - **Webhook Verify Token:** `instagram_bot_secret_token_2026` deb yozing.
4. **Trigger va Xabarlar:**
   - Barcha kommentlarga yoki faqat ma'lum kalit so'zlarga (masalan: *"narx, kurs, link"*) javob qaytarishni tanlang.
   - Kommentga yoziladigan matnlarni kiriting (bir nechta variant kiritishingiz mumkin, tizim spamga tushmaslik uchun ularni navbatma-navbat tasodifiy tanlaydi).
   - DM turi sifatida: **Matn**, **Rasm + Matn**, **Video + Matn** yoki **Gemini AI** ni tanlang.
5. **"Sozlamalarni Saqlash"** tugmasini bosing.

---

### 5-BOSQICH: Meta Webhook-ni Serverga Bog'lash (Jonli Ishga Tushirish)

1. [developers.facebook.com](https://developers.facebook.com/) paneliga qayting.
2. Chap menyudan **Webhooks** bo'limiga kiring.
3. Tepada ochiluvchi menyudan **Instagram** ni tanlang.
4. **Edit Subscription** (yoki Callback URL qo'shish) tugmasini bosing:
   - **Callback URL:** `https://instagram-comment-bot-4aeh.onrender.com/webhook`
   - **Verify Token:** `instagram_bot_secret_token_2026`
   - **Verify and Save** tugmasini bosing (Yashil tasdiq belgisi chiqadi).
5. Pastdagi ro'yxatdan quyidagi qatorlarga **Subscribe** (Obuna bo'lish) tugmasini bosing:
   - `comments` ➡️ Subscribe
   - `messages` ➡️ Subscribe
   - `messaging_postbacks` ➡️ Subscribe

---

### 🎉 Tabriklaymiz! Botingiz 100% Jonli Ishga Tushdi!

Endi istalgan boshqa akkauntdan o'z Instagram sahifangizdagi birorta post yoki Reel ostiga izoh yozib ko'ring (masalan: *"narxi qancha?"*):
1. Bot 0.8 soniyada o'sha izoh ostiga javob qaytaradi.
2. Mijozning Direct (DM) qutisiga mahsulot rasmi, narxi yoki video katalogi darhol yetib boradi.
3. Shaxsiy kabinetingizdagi **Analitika & Loglar** jadvalida har bir xabar real-vaqtda aks etadi!

---

## 💳 Tariflar va To'lovlar (Billing)

Saytda 3 xil obuna rejasi mavjud:
- **Boshlang'ich (Free):** 0 so'm / oy (Oylik 100 ta komment).
- **Professional (Pro):** 190,000 so'm / oy (Cheksiz komment va DMlar, rasm/video jo'natish).
- **Korporativ (AI):** 490,000 so'm / oy (Google Gemini AI aqlli savdo agenti).

To'lovlarni **Payme**, **Click**, **Uzum Bank** yoki **Bank Karta (Uzcard/Humo/Visa)** orqali amalga oshirish mumkin.

---

## 👑 Super Admin Imkoniyatlari

`asilbekqodirov2015@gmail.com` hisobi Super Admin hisoblanadi:
- Barcha ro'yxatdan o'tgan foydalanuvchilar bazasini ko'rish.
- Platformaning umumiy tushgan daromadini (so'mda) kuzatish.
- Foydalanuvchilarga qo'lda Pro/Business tariflarini berish yoki qoidabuzarlarni bloklash.
