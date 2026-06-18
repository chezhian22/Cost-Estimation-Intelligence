import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 15000 });
await page.screenshot({ path: 'C:/Users/Senthamil/AppData/Local/Temp/invoice_home.png' });

const navLinks = await page.$$eval('a, button', els =>
  els.map(e => ({ text: e.textContent?.trim().substring(0, 50), href: e.getAttribute('href') || '' }))
     .filter(l => l.text)
);
console.log('Clickable items:', JSON.stringify(navLinks, null, 2));

await browser.close();
