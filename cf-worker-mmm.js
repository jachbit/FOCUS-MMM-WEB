// F.O.C.U.S.(c) MMM Web - data proxy (Cloudflare Worker) | Jachbit 2026
// Lets the static page (GitHub Pages) read three public data pages that browsers may not read directly (no CORS):
//   /chart/<SYMBOL>?interval=1d&range=6mo   -> Yahoo v8 chart (stock price, past closes)
//   /earnings/<SYMBOL>                      -> Nasdaq next earnings date (Zacks)
//   /options/<SYMBOL>?date=YYYY-MM-DD[&class=etf] -> Nasdaq option chain for one expiry (last / bid / ask per strike)
// Nothing else is forwarded (no open proxy), only GET, symbols and dates are checked, no keys or cookies are used.
//
// Deploy: dash.cloudflare.com -> Workers & Pages -> Create -> Worker -> name it  mmm-proxy  -> Deploy ->
//         Edit code -> replace everything with this file -> Deploy.
// The page expects it at https://mmm-proxy.<your-subdomain>.workers.dev (MMM_PROXY in index.html).

const SYM = /^[A-Z0-9.\-^=]{1,12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/plain, */*' };

function reply(body, status, maxAge) {
  return new Response(body, {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=' + (maxAge || 0),
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return reply('', 204);
    if (request.method !== 'GET') return reply('{"error":"GET only"}', 405);
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const route = parts[0];
    const sym = decodeURIComponent(parts[1] || '').toUpperCase();
    if (parts.length !== 2 || !SYM.test(sym)) return reply('{"error":"bad symbol"}', 400);

    let target, maxAge = 0;
    if (route === 'chart') {
      const interval = url.searchParams.get('interval') || '1d';
      const range = url.searchParams.get('range') || '5d';
      if (!/^[0-9a-z]{1,4}$/.test(interval) || !/^[0-9a-z]{1,4}$/.test(range)) return reply('{"error":"bad query"}', 400);
      target = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + interval + '&range=' + range;
    } else if (route === 'earnings') {
      target = 'https://api.nasdaq.com/api/analyst/' + encodeURIComponent(sym) + '/earnings-date';
      maxAge = 3600;
    } else if (route === 'options') {
      const d = url.searchParams.get('date') || '';
      const cls = url.searchParams.get('class') === 'etf' ? 'etf' : 'stocks';
      if (!DAY.test(d)) return reply('{"error":"bad date"}', 400);
      target = 'https://api.nasdaq.com/api/quote/' + encodeURIComponent(sym) + '/option-chain?assetclass=' + cls +
        '&limit=400&fromdate=' + d + '&todate=' + d + '&money=all&type=all';
      maxAge = 30;
    } else {
      return reply('{"error":"unknown route"}', 404);
    }
    try {
      const r = await fetch(target, { headers: UA });
      return reply(await r.text(), r.status, r.ok ? maxAge : 0);
    } catch (e) {
      return reply('{"error":"upstream failed"}', 502);
    }
  },
};
