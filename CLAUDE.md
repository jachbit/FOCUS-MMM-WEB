# F.O.C.U.S.© MMM Web - project notes

- Static GitHub Pages page: `index.html` (layout, cone canvas, saved plays, CSV, jsPDF report) + `mmm-math.js` (all math + banner text). No server, no credentials, no build.
- The math is a 1:1 port of `D:\ClaudeCodeProjects\FOCUS-MMM-TOS\` (FOCUS_MMM v1.23, FOCUS_MMM_PL v1.5, FOCUS_MMM_BUY v1.3, FOCUS_MMM_BUY_PL v1.1). When a TOS study changes, port the change here and re-run the three examples (README table) - they must still match TOS exactly.
- Test the math in Node: `node -e "const M=require('./mmm-math.js'); console.log(M.compute({...}).banners)"`.
- Before edits: run `backup_all.bat`. Local preview: `start.bat` (port 8136, PORT_REGISTRY.md).
- Rules kept here: every banner wraps (never cut off); every number shows its math; calendar DTE / 365 default; never a mid price when bid or ask is 0; NaN checks with Number.isFinite, never a bare comparison; min 12px, no dim text; jsPDF text Latin-1 only (`L1()`).
- GoatCounter loads only on jachbit.github.io (shared free account jachbit-fftp).
- Yahoo price: browser-side v8 chart API via the FOCUS Stocks Banner Cloudflare worker (`fsb-proxy`), corsproxy.io as fallback.
