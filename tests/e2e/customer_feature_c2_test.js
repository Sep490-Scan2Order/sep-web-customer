Feature("Customer Feature C2 - Ordering Journey E2E");

Scenario("C2-TC01 customer can open menu page without query", async ({ I }) => {
  I.amOnPage("/menu");
  I.seeInCurrentUrl("/menu");
  I.seeElement("body");
});

Scenario(
  "C2-TC02 customer can open menu page with cart and restaurant query",
  async ({ I }) => {
    I.amOnPage("/menu?restaurant=demo&restaurantId=1&cartId=e2e-cart");
    I.seeInCurrentUrl("/menu?restaurant=demo&restaurantId=1&cartId=e2e-cart");
    I.seeElement("body");
  },
);

Scenario("C2-TC03 customer can open checkout page", async ({ I }) => {
  I.amOnPage("/checkout");
  I.seeInCurrentUrl("/checkout");
  I.seeElement("body");
});

Scenario("C2-TC04 customer can open checkout preorder page", async ({ I }) => {
  I.amOnPage("/checkout-preorder");
  I.seeInCurrentUrl("/checkout-preorder");
  I.seeElement("body");
});

Scenario("C2-TC05 customer can open order lookup page", async ({ I }) => {
  I.amOnPage("/orders/lookup");
  I.seeInCurrentUrl("/orders/lookup");
  I.seeElement("body");
});

Scenario(
  "C2-TC06 customer can open order lookup history page",
  async ({ I }) => {
    I.amOnPage("/orders/lookup/history");
    I.seeInCurrentUrl("/orders/lookup");
    I.seeElement("body");
  },
);

Scenario(
  "C2-TC07 customer can open restaurant detail by id route",
  async ({ I }) => {
    I.amOnPage("/restaurant/1");
    I.seeInCurrentUrl("/restaurant/1");
    I.seeElement("body");
  },
);

Scenario(
  "C2-TC08 customer can open restaurant detail by slug route",
  async ({ I }) => {
    I.amOnPage("/restaurants/demo-restaurant");
    I.seeInCurrentUrl("/restaurants/demo-restaurant");
    I.seeElement("body");
  },
);

Scenario(
  "C2-TC09 customer can open order lookup with phone query",
  async ({ I }) => {
    I.amOnPage("/orders/lookup?phone=0987654321");
    I.seeInCurrentUrl("/orders/lookup?phone=0987654321");
    I.seeElement("body");
  },
);
