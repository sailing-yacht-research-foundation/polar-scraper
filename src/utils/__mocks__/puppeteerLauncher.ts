const mockPage = {
  goto: jest.fn(),
  waitForSelector: jest.fn(),
  type: jest.fn(),
  evaluate: jest.fn(),
  waitForNavigation: jest.fn(),
  click: jest.fn(),
  $eval: jest.fn(),
  $$eval: jest.fn(),
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

export async function launchBrowser() {
  return mockBrowser;
}

export async function closePageAndBrowser({ page, browser }) {
  if (page) {
    await mockPage.close();
  }
  if (browser) {
    await mockBrowser.close();
  }
}
