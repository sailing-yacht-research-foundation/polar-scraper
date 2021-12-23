import puppeteer from 'puppeteer';

export async function launchBrowser() {
  return await puppeteer.launch({
    headless: false, // open this for testing with ui shown
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  });
}

export async function closePageAndBrowser({
  page,
  browser,
}: {
  page?: puppeteer.Page;
  browser?: puppeteer.Browser;
}) {
  if (page) {
    await page.close();
  }
  if (browser) {
    await browser.close();
  }
}
