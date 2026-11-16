# F.O.C.U.S.© MMM - Options Cone Simulator

Jachbit 2026 · static web page (GitHub Pages) · no login, no keys, nothing sent anywhere except the optional Yahoo price request.

Simulate an option play without thinkorswim: type the numbers into boxes and read the same banners as the
F.O.C.U.S.© MMM thinkScript studies, each with its worked math using the live values.

- **Cash-Secured Put (CSP)** and **Covered Call (CC)** - from `FOCUS_MMM` v1.23 + `FOCUS_MMM_PL` v1.5
- **Buy Call (BC)** and **Buy Put (BP)** - from `FOCUS_MMM_BUY` v1.3 + `FOCUS_MMM_BUY_PL` v1.1

The math is a 1:1 port (same normal-CDF formula as the studies, so the numbers match TOS to the cent).
Source studies: `D:\ClaudeCodeProjects\FOCUS-MMM-TOS\`. The cone idea comes from halcyonguy's `expected_move_cone_02_date`.

## Use it
1. Pick the strategy (big buttons at the top).
2. Ticker + **Get price (Yahoo)**: fills the start price (the close on the start date when the start is in the past) and today's price.
3. Start date, expiry / target date, IV % (the expiry's IV from the option chain: tastytrade IVX or the TOS chain header).
4. Strike, premium, contracts (CC: your stock cost basis; buys: an option expiry only if it is later than the target date).
5. Optional: take profit / stop loss (% of premium or $ total), earnings date, today's date + price, the option's mark / bid / ask / last.
6. **Save play** keeps it in this browser; **Export CSV** writes `FOCUS_MMM_Plays_YYYYMMDD_HHMMSS.csv`; **PDF report** writes
   `FOCUS_MMM_<TICKER>_<CSP|CC|BC|BP>_YYYYMMDD_HHMMSS.pdf` (white, with the cone and every banner's math).

`~` means about. Chances are never negative.

## What the banners show
| Banner | Math |
|---|---|
| EM, EM High / Low | EM = price x IV x sqrt(days / basis); High = price + EM, Low = price - EM |
| Days | calendar DTE / 365 (default, how TOS annualizes IV), trading days / 252, or trading days / 365 (original). Trading days skip NYSE holidays |
| Strike in x EM | strike distance / EM; below 1.00 = inside the expected move |
| Chance ITM | put N(z), call N(-z), z = ln(strike / price) / (IV x sqrt(days / basis)) - lognormal, no drift |
| Touch | 2 x chance ITM (reflection rule), 100% when already ITM |
| Reach date | days = basis x (distance / (price x IV))^2, then the first trading day on or after that many real calendar days (or trading days) |
| Break-even | CSP strike - premium; CC basis - premium; BC strike + premium; BP strike - premium |
| Chance of profit | price beyond break-even at the target date, same lognormal |
| CSP / CC returns | cash secured or stock cost, max profit, return, % / yr (x 365 / DTE), if-called gain |
| BC / BP cost | max loss, max profit, intrinsic + time value, leverage |
| Value at the EM lines | on the target date: intrinsic at expiry, Black-Scholes (no rates, no dividends) when the expiry is later |
| Today + time decay | Black-Scholes today, decay = value today - value with one day less |
| NOW | today's price and the days left: EM left, strike, chance, touch, break-even, chance of profit (shows while today is after the start and before the target) |
| LIVE P/L | price used = mark; else (bid + ask) / 2 when both are above 0; else last. Never a mid when bid or ask is 0. Close-now at the ask (CSP / CC) or the bid (buys); CC TOTAL adds the stock P/L |

## Checked against TOS (examples in the page's "Load an example" list)
| Play | Page = TOS |
|---|---|
| NVDA CSP 150P, 11/10 close 168.89, IV 59.7, 44 DTE to 12/24, premium 6.3233 | EM 35.01, BE 143.68 = 0.72 x EM, below 150 ~28%, touch ~57%, reach 11/23, chance of profit ~78% |
| NVDA CC 200C, 11/10 -> 12/24, premium 3.50, basis 198.75 | called ~21%, profit ~24%; NOW 11/12 at 166.19: ~18%, ~21% |
| GOOG Buy Call 280C, 11/16 close 281.26, IV 36.4, 60 DTE to 1/15/2027, premium 18.50 | EM 41.51, BE 298.50 = 0.42 x EM, profit ~34%, value 1/15 +$2,426.86 / -$1,724.00 / -$1,850.00, BS today 17.15, decay $13.78 / day, TP +50% 27.75, SL 9.25, LIVE P/L at mark 17.45 = -$105.00 |

## Files
- `index.html` - the page (layout, cone chart, saved plays, CSV, PDF)
- `mmm-math.js` - all the math and banner text (runs in the browser and in Node for testing)
- `start.bat` - local preview at http://localhost:8136
- `backup_all.bat` - timestamped copies into `backups\` before each edit session

Research tool, not financial advice. Trading is risky.

© 2026 Jachbit. All rights reserved. May not be copied or shared without express written consent of the publisher. linktr.ee/jachbit
