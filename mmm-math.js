/* F.O.C.U.S.(c) MMM Web - math engine | Jachbit 2026
   1:1 port of the thinkScript studies in FOCUS-MMM-TOS:
     FOCUS_MMM v1.23 (CSP / CC), FOCUS_MMM_PL v1.5, FOCUS_MMM_BUY v1.3 + FOCUS_MMM_BUY_PL v1.1 (Buy Call / Buy Put).
   Normal CDF = Abramowitz & Stegun 26.2.17 (the studies' own formula, so the numbers match TOS to the cent).
   Every banner carries its worked math with the live values (show-the-math standard). */
(function (root) {
  'use strict';

  // ---------- numbers ----------
  function roundHalf(x, n) {           // TOS Round(): half away from zero
    if (!Number.isFinite(x)) return NaN;
    const s = x < 0 ? -1 : 1;
    return s * Number(Math.round(Number(Math.abs(x) + 'e' + n)) + 'e-' + n);
  }
  function R(x, n) { return Number.isFinite(x) ? roundHalf(x, n).toFixed(n) : 'n/a'; }
  // 3 decimals, trailing zeros trimmed to 2 (TOS Round(x, 3): 27.75, 3.162)
  function R3(x) { return Number.isFinite(x) ? roundHalf(x, 3).toFixed(3).replace(/(\.\d\d)0$/, '$1') : 'n/a'; }
  // price: 2 decimals, up to 4 when typed that way (6.3233)
  function P(x) {
    if (!Number.isFinite(x)) return 'n/a';
    return roundHalf(x, 4).toFixed(4).replace(/(\.\d\d\d*?)0+$/, '$1');
  }
  function D(x) {                      // AsDollars of a positive amount
    if (!Number.isFinite(x)) return 'n/a';
    return '$' + roundHalf(Math.abs(x), 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function SD(x) { return (x >= 0 ? '+' : '-') + D(x); }   // signed dollars
  function pct0(p) { return R(p * 100, 0) + '%'; }
  function pct1(p) { return R(p * 100, 1) + '%'; }

  function N(z) {
    const az = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * az);
    const pdf = Math.exp(-az * az / 2) / Math.sqrt(2 * Math.PI);
    const up = pdf * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - up : up;
  }
  // FBs: Black-Scholes, no interest / dividends; days = calendar days to expiry (<= 0 = intrinsic)
  function bs(s, k, vol, days, isCall) {
    const intr = isCall ? Math.max(0, s - k) : Math.max(0, k - s);
    if (!(days > 0)) return { v: intr, intr: intr, d1: NaN, d2: NaN, yrs: 0 };
    const yrs = Math.max(days, 0.0001) / 365;
    const sq = vol * Math.sqrt(yrs);
    const d1 = (Math.log(s / k) + 0.5 * vol * vol * yrs) / sq;
    const d2 = d1 - sq;
    const v = isCall ? s * N(d1) - k * N(d2) : k * (1 - N(d2)) - s * (1 - N(d1));
    return { v: v, intr: intr, d1: d1, d2: d2, yrs: yrs };
  }

  // ---------- dates (day numbers = days since 1970-01-01, UTC) ----------
  const MS = 86400000;
  function dn(y, m, d) { return Math.round(Date.UTC(y, m, d) / MS); }
  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
    const [y, m, d] = s.split('-').map(Number);
    return dn(y, m - 1, d);
  }
  function toYMD(n) { const d = new Date(n * MS); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  function iso(n) { const o = toYMD(n); return o.y + '-' + String(o.m).padStart(2, '0') + '-' + String(o.d).padStart(2, '0'); }
  function md(n) { const o = toYMD(n); return o.m + '/' + o.d; }
  function mdy(n) { const o = toYMD(n); return o.m + '/' + o.d + '/' + o.y; }
  function dow(n) { return ((n % 7) + 11) % 7; }   // 0 = Sunday (1970-01-01 was a Thursday)
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function nthWeekday(y, m, wd, nth) {
    const first = dn(y, m, 1);
    return first + ((wd - dow(first) + 7) % 7) + (nth - 1) * 7;
  }
  function lastWeekday(y, m, wd) {
    const last = dn(y, m + 1, 0);
    return last - ((dow(last) - wd + 7) % 7);
  }
  function easter(y) {                 // anonymous Gregorian algorithm
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return dn(y, month - 1, day);
  }
  function observed(n) {               // Saturday -> Friday, Sunday -> Monday
    const w = dow(n);
    return w === 6 ? n - 1 : w === 0 ? n + 1 : n;
  }
  const holCache = {};
  // NYSE full-day holidays
  function holidays(y) {
    if (holCache[y]) return holCache[y];
    const h = {};
    const add = (n, name) => { h[n] = name; };
    const ny = dn(y, 0, 1);
    if (dow(ny) !== 6) add(observed(ny), "New Year's Day");   // NYSE skips a Saturday New Year
    add(nthWeekday(y, 0, 1, 3), 'Martin Luther King Jr. Day');
    add(nthWeekday(y, 1, 1, 3), "Presidents' Day");
    add(easter(y) - 2, 'Good Friday');
    add(lastWeekday(y, 4, 1), 'Memorial Day');
    if (y >= 2022) add(observed(dn(y, 5, 19)), 'Juneteenth');
    add(observed(dn(y, 6, 4)), 'Independence Day');
    add(nthWeekday(y, 8, 1, 1), 'Labor Day');
    add(nthWeekday(y, 10, 4, 4), 'Thanksgiving');
    add(observed(dn(y, 11, 25)), 'Christmas');
    holCache[y] = h;
    return h;
  }
  function holidayName(n) { return holidays(toYMD(n).y)[n] || ''; }
  function isTrading(n) { const w = dow(n); return w !== 0 && w !== 6 && !holidayName(n); }
  // trading days after a, up to and including b  (= TOS CountTradingDays(a, b) - 1)
  function tradingDays(a, b) {
    let c = 0;
    for (let d = a + 1; d <= b; d++) if (isTrading(d)) c++;
    return c;
  }
  function holidaysBetween(a, b) {     // weekday holidays after a, through b
    const out = [];
    for (let d = a + 1; d <= b; d++) { const w = dow(d); if (w !== 0 && w !== 6 && holidayName(d)) out.push(d); }
    return out;
  }
  function weekdaysBetween(a, b) {
    let c = 0;
    for (let d = a + 1; d <= b; d++) { const w = dow(d); if (w !== 0 && w !== 6) c++; }
    return c;
  }
  function todayET() {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return parseDate(p);
  }

  const STRATS = {
    csp: { name: 'CSP', long: 'Cash-Secured Put', isPut: true, buy: false },
    cc: { name: 'CC', long: 'Covered Call', isPut: false, buy: false },
    bc: { name: 'BC', long: 'Buy Call', isPut: false, buy: true },
    bp: { name: 'BP', long: 'Buy Put', isPut: true, buy: true }
  };
  const BASES = {
    cal365: { label: 'calendar DTE / 365', basis: 365, cal: true },
    td252: { label: 'trading days / 252', basis: 252, cal: false },
    td365: { label: 'trading days / 365 (original)', basis: 365, cal: false }
  };

  function num(v) { const x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return Number.isFinite(x) ? x : NaN; }

  // ======================================================================
  function compute(raw) {
    const st = STRATS[raw.strat] || STRATS.csp;
    const B = BASES[raw.basis] || BASES.cal365;
    const isPut = st.isPut, isCall = !isPut, buy = st.buy;
    const basis = B.basis, isCal = B.cal;
    const f = Number.isFinite(num(raw.emFactor)) && num(raw.emFactor) > 0 ? num(raw.emFactor) : 1;
    const fTxt = f !== 1 ? f + ' x ' : '';
    const S = num(raw.price);
    const ivPct = num(raw.iv);
    const siv = ivPct / 100;
    const s = parseDate(raw.start), t = parseDate(raw.target);
    const K = num(raw.strike);
    const prem = num(raw.premium);
    const cRaw = num(raw.contracts);
    const C = Number.isFinite(cRaw) && cRaw > 0 ? cRaw : 1;
    const out = { strat: raw.strat, st: st, B: B, banners: [], ok: false };
    const banners = out.banners;
    const add = (sec, cls, head, math) => banners.push({ sec: sec, cls: cls, head: head, math: math || [] });

    const ivTxt = R(ivPct, 2) + '%';
    add('Play', 'orange', 'F.O.C.U.S.© MMM Web  ' + st.long.toUpperCase() + ' (' + st.name + ')  ' + B.label,
      ['days in the math = ' + (isCal ? 'calendar days to the target (weekends included) / 365, how TOS annualizes IV and theta' : (basis === 252 ? 'trading days (NYSE holidays skipped) / 252' : 'trading days / 365 - the original study, about 17% narrower'))]);

    const valid = S > 0 && siv > 0 && Number.isFinite(s) && Number.isFinite(t) && t > s;
    if (!valid) {
      const miss = [];
      if (!(S > 0)) miss.push('stock price');
      if (!(siv > 0)) miss.push('IV %');
      if (!Number.isFinite(s)) miss.push('start date');
      if (!Number.isFinite(t)) miss.push('target date');
      else if (Number.isFinite(s) && !(t > s)) miss.push('a target date AFTER the start date');
      add('Play', 'red', 'Needed: ' + miss.join(', '), []);
      return out;
    }
    out.ok = true;

    const calDays = t - s;
    const tdays = tradingDays(s, t);
    const dcount = isCal ? calDays : tdays;
    const emT = f * S * siv * Math.sqrt(dcount / basis);
    const emPer = roundHalf(emT / S * 100, 1);
    const hiT = S + emT, loT = S - emT;
    const sqTxt = 'sqrt(' + dcount + ' / ' + basis + ')';
    const sigT = siv * Math.sqrt(dcount / basis);
    Object.assign(out, { S, siv, s, t, K, prem, C, calDays, tdays, dcount, basis, isCal, f, emT, hiT, loT, sigT });

    add('Expected move', 'yellow', 'start date: ' + DOW[dow(s)] + ' ' + mdy(s) + '  price ' + P(S), []);
    add('Expected move', 'yellow', 'target date: ' + DOW[dow(t)] + ' ' + mdy(t) + '  ' + calDays + ' DTE',
      [calDays + ' DTE = calendar days from ' + md(s) + ' to ' + md(t)]);
    const hols = holidaysBetween(s, t);
    add('Expected move', 'yellow', 'trading days to target date  ' + tdays,
      ['= ' + weekdaysBetween(s, t) + ' weekdays after ' + md(s) + ' through ' + md(t) + ' - ' + hols.length + ' NYSE holiday' + (hols.length === 1 ? '' : 's') +
        (hols.length ? ' (' + hols.map(h => md(h) + ' ' + holidayName(h)).join(', ') + ')' : '')]);
    add('Expected move', 'orange', 'EM ±$' + P(roundHalf(emT, 2)) + ' (' + emPer.toFixed(1) + '%)  ->  ' + P(roundHalf(hiT, 2)) + ' / ' + P(roundHalf(loT, 2)),
      ['EM = ' + fTxt + P(S) + ' x ' + ivTxt + ' x ' + sqTxt + ' = ' + P(S * f) + ' x ' + R(siv * 100, 2) + '% x ' + R(Math.sqrt(dcount / basis), 4) + ' = $' + P(roundHalf(emT, 2)),
        'EM High = ' + P(S) + ' + ' + P(roundHalf(emT, 2)) + ' = ' + P(roundHalf(hiT, 2)) + ';  EM Low = ' + P(S) + ' - ' + P(roundHalf(emT, 2)) + ' = ' + P(roundHalf(loT, 2)),
        emPer.toFixed(1) + '% = ' + P(roundHalf(emT, 2)) + ' / ' + P(S)]);

    // ---------- strike ----------
    const hasStrike = K > 0;
    let pItm = NaN, zz = NaN, kDist = NaN;
    if (hasStrike) {
      kDist = isPut ? S - K : K - S;
      const kMult = kDist / emT, kOut = kMult > 1;
      const kz = Math.log(K / S) / sigT;
      zz = isPut ? kz : -kz;
      pItm = N(zz);
      const pTouch = kDist <= 0 ? 1 : Math.min(1, 2 * pItm);
      Object.assign(out, { kDist, kMult, pItm, pTouch, zz });
      const kCls = buy ? (kOut ? 'red' : 'green') : (kOut ? 'green' : 'amber');
      add('Strike', kCls, P(K) + (isPut ? ' put: ' + P(S) + ' - ' + P(K) : ' call: ' + P(K) + ' - ' + P(S)) + ' = ' + P(roundHalf(kDist, 2)) +
        (kDist >= 0 ? ' OTM' : ' ITM') + ' (' + R(Math.abs(kDist) / S * 100, 1) + '%)',
        ['= ' + P(roundHalf(kDist, 2)) + ' / ' + P(roundHalf(emT, 2)) + ' = ' + R(kMult, 2) + ' x EM -> ' + (kOut ? 'outside' : 'inside') + ' the EM (EM ' +
          (isPut ? 'Low ' + P(roundHalf(loT, 2)) : 'High ' + P(roundHalf(hiT, 2))) + ')']);
      const itmWord = (isPut ? 'below ' : 'above ') + P(K);
      const itmLabel = buy ? ' (ITM)' : (st.name === 'CC' ? ' (called away)' : ' (assigned)');
      add('Strike', 'white', 'chance ' + itmWord + ' on ' + md(t) + itmLabel + ' ~' + pct0(pItm),
        ['= N(' + (isPut ? '' : '-') + 'ln(' + P(K) + ' / ' + P(S) + ') / (' + ivTxt + ' x ' + sqTxt + ')) = N(' + R(isPut ? Math.log(K / S) : -Math.log(K / S), 4) + ' / ' + R(sigT, 4) + ') = N(' + R(zz, 2) + ') = ' + pct1(pItm) + '  lognormal, no drift']);
      add('Strike', 'amber', kDist <= 0 ? 'touch ' + P(K) + ': already ITM' : 'touch ' + P(K) + ' before ' + md(t) + ' ~' + pct0(pTouch),
        kDist <= 0 ? [] : ['= 2 x ' + pct1(pItm) + ' (reflection rule, no drift' + (2 * pItm > 1 ? ', capped at 100%' : '') + ')']);

      // reach: the day the 1 x EM cone edge reaches the strike
      if (kDist > 0) {
        const reachDays = basis * Math.pow(kDist / (f * S * siv), 2);
        let rd = NaN;
        let tdc = 0;
        for (let d = s; d <= s + 3660; d++) {
          if (d > s && isTrading(d)) tdc++;
          if (!isTrading(d) && d !== s) continue;
          const bd = isCal ? d - s : tdc;
          if (bd >= reachDays) { rd = d; break; }
        }
        const rz = Math.log(K / S) / (siv * Math.sqrt(reachDays / basis));
        const rzz = isPut ? rz : -rz;
        const rItm = N(rzz), rTouch = Math.min(1, 2 * rItm);
        Object.assign(out, { reachDays, reachDate: rd, rTouch });
        if (Number.isFinite(rd)) {
          const reachCal = rd - s;
          const after = rd > t;
          const skipped = [];
          for (let d = s + Math.ceil(isCal ? reachDays : 0); isCal && d < rd; d++) if (!isTrading(d)) skipped.push(d);
          add('Strike', 'magenta', '1 x EM cone reaches ' + P(K) + ' ~' + DOW[dow(rd)] + ' ' + md(rd) + ' (' + reachCal + ' DTE' + (after ? ', after the target date' : '') + ')',
            ['= ' + basis + ' x (' + P(roundHalf(kDist, 2)) + ' / (' + fTxt + P(S) + ' x ' + ivTxt + '))^2 = ' + basis + ' x ' + R(kDist / (f * S * siv), 4) + '^2 = ' + R(reachDays, reachDays < 1 ? 2 : 1) + (isCal ? ' calendar days' : ' trading days'),
              isCal ? md(s) + ' + ' + R(reachDays, reachDays < 1 ? 2 : 1) + ' days -> first trading day at day ' + Math.ceil(reachDays) + ' or later = ' + DOW[dow(rd)] + ' ' + md(rd) +
                (skipped.length ? ' (' + skipped.map(d => DOW[dow(d)] + ' ' + md(d) + (holidayName(d) ? ' ' + holidayName(d) : '')).join(', ') + ' not a trading day)' : '')
                : 'trading day ' + Math.ceil(reachDays) + ' after ' + md(s) + ' = ' + DOW[dow(rd)] + ' ' + md(rd)]);
          add('Strike', 'magenta', 'touch by ' + md(rd) + ' ~' + pct0(rTouch),
            ['= 2 x N(' + R(rzz, 2) + ') = 2 x ' + pct1(rItm) + '  (N(' + (isPut ? '' : '-') + 'ln(' + P(K) + ' / ' + P(S) + ') / (' + ivTxt + ' x sqrt(' + R(reachDays, reachDays < 1 ? 2 : 1) + ' / ' + basis + '))))']);
        }
      }
    }

    // ---------- premium ----------
    const hasPrem = hasStrike && prem > 0;
    const basisIn = num(raw.ccBasis);
    const basisC = basisIn > 0 ? basisIn : S;
    let be = NaN, tpFrac = NaN, hasTp = false, tpBuyBack = NaN, tpPx = NaN, slPx = NaN, hasSl = false;
    const tpByUsd = raw.tpMode === 'usd', slByUsd = raw.slMode === 'usd';
    const tpPct = num(raw.tpPct), tpUsdIn = num(raw.tpUsd), slPct = num(raw.slPct), slUsdIn = num(raw.slUsd);
    const capitalUsd = (isPut ? K : basisC) * 100 * C;

    if (hasPrem && !buy) {
      be = isPut ? K - prem : basisC - prem;
      const beDist = S - be, beMult = beDist / emT, beOut = beMult > 1;
      const capital = isPut ? K : basisC;
      const roc = prem / capital, rocNet = prem / (K - prem);
      const calledGain = K - basisC + prem;
      const maxProfit = (isPut ? prem : calledGain) * 100 * C;
      const yearF = 365 / calDays;
      const bz = Math.log(be / S) / sigT;
      const pProfit = 1 - N(bz);
      Object.assign(out, { be, beMult, pProfit, maxProfit, capitalUsd, basisC });
      add('Premium', 'cyan', (isPut ? 'CSP ' : 'CC ') + P(K) + ' x ' + C + ' @ ' + P(prem) + ':  break-even ' +
        (isPut ? P(K) + ' - ' + P(prem) : 'basis ' + P(basisC) + ' - ' + P(prem)) + ' = ' + P(roundHalf(be, 2)),
        [beDist < 0 ? 'price ' + P(S) + ' is already BELOW break-even by ' + P(roundHalf(-beDist, 2)) + ' = ' + P(roundHalf(-beDist, 2)) + ' / ' + P(roundHalf(emT, 2)) + ' = ' + R(-beMult, 2) + ' x EM'
          : P(S) + ' - ' + P(roundHalf(be, 2)) + ' = ' + P(roundHalf(beDist, 2)) + ' = ' + P(roundHalf(beDist, 2)) + ' / ' + P(roundHalf(emT, 2)) + ' = ' + R(beMult, 2) + ' x EM -> ' + (beOut ? 'outside' : 'inside') + ' the EM']);
      if (isPut) {
        add('Premium', 'cyan', 'max profit ' + D(maxProfit) + '  |  return ' + R(roc * 100, 2) + '% in ' + calDays + ' days = ' + R(roc * yearF * 100, 1) + '% / yr',
          ['cash secured ' + P(K) + ' x 100 x ' + C + ' = ' + D(capitalUsd),
            'max profit ' + P(prem) + ' x 100 x ' + C + ' = ' + D(maxProfit),
            'return ' + D(maxProfit) + ' / ' + D(capitalUsd) + ' = ' + R(roc * 100, 2) + '%;  x 365 / ' + calDays + ' = ' + R(roc * yearF * 100, 1) + '% / yr',
            'net cash ' + P(prem) + ' / ' + P(roundHalf(K - prem, 2)) + ' = ' + R(rocNet * 100, 2) + '%']);
      } else {
        add('Premium', 'cyan', 'income ' + D(prem * 100 * C) + ' = ' + R(roc * 100, 2) + '% in ' + calDays + ' days = ' + R(roc * yearF * 100, 1) + '% / yr  |  if called ' + SD(maxProfit),
          ['stock cost ' + P(basisC) + ' x 100 x ' + C + ' = ' + D(capitalUsd) + (basisIn > 0 ? '' : '  (cost basis blank = the start price)'),
            'income ' + P(prem) + ' x 100 x ' + C + ' = ' + D(prem * 100 * C) + ';  ' + D(prem * 100 * C) + ' / ' + D(capitalUsd) + ' = ' + R(roc * 100, 2) + '%;  x 365 / ' + calDays + ' = ' + R(roc * yearF * 100, 1) + '% / yr',
            'if called (' + P(K) + ' - ' + P(basisC) + ' + ' + P(prem) + ') x 100 x ' + C + ' = ' + SD(maxProfit) + ' = ' + R(calledGain / basisC * 100, 2) + '% of the stock cost']);
      }
      add('Premium', 'white', 'chance of profit ~' + pct0(pProfit) + '  |  ' + (isPut ? 'keep full premium (expire OTM) ~' : 'not called away ~') + pct0(1 - pItm),
        ['= 1 - N(ln(' + P(roundHalf(be, 2)) + ' / ' + P(S) + ') / (' + ivTxt + ' x ' + sqTxt + ')) = 1 - N(' + R(bz, 2) + ') = 1 - ' + pct1(N(bz)) + '  (price above break-even at expiry)',
          (isPut ? 'expire OTM' : 'not called') + ' = 1 - ' + pct1(pItm)]);
      // take profit (buy back)
      const tpPerShare = tpUsdIn / (100 * C);
      tpFrac = tpByUsd ? tpPerShare / prem : tpPct / 100;
      hasTp = Number.isFinite(tpFrac) && tpFrac > 0 && tpFrac < 1;
      if (hasTp) {
        tpBuyBack = prem * (1 - tpFrac);
        const tpProfitUsd = prem * tpFrac * 100 * C;
        add('Exit', 'cyan', 'take profit ' + (tpByUsd ? '' : R(tpPct, 0) + '% = ') + D(tpProfitUsd) + '  ->  buy back at ' + R3(tpBuyBack),
          ['= collected ' + D(prem * 100 * C) + ' - buy back ' + D(tpBuyBack * 100 * C),
            tpByUsd ? 'buy back ' + P(prem) + ' - ' + R3(tpPerShare) + ' / share (' + D(tpUsdIn) + ' / (100 x ' + C + ')) = ' + R3(tpBuyBack) + ' = ' + R(tpFrac * 100, 1) + '% of the premium'
              : 'buy back ' + P(prem) + ' x (1 - ' + R(tpPct, 0) + '%) = ' + R3(tpBuyBack),
            D(tpProfitUsd) + ' / ' + D(capitalUsd) + ' = ' + R(tpProfitUsd / capitalUsd * 100, 2) + '% of ' + D(capitalUsd)]);
      } else if (tpByUsd && tpUsdIn > 0) {
        add('Exit', 'red', 'take profit ' + D(tpUsdIn) + ' is more than the max profit ' + D(prem * 100 * C), []);
      }
      Object.assign(out, { tpBuyBack, hasTp });
    }

    if (hasPrem && buy) {
      const costUsd = prem * 100 * C;
      be = isCall ? K + prem : K - prem;
      const beDist = isCall ? be - S : S - be;
      const beMult = beDist / emT, beOut = beMult > 1;
      const maxPutUsd = (K - prem) * 100 * C;
      const intrS = isCall ? Math.max(0, S - K) : Math.max(0, K - S);
      const timeS = prem - intrS;
      const stockUsd = S * 100 * C;
      const bz = Math.log(be / S) / sigT;
      const pProfit = isCall ? N(-bz) : N(bz);
      Object.assign(out, { be, beMult, pProfit, costUsd });
      add('Premium', 'cyan', (isCall ? 'BC ' : 'BP ') + P(K) + ' x ' + C + ' @ ' + P(prem) + ' paid:  break-even ' + P(K) + (isCall ? ' + ' : ' - ') + P(prem) + ' = ' + P(roundHalf(be, 2)),
        [beDist <= 0 ? 'price ' + P(S) + ' is already past break-even by ' + P(roundHalf(-beDist, 2))
          : 'needs a ' + (isCall ? 'rise' : 'drop') + ' of ' + (isCall ? P(roundHalf(be, 2)) + ' - ' + P(S) : P(S) + ' - ' + P(roundHalf(be, 2))) + ' = ' + P(roundHalf(beDist, 2)) + ' = ' + P(roundHalf(beDist, 2)) + ' / ' + P(roundHalf(emT, 2)) + ' = ' + R(beMult, 2) + ' x EM -> ' + (beOut ? 'outside' : 'inside') + ' the EM']);
      add('Premium', 'cyan', 'cost = max loss ' + D(costUsd) + '  |  max profit ' + (isCall ? 'unlimited' : D(maxPutUsd) + ' (stock at 0)'),
        ['cost ' + P(prem) + ' x 100 x ' + C + ' = ' + D(costUsd),
          isCall ? 'a call has no upper limit' : 'max profit (' + P(K) + ' - ' + P(prem) + ') x 100 x ' + C + ' = ' + D(maxPutUsd),
          'intrinsic ' + (isCall ? P(S) + ' - ' + P(K) : P(K) + ' - ' + P(S)) + ' -> ' + P(roundHalf(intrS, 2)) + ',  time value ' + P(prem) + ' - ' + P(roundHalf(intrS, 2)) + ' = ' + P(roundHalf(timeS, 2)) + ' (' + R(timeS / prem * 100, 0) + '% of the premium, decays by expiry)',
          'controls 100 x ' + C + ' x ' + P(S) + ' = ' + D(stockUsd) + ' of stock for ' + D(costUsd) + ' = ' + R(stockUsd / costUsd, 1) + 'x leverage']);
      add('Premium', 'white', 'chance of profit on ' + md(t) + ' ~' + pct0(pProfit) + '  |  expires worthless (OTM) ~' + pct0(1 - pItm),
        ['= ' + (isCall ? 'N(-ln(' : 'N(ln(') + P(roundHalf(be, 2)) + ' / ' + P(S) + ') / (' + ivTxt + ' x ' + sqTxt + ')) = N(' + R(isCall ? -bz : bz, 2) + ') = ' + pct1(pProfit),
          'worthless = 1 - ' + pct1(pItm)]);

      // value on the target date at the EM lines (Black-Scholes, start IV)
      const ex = parseDate(raw.expiry);
      const hasExp = Number.isFinite(ex) && ex > t;
      const remT = hasExp ? ex - t : 0;
      const vals = [['EM High', hiT], ['no move', S], ['EM Low', loT]];
      add('Value', 'white', 'value on ' + md(t) + (remT > 0 ? ' (' + remT + ' days before the ' + md(ex) + ' expiry, Black-Scholes at IV ' + ivTxt + ', no rates):' : ' (expiry: intrinsic value):'), []);
      const vOut = {};
      vals.forEach(([nm, px]) => {
        const r = bs(px, K, siv, remT, isCall);
        const g = (r.v - prem) * 100 * C;
        vOut[nm] = { v: r.v, g: g };
        const valMath = remT > 0
          ? 'value = Black-Scholes(' + P(roundHalf(px, 2)) + ', ' + P(K) + ', IV ' + ivTxt + ', ' + remT + ' days): d1 = ' + R3(r.d1) + ', d2 = ' + R3(r.d2) + ' -> ' + R(r.v, 2)
          : 'value = ' + (isCall ? 'max(0, ' + P(roundHalf(px, 2)) + ' - ' + P(K) + ')' : 'max(0, ' + P(K) + ' - ' + P(roundHalf(px, 2)) + ')') + ' = ' + R(r.v, 2);
        add('Value', g >= 0 ? 'up' : 'down', nm + ' ' + P(roundHalf(px, 2)) + ' -> ' + R(r.v, 2) + ' = ' + SD(g) + ' (' + R((r.v - prem) / prem * 100, 0) + '%)',
          [valMath, '(' + R(r.v, 2) + ' - ' + P(prem) + ') x 100 x ' + C + ' = ' + SD(g)]);
      });
      out.values = vOut;

      // take profit / stop loss
      tpPx = tpByUsd ? prem + tpUsdIn / (100 * C) : prem * (1 + tpPct / 100);
      hasTp = Number.isFinite(tpPx) && tpPx > prem;
      if (hasTp) {
        const tpUsd = (tpPx - prem) * 100 * C;
        const tpStockExp = isCall ? K + tpPx : K - tpPx;
        add('Exit', 'cyan', 'take profit ' + (tpByUsd ? D(tpUsdIn) : '+' + R(tpPct, 0) + '% = ' + D(tpUsd)) + ':  sell at ' + R3(tpPx),
          [tpByUsd ? 'sell at ' + P(prem) + ' + ' + D(tpUsdIn) + ' / (100 x ' + C + ') = ' + P(prem) + ' + ' + R3(tpUsdIn / (100 * C)) + ' = ' + R3(tpPx)
            : 'sell at ' + P(prem) + ' x (1 + ' + R(tpPct, 0) + '%) = ' + R3(tpPx) + ';  (' + R3(tpPx) + ' - ' + P(prem) + ') x 100 x ' + C + ' = ' + D(tpUsd),
            'at expiry the stock ' + (isCall ? '>= ' + P(K) + ' + ' : '<= ' + P(K) + ' - ') + R(tpPx, 2) + ' = ' + P(roundHalf(tpStockExp, 2))]);
        out.tpStockExp = tpStockExp;
      }
      slPx = slByUsd ? prem - slUsdIn / (100 * C) : prem * (1 - slPct / 100);
      hasSl = Number.isFinite(slPx) && slPx > 0 && slPx < prem;
      if (hasSl) {
        const slUsd = (prem - slPx) * 100 * C;
        add('Exit', 'cyan', 'stop loss ' + (slByUsd ? D(slUsdIn) : '-' + R(slPct, 0) + '% = -' + D(slUsd)) + ':  sell at ' + R3(slPx),
          [slByUsd ? 'sell at ' + P(prem) + ' - ' + D(slUsdIn) + ' / (100 x ' + C + ') = ' + P(prem) + ' - ' + R3(slUsdIn / (100 * C)) + ' = ' + R3(slPx)
            : 'sell at ' + P(prem) + ' x (1 - ' + R(slPct, 0) + '%) = ' + R3(slPx) + ';  (' + P(prem) + ' - ' + R3(slPx) + ') x 100 x ' + C + ' = -' + D(slUsd)]);
      } else if (slByUsd && slUsdIn > 0) {
        add('Exit', 'red', 'stop loss ' + D(slUsdIn) + ' is the whole cost ' + D(costUsd) + ' or more', []);
      }
      Object.assign(out, { tpPx, slPx, hasTp, hasSl });
    }

    // ---------- today / NOW ----------
    const tdIn = parseDate(raw.todayDate);
    const today = Number.isFinite(tdIn) ? tdIn : todayET();
    const pNowIn = num(raw.todayPrice);
    const ivNowIn = num(raw.ivNow);
    const ivNow = ivNowIn > 0 ? ivNowIn / 100 : siv;
    const ivNowTxt = R(ivNow * 100, 2) + '%';
    out.today = today;

    // Buy: value today + daily time decay (shows from the start day on; the start price when no today's price is typed)
    if (hasPrem && buy) {
      const ex = parseDate(raw.expiry);
      const hasExp = Number.isFinite(ex) && ex > t;
      const ref = today < s ? s : today;
      const pRef = today >= s && pNowIn > 0 ? pNowIn : S;
      const dExpNow = Math.max(0, (hasExp ? ex : t) - ref);
      if (dExpNow > 0) {
        const r0 = bs(pRef, K, ivNow, dExpNow, isCall);
        const r1 = bs(pRef, K, ivNow, dExpNow - 1, isCall);
        const theta = r0.v - r1.v;
        Object.assign(out, { vToday: r0.v, thetaDay: theta });
        add('Today', 'white', (ref === today ? 'today ' : 'start ') + md(ref) + ': value ' + R(r0.v, 2) + ' = Black-Scholes(' + P(pRef) + ', ' + P(K) + ', IV ' + ivNowTxt + ', ' + dExpNow + ' days)',
          ['d1 = (ln(' + P(pRef) + ' / ' + P(K) + ') + 0.5 x ' + R(ivNow, 4) + '^2 x ' + dExpNow + ' / 365) / (' + R(ivNow, 4) + ' x sqrt(' + dExpNow + ' / 365)) = ' + R(r0.d1, 4) + ',  d2 = d1 - ' + R(ivNow * Math.sqrt(r0.yrs), 4) + ' = ' + R(r0.d2, 4),
            (isCall ? P(pRef) + ' x N(d1) ' + R(N(r0.d1), 4) + ' - ' + P(K) + ' x N(d2) ' + R(N(r0.d2), 4) : P(K) + ' x (1 - N(d2)) ' + R(1 - N(r0.d2), 4) + ' - ' + P(pRef) + ' x (1 - N(d1)) ' + R(1 - N(r0.d1), 4)) + ' = ' + R(r0.v, 2),
            '= intrinsic ' + R(r0.intr, 2) + ' + time ' + R(r0.v - r0.intr, 2) + ' (paid ' + P(prem) + ')']);
        add('Today', 'white', 'time decay ~' + R3(theta) + ' / day = ' + D(theta * 100 * C) + ' / day',
          [dExpNow + ' days ' + R3(r0.v) + ' - ' + (dExpNow - 1) + ' days ' + R3(r1.v) + ' = ' + R3(theta) + ';  x 100 x ' + C + ' = ' + D(theta * 100 * C)]);
      }
    }

    // earnings + IV
    const e = parseDate(raw.earnings);
    if (Number.isFinite(e)) {
      const when = raw.earnTime === 'amc' ? ' after close' : raw.earnTime === 'bmo' ? ' before open' : '';
      const eInCone = e > s && e <= t;
      if (e >= today) {
        add('Earnings & IV', 'earn', 'EARNINGS ' + DOW[dow(e)] + ' ' + md(e) + when + '  in ' + tradingDays(today, e) + ' trading days (' + (e - today) + ' days)',
          ['counted from today ' + md(today) + (eInCone ? (buy ? ';  BEFORE the ' + md(t) + ' target: IV usually drops after the report (IV crush) - it lowers a bought option\'s value'
            : ';  BEFORE the ' + md(t) + ' target: the EM and IV include the earnings move') : (e > t ? ';  after the ' + md(t) + ' target' : ''))]);
      } else {
        add('Earnings & IV', 'earn', 'earnings ' + md(e) + ' already passed (today ' + md(today) + ')', []);
      }
      out.earn = e;
    } else {
      add('Earnings & IV', 'earn', 'earnings: no date typed (optional - from the company\'s investor page or the TOS calendar)', []);
    }
    add('Earnings & IV', 'orange', 'IV used ' + ivTxt + (ivNowIn > 0 ? '  |  IV now ' + ivNowTxt : ''),
      ['type the expiry\'s IV from the option chain (tastytrade IVX / TOS chain header) - the stock\'s overall IV runs high before earnings']);

    // NOW: today's odds (the banners above keep the start-day numbers)
    if (hasStrike) {
      const inWin = today > s && today < t;
      if (inWin && !(pNowIn > 0)) {
        add('NOW', 'now', 'NOW ' + md(today) + ': type today\'s price to see today\'s odds', []);
      } else if (inWin) {
        const pNow = pNowIn;
        const dNow = isCal ? t - today : tradingDays(today, t);
        const sigNow = ivNow * Math.sqrt(dNow / basis);
        const emNow = f * pNow * sigNow;
        const kDistNow = isPut ? pNow - K : K - pNow;
        const kMultNow = kDistNow / emNow;
        const nz = Math.log(K / pNow) / sigNow;
        const nzz = isPut ? nz : -nz;
        const pItmNow = N(nzz);
        const pTouchNow = kDistNow <= 0 ? 1 : Math.min(1, 2 * pItmNow);
        const sqN = 'sqrt(' + dNow + ' / ' + basis + ')';
        Object.assign(out, { nowOn: true, pNow, dNow, emNow, pItmNow, pTouchNow });
        add('NOW', 'now', 'NOW ' + md(today) + ':  price ' + P(pNow) + ',  ' + dNow + (isCal ? ' DTE' : ' trading days') + ' left to ' + md(t) + ',  IV ' + ivNowTxt,
          ['EM left ±$' + P(roundHalf(emNow, 2)) + ' = ' + fTxt + P(pNow) + ' x ' + ivNowTxt + ' x ' + sqN + '  ->  ' + P(roundHalf(pNow + emNow, 2)) + ' / ' + P(roundHalf(pNow - emNow, 2))]);
        add('NOW', 'now', 'NOW ' + P(K) + (isPut ? ' put: ' + P(pNow) + ' - ' + P(K) : ' call: ' + P(K) + ' - ' + P(pNow)) + ' = ' + P(roundHalf(kDistNow, 2)) + (kDistNow >= 0 ? ' OTM' : ' ITM') + ' = ' + R(kMultNow, 2) + ' x EM',
          ['chance ' + (isPut ? 'below ' : 'above ') + P(K) + ' ~' + pct0(pItmNow) + ' = N(' + (isPut ? '' : '-') + 'ln(' + P(K) + ' / ' + P(pNow) + ') / (' + ivNowTxt + ' x ' + sqN + ')) = N(' + R(nzz, 2) + ')',
            'touch ~' + pct0(pTouchNow) + (kDistNow <= 0 ? ' (ITM now)' : ' = 2 x ' + pct1(pItmNow))]);
        if (hasPrem) {
          const beDistNow = buy ? (isCall ? be - pNow : pNow - be) : pNow - be;
          const beMultNow = beDistNow / emNow;
          const bzN = Math.log(be / pNow) / sigNow;
          const pProfitNow = buy ? (isCall ? N(-bzN) : N(bzN)) : 1 - N(bzN);
          out.pProfitNow = pProfitNow;
          const beLine = buy
            ? (beDistNow <= 0 ? 'price ' + P(pNow) + ' is past break-even by ' + P(roundHalf(-beDistNow, 2)) : 'needs a ' + (isCall ? 'rise' : 'drop') + ' of ' + P(roundHalf(beDistNow, 2)) + ' = ' + R(beMultNow, 2) + ' x EM')
            : P(pNow) + ' - ' + P(roundHalf(be, 2)) + ' = ' + P(roundHalf(beDistNow, 2)) + ' = ' + R(beMultNow, 2) + ' x EM' + (beDistNow < 0 ? ' (BELOW break-even)' : '');
          const popMath = buy
            ? (isCall ? 'N(-ln(' : 'N(ln(') + P(roundHalf(be, 2)) + ' / ' + P(pNow) + ') / (' + ivNowTxt + ' x ' + sqN + ')) = N(' + R(isCall ? -bzN : bzN, 2) + ')'
            : '1 - N(ln(' + P(roundHalf(be, 2)) + ' / ' + P(pNow) + ') / (' + ivNowTxt + ' x ' + sqN + ')) = 1 - N(' + R(bzN, 2) + ')';
          add('NOW', 'now', 'NOW BE ' + P(roundHalf(be, 2)) + ':  chance of profit ~' + pct0(pProfitNow), [beLine, 'chance of profit = ' + popMath]);
        }
      }
    }

    // ---------- quotes + LIVE P/L ----------
    const mark = num(raw.mark), bid = num(raw.bid), ask = num(raw.ask), last = num(raw.last);
    const markOk = mark > 0, bidOk = bid > 0, askOk = ask > 0, lastOk = last > 0;
    const anyQ = markOk || bidOk || askOk || lastOk;
    // summary for the big P/L card on the page (rows carry their own math)
    const pl = { on: false, rows: [], bigLabel: buy ? 'RUNNING P/L (option)' : 'RUNNING P/L (premium kept)' };
    out.pl = pl;
    if (hasStrike && Number.isFinite(t)) {
      const left = t - today;
      pl.days = left > 0 ? left + ' days (' + tradingDays(today, t) + ' trading days) left to ' + md(t) : (left === 0 ? 'expires today ' + md(t) : 'expired ' + md(t));
    }
    if (!hasPrem) pl.msg = 'Type the strike and the premium to see the P/L.';
    else if (!anyQ) pl.msg = 'Type the option\'s mark, bid / ask or last (or press Get price) to see the P/L.';
    else if (!(markOk || (bidOk && askOk) || lastOk)) pl.msg = 'No usable option price: a mid needs both bid and ask above 0.';
    if (anyQ && hasPrem) {
      // price used: mark; else (bid + ask) / 2 when both are above 0; else the last trade. Never a mid when bid or ask is 0.
      const src = markOk ? 'mark' : (bidOk && askOk) ? 'mid' : lastOk ? 'last' : '';
      const oPx = src === 'mark' ? mark : src === 'mid' ? (bid + ask) / 2 : src === 'last' ? last : NaN;
      const qMath = ['mark ' + (markOk ? P(mark) : 'n/a') + '  bid ' + (bidOk ? P(bid) : 'n/a') + '  ask ' + (askOk ? P(ask) : 'n/a') + '  last ' + (lastOk ? P(last) : 'n/a'),
        src === 'mid' ? 'no mark: mid = (' + P(bid) + ' + ' + P(ask) + ') / 2 = ' + R3(oPx) : src ? 'price used: ' + src + ' (mark first; else (bid + ask) / 2 when both are above 0; else last)' : 'no usable price: a mid needs both bid and ask above 0'];
      add('Live P/L', 'white', 'quotes: option price used ' + (src ? R3(oPx) + ' (' + src + ')' : 'n/a'), qMath);
      if (src) {
        const plPer = buy ? oPx - prem : prem - oPx;
        const plUsd = plPer * 100 * C;
        out.plUsd = plUsd;
        if (!buy) {
          const plOfMax = plPer / prem;
          const lines = [P(prem) + ' - ' + R3(oPx) + ' ' + src + ' = ' + R3(plPer) + ' x 100 x ' + C + ' = ' + SD(plUsd) + ' = ' + R(plOfMax * 100, 1) + '% of max ' + D(prem * 100 * C)];
          if (askOk) lines.push('close now at ask ' + P(ask) + ': (' + P(prem) + ' - ' + P(ask) + ') x 100 x ' + C + ' = ' + SD((prem - ask) * 100 * C));
          if (hasTp) lines.push('TP buy back ' + R3(tpBuyBack) + ': ' + (oPx - tpBuyBack > 0 ? R3(oPx) + ' - ' + R3(tpBuyBack) + ' = ' + R3(oPx - tpBuyBack) + ' to go' : 'REACHED'));
          add('Live P/L', plUsd >= 0 ? 'up' : 'down', 'LIVE P/L ' + SD(plUsd) + ' = ' + R(plOfMax * 100, 1) + '% of max', lines);
          pl.rows.push({ label: 'option ' + src + ' ' + R3(oPx), value: SD(plUsd) + ' = ' + R(plOfMax * 100, 1) + '% of max ' + D(prem * 100 * C), math: lines[0], cls: plUsd >= 0 ? 'up' : 'down' });
          if (askOk) pl.rows.push({ label: 'close now at ask ' + P(ask), value: SD((prem - ask) * 100 * C), math: lines[1], cls: prem - ask >= 0 ? 'up' : 'down' });
          if (hasTp) pl.rows.push({ label: 'take profit buy back ' + R3(tpBuyBack), value: oPx - tpBuyBack > 0 ? R3(oPx - tpBuyBack) + ' to go' : 'REACHED', math: lines[lines.length - 1], cls: oPx - tpBuyBack > 0 ? 'cyan' : 'up' });
          Object.assign(pl, { on: true, big: SD(plUsd), pct: R(plOfMax * 100, 1) + '% of max profit', cls: plUsd >= 0 ? 'up' : 'down',
            bigMath: '(' + P(prem) + ' sold - ' + R3(oPx) + ' ' + src + ') x 100 x ' + C });
          let ccTotal = NaN;
          if (!isPut) {
            // covered call: stock + call together (part of the big P/L card)
            const stockNow = pNowIn > 0 ? pNowIn : S;
            const stockTxt = P(stockNow) + (pNowIn > 0 ? ' today' : ' start price (type today\'s price)');
            const stockPl = (stockNow - basisC) * 100 * C;
            const costUsd = basisC * 100 * C;
            ccTotal = stockPl + plUsd;
            Object.assign(out, { ccTotal, stockPlUsd: stockPl });
            const netBasis = basisC - prem;
            const calledUsd = (K - basisC + prem) * 100 * C;
            const otmUsd = prem * 100 * C + stockPl;
            const capped = Math.max(0, stockNow - K) * 100 * C;
            const cushion = prem / S;
            const ccRows = [
              { label: 'stock P/L', value: SD(stockPl) + ' (' + (stockPl >= 0 ? '+' : '') + R(stockPl / costUsd * 100, 1) + '%)',
                math: '(' + stockTxt + ' - ' + P(basisC) + ' basis) x 100 x ' + C + ' = ' + SD(stockPl) + ';  ' + SD(stockPl) + ' / ' + D(costUsd) + ' stock cost', cls: stockPl >= 0 ? 'up' : 'down' },
              { label: 'call P/L', value: SD(plUsd) + ' (' + R(plOfMax * 100, 1) + '% of the ' + D(prem * 100 * C) + ' premium kept)',
                math: '(' + P(prem) + ' - ' + R3(oPx) + ') x 100 x ' + C + ' = ' + SD(plUsd), cls: plUsd >= 0 ? 'up' : 'down' },
              { label: 'CC TOTAL P/L', value: SD(ccTotal) + ' (' + (ccTotal >= 0 ? '+' : '') + R(ccTotal / costUsd * 100, 2) + '% of ' + D(costUsd) + ')',
                math: 'stock ' + SD(stockPl) + ' + call ' + SD(plUsd) + ' = ' + SD(ccTotal) + ';  / ' + D(costUsd) + ' = ' + R(ccTotal / costUsd * 100, 2) + '%', cls: ccTotal >= 0 ? 'up' : 'down', strong: true },
              { label: 'cost after premium', value: P(roundHalf(netBasis, 2)) + (stockNow >= netBasis ? ' - stock ' + P(roundHalf(stockNow - netBasis, 2)) + ' above it' : ' - stock ' + P(roundHalf(netBasis - stockNow, 2)) + ' below it'),
                math: P(basisC) + ' - ' + P(prem) + ' = ' + P(roundHalf(netBasis, 2)) + ';  ' + P(stockNow) + ' - ' + P(roundHalf(netBasis, 2)) + ' = ' + R(stockNow - netBasis, 2), cls: stockNow >= netBasis ? 'up' : 'down' },
              { label: 'if called at ' + P(K) + ' on ' + md(t), value: SD(calledUsd) + ' = ' + SD(calledUsd - ccTotal) + ' vs now',
                math: '(' + P(K) + ' - ' + P(basisC) + ' + ' + P(prem) + ') x 100 x ' + C + ' = ' + SD(calledUsd) + ';  ' + SD(calledUsd) + ' - ' + (ccTotal < 0 ? '(' + SD(ccTotal) + ')' : SD(ccTotal)) + ' now = ' + SD(calledUsd - ccTotal), cls: calledUsd >= 0 ? 'up' : 'down' },
              { label: 'if not called (price stays ' + P(stockNow) + ')', value: SD(otmUsd),
                math: 'keep the premium ' + D(prem * 100 * C) + ' + stock ' + SD(stockPl) + ' = ' + SD(otmUsd), cls: otmUsd >= 0 ? 'up' : 'down' },
              { label: 'upside given up', value: capped > 0 ? '-' + D(capped) + ' above the strike' : 'none - stock below ' + P(K),
                math: capped > 0 ? '(' + P(stockNow) + ' - ' + P(K) + ') x 100 x ' + C + ' = ' + D(capped) + ' you do not get if called' : 'gains above ' + P(K) + ' go to the call buyer; ' + P(stockNow) + ' is ' + P(roundHalf(K - stockNow, 2)) + ' below', cls: capped > 0 ? 'down' : 'white' },
              { label: 'downside cushion', value: R(cushion * 100, 2) + '%', math: P(prem) + ' premium / ' + P(S) + ' start price = ' + R(cushion * 100, 2) + '% the stock can fall before the premium is used up', cls: 'white' }
            ];
            if (out.nowOn) ccRows.push({ label: 'odds now', value: 'called ~' + pct0(out.pItmNow) + ',  profit ~' + pct0(out.pProfitNow),
              math: 'from the NOW banners: chance above ' + P(K) + ' and above break-even ' + P(roundHalf(be, 2)) + ' at ' + md(t), cls: 'now' });
            ccRows.forEach(r => add('Live P/L', r.cls === 'now' ? 'now' : r.cls, r.label + ':  ' + r.value, [r.math]));
            pl.cc = ccRows;
            Object.assign(pl, { big: SD(ccTotal), pct: R(ccTotal / costUsd * 100, 2) + '% of the ' + D(costUsd) + ' stock cost', cls: ccTotal >= 0 ? 'up' : 'down',
              bigLabel: 'CC TOTAL P/L (stock + call)', bigMath: 'stock ' + SD(stockPl) + ' + call ' + SD(plUsd) });
          }
          add('Live P/L', plUsd >= 0 ? 'up' : 'down', 'Running P/L   ' + SD(plUsd) + '   ' + R(plOfMax * 100, 2) + '%' + (!isPut ? '   |   CC total ' + SD(ccTotal) : ''), []);
        } else {
          const plPct = plPer / prem;
          const lines = [R3(oPx) + ' ' + src + ' - ' + P(prem) + ' = ' + R3(plPer) + ' x 100 x ' + C + ' = ' + SD(plUsd) + ' = ' + (plPct >= 0 ? '+' : '') + R(plPct * 100, 1) + '% of cost ' + D(prem * 100 * C)];
          if (bidOk) lines.push('sell now at bid ' + P(bid) + ': (' + P(bid) + ' - ' + P(prem) + ') x 100 x ' + C + ' = ' + SD((bid - prem) * 100 * C));
          if (hasTp) lines.push('TP ' + R3(tpPx) + ': ' + (tpPx - oPx > 0 ? R3(tpPx) + ' - ' + R3(oPx) + ' = ' + R3(tpPx - oPx) + ' to go' : 'REACHED'));
          if (hasSl) lines.push('SL ' + R3(slPx) + ': ' + (oPx - slPx > 0 ? R3(oPx) + ' - ' + R3(slPx) + ' = ' + R3(oPx - slPx) + ' above' : 'HIT'));
          add('Live P/L', plUsd >= 0 ? 'up' : 'down', 'LIVE P/L ' + SD(plUsd) + ' = ' + (plPct >= 0 ? '+' : '') + R(plPct * 100, 1) + '% of cost', lines);
          pl.rows.push({ label: 'option ' + src + ' ' + R3(oPx), value: SD(plUsd) + ' = ' + (plPct >= 0 ? '+' : '') + R(plPct * 100, 1) + '% of cost ' + D(prem * 100 * C), math: lines[0], cls: plUsd >= 0 ? 'up' : 'down' });
          let li = 1;
          if (bidOk) pl.rows.push({ label: 'sell now at bid ' + P(bid), value: SD((bid - prem) * 100 * C), math: lines[li++], cls: bid - prem >= 0 ? 'up' : 'down' });
          if (hasTp) pl.rows.push({ label: 'take profit ' + R3(tpPx), value: tpPx - oPx > 0 ? R3(tpPx - oPx) + ' to go' : 'REACHED', math: lines[li++], cls: tpPx - oPx > 0 ? 'cyan' : 'up' });
          if (hasSl) pl.rows.push({ label: 'stop loss ' + R3(slPx), value: oPx - slPx > 0 ? R3(oPx - slPx) + ' above' : 'HIT', math: lines[li++], cls: oPx - slPx > 0 ? 'cyan' : 'down' });
          Object.assign(pl, { on: true, big: SD(plUsd), pct: (plPct >= 0 ? '+' : '') + R(plPct * 100, 1) + '% of cost', cls: plUsd >= 0 ? 'up' : 'down',
            bigMath: '(' + R3(oPx) + ' ' + src + ' - ' + P(prem) + ' paid) x 100 x ' + C });
          add('Live P/L', plUsd >= 0 ? 'up' : 'down', 'Running P/L   ' + SD(plUsd) + '   ' + (plPct >= 0 ? '+' : '') + R(plPct * 100, 2) + '%', []);
        }
      }
    } else if (anyQ && !hasPrem) {
      add('Live P/L', 'red', 'LIVE P/L: enter the strike and the premium to see the P/L', []);
    }
    return out;
  }

  // cone EM at a day number (for the chart): same EM formula with the days so far
  function coneEM(o, d) {
    if (!o.ok || d < o.s) return NaN;
    const days = o.isCal ? d - o.s : tradingDays(o.s, d);
    return o.f * o.S * o.siv * Math.sqrt(days / o.basis);
  }

  const MMM = { compute, coneEM, N, bs, parseDate, iso, md, mdy, dow, DOW, isTrading, tradingDays, holidays, holidayName, todayET, STRATS, BASES, P, R, D, SD, roundHalf, num };
  root.MMM = MMM;
  if (typeof module !== 'undefined' && module.exports) module.exports = MMM;
})(typeof window !== 'undefined' ? window : globalThis);
