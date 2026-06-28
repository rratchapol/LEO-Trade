# Backtest

ระบบ backtest ใช้ CSV เพื่อไม่กิน quota ของ Twelve Data และใช้ logic เดียวกับ `/api/scan`

## 1. เตรียม CSV

ใส่ไฟล์ไว้ที่:

```text
data/EURUSD_5min.csv
data/EURUSD_15min.csv
```

CSV ต้องมี columns:

```text
time,open,high,low,close
```

ตัวอย่าง:

```csv
time,open,high,low,close
2026-06-26 09:00:00,1.14000,1.14100,1.13950,1.14080
```

## 2. วิธีหา CSV

ใช้ได้หลายทาง:

- Export จาก TradingView ถ้ามี data export
- Export จาก MT5 History Center
- ดาวน์โหลดจาก broker/data provider
- ทำไฟล์เองจากแหล่งราคาอื่น โดยให้เรียงเวลาเก่าไปใหม่

ต้องมีทั้ง M5 และ M15 เพราะระบบใช้:

- M15 อ่าน bias
- M5 หา entry

## 3. รัน Backtest

```bash
npm run backtest
```

หรือระบุ path เอง:

```bash
npm run backtest -- data/EURUSD_5min.csv data/EURUSD_15min.csv
```

ถ้าจะรัน BCH จากไฟล์ MT5 ที่วางไว้ใน `data/`:

```bash
npm run backtest:bch
```

ถ้าต้องการ export รายการ trade เป็น CSV:

```bash
npm run backtest:bch:export
npm run backtest:eurusd:export
```

ไฟล์ผลลัพธ์จะอยู่ใน:

```text
data/backtest_BCHUSDm_trades.csv
data/backtest_EURUSD_trades.csv
```

หรือรัน EURUSD ชัด ๆ:

```bash
npm run backtest:eurusd
```

## 4. วิธีอ่านผล

ผลลัพธ์จะมี:

```text
Trades
Wins
Losses
Timeouts
Win rate
Net R
Average R
Max losing streak
By setup
By direction
By session
```

ระบบจำลองแบบง่าย:

- เข้าเมื่อ signal เกิด
- Entry = close ของแท่ง signal
- SL/TP ใช้ค่าจาก signal engine
- TP2 = `RISK_REWARD_TARGET`
- ถ้าแท่งเดียวกันโดนทั้ง SL และ TP จะนับว่าแพ้ก่อน เพื่อ conservative
- ถ้าไม่โดน SL/TP ใน 36 แท่ง จะปิดเป็น timeout ที่ราคา close ล่าสุด

## 5. ข้อจำกัด

Backtest นี้ยังไม่รวม spread, commission, slippage, swap และข่าวแรง จึงใช้เพื่อวัด logic เบื้องต้นเท่านั้น
