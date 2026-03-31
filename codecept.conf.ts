export const config = {
  tests: './tests/e2e/**/*_test.js',      // Pattern file test
  helpers: {
    Playwright: {
      // Đã đổi cổng E2E base URL sang 3001 theo yêu cầu thay vì 3000
      url: process.env.E2E_BASE_URL || 'http://localhost:3001',
      browser: 'chromium',
      show: false, // Chạy ngầm (headless)
    }
  },
  plugins: {
    allure: { 
      enabled: true,
      require: '@codeceptjs/allure-legacy' 
    },
    screenshotOnFail: { enabled: true },    // Chụp màn hình khi fail
  }
};
