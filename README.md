# LEO Alert

EURUSD alert scanner สำหรับ deploy บน Vercel โดยใช้ Twelve Data เป็นแหล่งราคา และ LINE Messaging API สำหรับส่งแจ้งเตือน

## Flow

```text
External Cron
  -> /api/scan?secret=...
  -> fetch EUR/USD candles from Twelve Data
  -> detect setup
  -> push LINE message
```

## Endpoints

```text
GET /api/health
GET /api/test-line?secret=YOUR_SCAN_SECRET
GET /api/scan?secret=YOUR_SCAN_SECRET
```

## Environment Variables

สร้าง `.env.local` ตอน dev หรือใส่ใน Vercel Project Settings:

```text
LINE_CHANNEL_ACCESS_TOKEN=
LINE_TARGET_ID=
TWELVE_DATA_API_KEY=
SCAN_SECRET=change-me
SYMBOL=EUR/USD
ENTRY_TIMEFRAME=5min
BIAS_TIMEFRAME=15min
RISK_REWARD_TARGET=2
SL_BUFFER_PIPS=1
```

ห้าม commit token จริงขึ้น GitHub

## Signal Logic MVP

ระบบเวอร์ชันแรกสแกน EURUSD ด้วย:

- M15 market bias แบบง่ายจาก high/low ล่าสุด
- M5 Liquidity Sweep + PA Rejection
- M5 FVG Pullback + PA Rejection
- Entry ใช้ close ของแท่งที่ปิดแล้ว
- SL วางนอก wick หรือโซน FVG พร้อม buffer
- TP1 = 1R, TP2 = ค่า `RISK_REWARD_TARGET`

## Manual Trading Checklist

อ่าน checklist สำหรับใช้ตัดสินใจเข้าเทรดเองได้ที่:

```text
TRADING_CHECKLIST.md
```

## Local Development

```bash
npm install
npm run dev
```

เปิด:

```text
http://localhost:3000/api/health
```

ทดสอบ LINE:

```text
http://localhost:3000/api/test-line?secret=YOUR_SCAN_SECRET
```

## Cron

ใช้ cron-job.org, UptimeRobot หรือบริการ cron อื่นเรียกทุก 5 นาที:

```text
https://your-vercel-app.vercel.app/api/scan?secret=YOUR_SCAN_SECRET
```

## Notes

Vercel serverless ไม่เหมาะกับการเปิด process เฝ้ากราฟค้างไว้ จึงให้ cron ภายนอกเรียก endpoint เป็นรอบ ๆ

ระบบนี้เป็นตัวช่วยแจ้งเตือนเพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน และควรตรวจกราฟ/คุม risk ก่อนเข้าออเดอร์ทุกครั้ง
