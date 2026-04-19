Feature("Customer Feature C3 - Navigation and Resilience E2E");

Scenario("C3-TC01 customer can open signup page", async ({ I }) => {
  I.amOnPage("/signup");
  I.seeInCurrentUrl("/signup");
  I.seeElement("body");
});

Scenario(
  "C3-TC02 customer can open search page without keyword",
  async ({ I }) => {
    I.amOnPage("/search");
    I.seeInCurrentUrl("/search");
    I.see("Không có từ khóa tìm kiếm");
  },
);

Scenario(
  "C3-TC03 customer can navigate between home and privacy pages",
  async ({ I }) => {
    I.amOnPage("/");
    I.amOnPage("/privacy-policy");
    I.seeInCurrentUrl("/privacy-policy");
    I.amOnPage("/");
    I.seeInCurrentUrl("/");
  },
);

Scenario(
  "C3-TC04 customer route handles unknown path gracefully",
  async ({ I }) => {
    I.amOnPage("/not-exists-e2e");
    I.seeInCurrentUrl("/not-exists-e2e");
    I.seeElement("body");
  },
);

Scenario(
  "C3-TC05 customer can reload partnership page without crash",
  async ({ I }) => {
    I.amOnPage("/partnership");
    I.seeInCurrentUrl("/partnership");
    I.refreshPage();
    I.see("Hợp tác cùng Scan2Order");
  },
);

Scenario(
  "C3-TC06 customer can open about-us then privacy-policy flow",
  async ({ I }) => {
    I.amOnPage("/about-us");
    I.see("Về Scan2Order");
    I.amOnPage("/privacy-policy");
    I.see("Chính sách và bảo mật");
  },
);
