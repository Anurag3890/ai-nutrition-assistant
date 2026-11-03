const { test, expect } = require("@playwright/test");
const password = "Synthetic browser test phrase!";
const phone = () => "+1202" + Math.floor(1000000 + Math.random() * 9000000);
async function account(page) {
  const number = phone();
  const response = await page.request.post("/api/auth/register", {
    data: {
      full_name: "Browser Check",
      phone: number,
      password,
      timezone: "Asia/Kolkata",
    },
  });
  expect(response.status()).toBe(201);
  return { phone: number, ...(await response.json()) };
}

test("signup, recovery-code handoff, and canonical login", async ({ page }) => {
  await page.goto("/web/");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const number = phone();
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Browser Check");
  await page.getByPlaceholder("+91 98765 43210", { exact: true }).fill(number);
  await page.locator("#auth-password").fill(password);
  await page
    .locator("#auth-form")
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Keep these somewhere safe.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I’ve saved my codes", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByPlaceholder("+91 98765 43210", { exact: true })
    .fill(
      number.slice(0, 2) + " " + number.slice(2, 5) + " " + number.slice(5),
    );
  await page.locator("#auth-password").fill(password);
  await page
    .locator("#auth-form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Today, at your pace.", exact: true }),
  ).toBeVisible();
});

test("meal CRUD, hydration, and reload persistence", async ({ page }) => {
  await account(page);
  await page.goto("/web/");
  await page.getByRole("button", { name: "+ Log food", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Food or meal", exact: true })
    .fill("Test lunch");
  await page
    .getByRole("spinbutton", { name: "Calories · kcal", exact: true })
    .fill("450");
  await page.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Test lunch", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ 250 ml", exact: true }).click();
  await expect(page.locator("#water-total")).toHaveText("250");
  await page.reload();
  await expect(page.locator("#calories-consumed")).toHaveText("450");
  await expect(page.locator("#water-total")).toHaveText("250");
  await page
    .getByRole("button", { name: "Edit Test lunch", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Calories · kcal", exact: true })
    .fill("500");
  await page.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(page.locator("#calories-consumed")).toHaveText("500");
  await page
    .getByRole("button", { name: "Delete Test lunch", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete meal", exact: true }).click();
  await expect(page.locator("#calories-consumed")).toHaveText("0");
});

test("check-in updates profile and history, chat restores", async ({
  page,
}) => {
  await account(page);
  await page.goto("/web/");
  await page
    .getByRole("button", { name: "Daily check-in", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Weight · kg", exact: true })
    .fill("72.5");
  await page
    .getByRole("button", { name: "Save check-in", exact: true })
    .click();
  await expect(page.locator("#checkin-dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.locator("#profile-form [name=current_weight_kg]"),
  ).toHaveValue("72.5");
  await page.getByRole("button", { name: "Coach", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Summarize my day");
  await page.getByRole("button", { name: "Send ↑", exact: true }).click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: "Coach", exact: true }).click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
});

test("food search preserves source and responsive screens fit", async ({
  page,
}) => {
  await account(page);
  await page.goto("/web/");
  await page.getByRole("button", { name: "+ Log food", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search foods", exact: true })
    .fill("rice");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".food-result").first()).toContainText(
    "USDA FoodData Central",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "+ Log food", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/mobile-diary.png",
    fullPage: true,
  });
});
