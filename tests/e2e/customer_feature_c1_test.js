Feature("Customer Feature C1 - Discovery E2E");

Scenario("C1-TC01 customer can open home page", async ({ I }) => {
  I.amOnPage("/");
  I.seeInCurrentUrl("/");
  I.seeElement("body");
});

Scenario("C1-TC02 customer can open about-us page", async ({ I }) => {
  I.amOnPage("/about-us");
  I.seeInCurrentUrl("/about-us");
  I.see("Về Scan2Order");
});

Scenario("C1-TC03 customer can open privacy policy page", async ({ I }) => {
  I.amOnPage("/privacy-policy");
  I.seeInCurrentUrl("/privacy-policy");
  I.see("Chính sách và bảo mật");
});

Scenario("C1-TC04 customer can open partnership page", async ({ I }) => {
  I.amOnPage("/partnership");
  I.seeInCurrentUrl("/partnership");
  I.see("Hợp tác cùng Scan2Order");
});

Scenario("C1-TC05 customer can open restaurants listing", async ({ I }) => {
  I.amOnPage("/restaurants");
  I.seeInCurrentUrl("/restaurants");
  I.see("Tất cả nhà hàng");
});

Scenario("C1-TC06 customer can open restaurants search result by keyword", async ({ I }) => {
  I.amOnPage("/restaurants?keyword=com");
  I.seeInCurrentUrl("/restaurants?keyword=com");
  I.see("Kết quả tìm kiếm");
});

Scenario("C1-TC07 customer can open global search page with keyword", async ({ I }) => {
  I.amOnPage("/search?keyword=pho");
  I.seeInCurrentUrl("/search?keyword=pho");
  I.see("Kết quả tìm kiếm");
});

Scenario("C1-TC08 customer can open nearby restaurants page", async ({ I }) => {
  I.amOnPage("/nearby-restaurants");
  I.seeInCurrentUrl("/nearby-restaurants");
  I.seeElement("body");
});
