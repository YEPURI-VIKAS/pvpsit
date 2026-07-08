const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Users\\vikas\\.cache\\puppeteer\\chrome\\win64-150.0.7871.24\\chrome-win64\\chrome.exe' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
