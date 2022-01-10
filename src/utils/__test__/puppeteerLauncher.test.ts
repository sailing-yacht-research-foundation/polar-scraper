import puppeteer from 'puppeteer';

import { launchBrowser, closePageAndBrowser } from '../puppeteerLauncher';

// ==== Puppeteer related mocks ====
const mockPage = {
  goto: jest.fn(),
  evaluate: jest.fn(),
  waitForNetworkIdle: jest.fn(),
  close: jest.fn(),
};
const mockBrowser = {
  newPage: jest.fn(() => {
    return mockPage;
  }),
  close: jest.fn(),
};
jest.mock('puppeteer', () => {
  return {
    launch: jest.fn(() => {
      return mockBrowser;
    }),
  };
});
// ==== Puppeteer related mocks ====

describe('puppeteer launcher - functions to create/close a browser instance with all prequisite options', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });
  it('launchBrowser - should fire up puppeteer and return browser instance', async () => {
    const browser = await launchBrowser();
    expect(browser).toBe(mockBrowser);

    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    expect(puppeteer.launch).toHaveBeenCalledWith({
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
  });

  it('closePageAndBrowser - should fire up puppeteer and return browser instance', async () => {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    await closePageAndBrowser({});
    expect(page.close).toHaveBeenCalledTimes(0);
    expect(browser.close).toHaveBeenCalledTimes(0);

    await closePageAndBrowser({ page, browser });

    expect(page.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
