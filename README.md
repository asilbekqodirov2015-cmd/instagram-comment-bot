# Instagram AutoResponder - O'rnatish va Sozlash Yo'riqnomasi

Ushbu loyiha Instagram postlari yoki reel (video)lari ostida qoldirilgan kommentariyalarga avtomatik javob yozish va kommentariya yozgan foydalanuvchiga avtomatik ravishda Direct (DM) orqali matnli xabar, rasm yoki video yuborish uchun mo'ljallangan.

Loyiha tarkibida barcha sozlamalarni boshqarish va faollik jurnallarini (logs) real-vaqtda ko'rish uchun mo'ljallangan chiroyli **Admin Dashboard** mavjud.

---

## ⚡ Tezkor Ishga Tushirish (Local)

### 1. Bog'liqliklar va Serverni ishga tushirish:
Tizimni ishga tushirish uchun kompyuteringizda [Node.js](https://nodejs.org/) o'rnatilgan bo'lishi kerak.

Loyiha katalogida quyidagi buyruqlarni ishga tushiring:

```bash
# Kutubxonalarni o'rnatish (Windows tizimida npm.cmd install ishlating agar xatolik bo'lsa)
npm install

# Serverni ishga tushirish (port: 3000)
npm start
```

Server ishga tushgach, brauzeringizda **`http://localhost:3000`** manziliga kiring. Sizda Admin Dashboard ochiladi.

---

## 🌐 Webhookni ulash (Meta API Sozlash)

Meta (Instagram) sizning botingizga yangi kommentlar haqida xabar (Webhook) yuborishi uchun sizning serveringiz internetga ochiq (HTTPS) bo'lishi kerak. Mahalliy kompyuteringizni internetga chiqarish uchun **ngrok** dasturidan foydalanamiz.

### 1-qadam: Ngrok orqali tunnel yaratish
1. [ngrok.com](https://ngrok.com/) saytidan ro'yxatdan o'ting va ngrokni yuklab oling.
2. Quyidagi buyruq orqali portni internetga yo'naltiring:
   ```bash
   ngrok http 3000
   ```
3. Natijada sizga `https://xxxx-xxx-xxx.ngrok-free.app` ko'rinishidagi havola (Forwarding URL) beriladi. Uni nusxalab oling.

### 2-qadam: Meta Developer App yaratish
1. [Meta for Developers](https://developers.facebook.com/) portaliga kiring va yangi ilova (App) yarating.
2. Ilova turi sifatida **"Other"** -> **"Business"** ni tanlang.
3. Ilova boshqaruv panelida **Instagram Graph API** va **Messenger API for Instagram** mahsulotlarini qo'shing (Set up).

### 3-qadam: Facebook Page va Instagramni ulash
1. Sizda **Instagram Professional (Business yoki Creator)** akkaunt bo'lishi shart.
2. Ushbu Instagram akkauntni boshqarayotgan **Facebook Sahifangizga (Page)** bog'lang.
3. Meta Developer panelida bog'langan sahifangiz uchun **Page Access Token** oling. Tokenni olishda quyidagi huquqlar (Permissions) belgilangan bo'lishiga ishonch hosil qiling:
   * `instagram_business_manage_comments`
   * `instagram_business_manage_messages`
   * `pages_manage_metadata`
   * `pages_show_list`
4. Ushbu olingan Tokenni Admin Dashboarddagi **Page Access Token** maydoniga kiriting va "Saqlash" tugmasini bosing.

### 4-qadam: Webhookni sozlash
1. Meta Developer panelida chap menyudan **Webhooks** bo'limiga kiring.
2. Dropdowndan **Instagram** (yoki **Instagram Graph API**) ni tanlang.
3. **Configure a Webhook** tugmasini bosing:
   * **Callback URL**: `https://<sizning-ngrok-havolangiz>/webhook` (Masalan: `https://8a4b-123-45-67.ngrok-free.app/webhook`)
   * **Verify Token**: Dashboardda yozilgan token bilan bir xil bo'lishi kerak. Odatiy qiymat: `instagram_bot_secret_token_2026`.
4. Muolaja muvaffaqiyatli yakunlangach, webhook maydonlaridan **`comments`** maydoniga obuna bo'ling (Subscribe).


---

## 🚀 Render.com serveriga joylashtirish (24/7 ishlatish)

Loyiha kompyuteringiz o'chiq bo'lgan vaqtda ham ishlashi uchun uni [Render.com](https://render.com) bepul bulutli serveriga joylashtiramiz.

### 1-qadam: Kodlarni GitHub-ga yuklash
1. [GitHub.com](https://github.com/) saytida shaxsiy va xavfsiz (**Private**) yangi repozitoriy yarating.
2. Loyihangiz joylashgan katalogda terminal orqali quyidagi buyruqlarni ishga tushirib, kodlarni GitHub-ga yuklang:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin <Sizning_GitHub_Repo_Havolangiz>
   git push -u origin main
   ```

### 2-qadam: Render.com saytida Web Service yaratish
1. [Render.com](https://render.com/) saytida ro'yxatdan o'ting (GitHub orqali kirish tavsiya etiladi).
2. Panelda **New +** -> **Web Service** ni tanlang.
3. GitHub repozitoriyingizni tanlang va bog'lang.
4. Quyidagi sozlamalarni kiriting:
   * **Name**: `instagram-comment-bot` (yoki istalgan nom)
   * **Region**: O'zingizga yaqinroq hududni tanlang (masalan, `Frankfurt`)
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. **Advanced** tugmasini bosing va **Environment Variables** (muhit o'zgaruvchilari) bo'limiga quyidagilarni qo'shing:
   * `PORT`: `3000`
   * `INITIAL_VERIFY_TOKEN`: `instagram_bot_secret_token_2026` (yoki o'zingiz tanlagan webhook tasdiqlash kodi)
6. **Deploy Web Service** tugmasini bosing.

Render loyihangizni yig'adi va sizga `https://instagram-comment-bot-xxxx.onrender.com` ko'rinishidagi ochiq HTTPS manzil taqdim etadi.

### 3-qadam: Meta Developer Webhook manzilini yangilash
Meta Developer portalida Webhook sozlamalariga kirib, **Callback URL** maydoniga ngrok havolasi o'rniga Render bergan havolani kiriting:
`https://your-app-name.onrender.com/webhook`

---

## ⏰ Render Free Tier-ni "uxlab qolishidan" himoya qilish (UptimeRobot)

Render.com bepul tarifida agarda ilovaga 15 daqiqa davomida hech qanday so'rov kelmasa, u vaqtincha "uyqu rejimiga" (sleep mode) o'tadi. Yangi komment kelganda ilova uyg'onishi uchun 50 soniyagacha vaqt ketishi mumkin, bu esa Meta webhookining vaqt tugashi (timeout) xatoligiga sabab bo'ladi.

Buni oldini olish uchun bepul **UptimeRobot** xizmatidan foydalanamiz:
1. [UptimeRobot](https://uptimerobot.com/) saytida bepul hisob yarating.
2. **Add New Monitor** tugmasini bosing:
   * **Monitor Type**: `HTTP(s)`
   * **Friendly Name**: `Instagram Bot`
   * **URL (or IP)**: `https://your-app-name.onrender.com/` (Render bergan havola)
   * **Monitoring Interval**: `Every 5 minutes` (har 5 daqiqada)
3. Monitor yarating. UptimeRobot har 5 daqiqada serveringizga so'rov yuborib turadi va u hech qachon uxlab qolmaydi, har doim faol holatda kommentlarni zudlik bilan qayta ishlaydi!

---

## 🛠️ Tizimni Test Qilish (Local Testing)

Agarda sizda Meta API tokenlari hali tayyor bo'lmasa, serveringiz va dashboard to'g'ri ishlayotganini tekshirish uchun mahalliy testdan foydalanishingiz mumkin.

### 1-usul: Admin Paneldan test qilish
Dashboardning pastki o'ng qismida **"Tizimni Tekshirish"** bo'limi bor.
* Istalgan foydalanuvchi nomini kiriting (Masalan: `ali_insta`).
* Kommentariyani yozing (Masalan: `narxini bilmoqchi edim`).
* **"Testni Ishga Tushirish"** tugmasini bosing.
* Sahifadagi **Activity Log** jadvalida zudlik bilan yangi test yozuvi paydo bo'ladi.

### 2-usul: Buyruqlar satridan test qilish
Yangi terminal oching va server ishlayotgan holatda quyidagi buyruqni bering:
```bash
# Odatiy test
node mock_webhook.js

# Maxsus foydalanuvchi va komment bilan test qilish
node mock_webhook.js jasur_99 "linkni yuboring iltimos"
```

---

## 📁 Xabar turlari va Sozlamalar

Tizimda **Direct (DM)** orqali yuboriladigan xabarlarni juda moslashuvchan shaklda sozlash mumkin:

1. **Faqat Matn (Text only)**: Foydalanuvchiga faqat siz yozgan yozma xabar boradi.
2. **Faqat Rasm (Image only)**: Belgilangan rasm havolasi (Direct URL, masalan: `https://images.unsplash.com/photo-123.jpg`) orqali faqat bitta rasm boradi.
3. **Faqat Video (Video only)**: Belgilangan video havolasi (Direct URL, masalan: `https://myfiles.com/intro.mp4`) orqali faqat bitta video yuboriladi.
4. **Rasm + Matn (Image + Text)**: Avval rasm yuboriladi, uning ketidan esa siz yozgan matnli xabar boradi.
5. **Video + Matn (Video + Text)**: Avval video yuboriladi, uning ketidan matnli xabar yuboriladi.

> 💡 **Muhim eslatma:** Rasm yoki video havolasi Meta serverlari o'qiy olishi uchun internetda ochiq holda bo'lishi va to'g'ridan-to'g'ri faylning o'ziga olib borishi shart (`.jpg`, `.png`, `.mp4` va h.k.).

---

## 💾 Bulutli Ma'lumotlar Bazasi (MongoDB) - Sozlamalarni Abadiy Saqlash

Render.com serverining bepul tarifida fayllar vaqtinchalik bo'lgani sababli, server o'chib yonganda (yoki uyquga ketib uyg'onganda) siz admin panelda saqlagan token va xabarlar o'chib ketishi mumkin. 

Buni oldini olish va sozlamalarni hamda barcha faollik tarixini (logs) **abadiy saqlab qolish** uchun bulutli **MongoDB Atlas** ma'lumotlar bazasini ulab qo'yamiz:

### 1-qadam: Tekin MongoDB bazasini ochish
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) saytidan ro'yxatdan o'ting.
2. Bepul **Shared (M0)** klasterini yarating (Region sifatida o'zingizga yaqinroq, masalan Frankfurtni tanlang).
3. **Database Access** bo'limida yangi foydalanuvchi yarating (Username va Password yozib oling).
4. **Network Access** bo'limida IP manzillar ro'yxatiga `0.0.0.0/0` (barcha joydan ulanish) ni qo'shing.
5. **Database** bo'limiga kirib, **Connect** -> **Drivers** tugmasini bosing va sizga berilgan ulanish havolasini (Connection String) nusxalab oling. U quyidagicha ko'rinishda bo'ladi:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`

### 2-qadam: Render.com-ga bazani ulash
1. Render.com boshqaruv paneliga kiring va loyihangizni oching.
2. **Environment Variables** (muhit o'zgaruvchilari) bo'limiga yangi o'zgaruvchi qo'shing:
   * **Key**: `MONGODB_URI`
   * **Value**: O'zingizning MongoDB ulanish havolangiz (username va password qismlarini o'z parolingiz bilan almashtiring).
3. O'zgarishlarni saqlang (Save Changes).

Render serverni avtomatik ravishda qayta yuklaydi va botingiz MongoDB bazasiga ulanadi. Endi sozlamalaringiz va faollik jurnallari mutlaqo xavfsiz va abadiy saqlanadi!

