# Playwright E2E Testing

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    process.env.CI ? ["github"] : ["list"],
  ],
  use: {
    baseURL: "http://drzum.test:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "docker compose up",
    url: "http://drzum.test:3001",
    reuseExistingServer: !process.env.CI,
  },
});
```

## Page Object Model

Encapsulate page interactions in reusable page objects:

```typescript
// e2e/pages/login.page.ts
import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/correo/i);
    this.passwordInput = page.getByLabel(/contraseña/i);
    this.submitButton = page.getByRole("button", { name: /iniciar sesión/i });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/signin");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Using Page Objects in Tests

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Login", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("logs in with valid credentials", async ({ page }) => {
    await loginPage.login("patient@example.com", "password123");
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows error for invalid credentials", async () => {
    await loginPage.login("wrong@example.com", "wrongpassword");
    await loginPage.expectError(/credenciales/i);
  });
});
```

## Fixtures

### Custom Fixtures

```typescript
// e2e/fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { DashboardPage } from "./pages/dashboard.page";

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from "@playwright/test";
```

### Using Fixtures

```typescript
import { test, expect } from "./fixtures";

test("navigates to dashboard after login", async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login("patient@example.com", "password123");
  await dashboardPage.expectVisible();
});
```

## Authentication State

### Save and Reuse Auth State

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/patient.json";

setup("authenticate as patient", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel(/correo/i).fill("patient@example.com");
  await page.getByLabel(/contraseña/i).fill("password123");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL("/dashboard");

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
```

### Configure in Projects

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project — runs first
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Tests that need auth
    {
      name: "authenticated",
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/patient.json",
      },
    },

    // Tests that don't need auth
    {
      name: "unauthenticated",
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],
});
```

## API Mocking

### Route Interception

```typescript
test("shows empty state when no appointments", async ({ page }) => {
  // Mock the GraphQL response
  await page.route("**/patient/graphql", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");

    if (body.operationName === "GetAppointments") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { viewer: { appointments: [] } },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/appointments");
  await expect(page.getByText(/no tienes citas/i)).toBeVisible();
});
```

### Network Failure Simulation

```typescript
test("shows error on network failure", async ({ page }) => {
  await page.route("**/patient/graphql", (route) => route.abort());

  await page.goto("/dashboard");
  await expect(page.getByText(/error.*conexión/i)).toBeVisible();
});
```

## Visual Assertions

```typescript
test("renders the login page correctly", async ({ page }) => {
  await page.goto("/signin");

  // Full page screenshot
  await expect(page).toHaveScreenshot("login-page.png");

  // Element screenshot
  const form = page.getByRole("form");
  await expect(form).toHaveScreenshot("login-form.png");
});
```

## Common Patterns

### Waiting for Navigation

```typescript
// Wait for URL change after action
await page.getByRole("button", { name: /continuar/i }).click();
await page.waitForURL("/next-step");
```

### Waiting for Network

```typescript
// Wait for a specific API response
const responsePromise = page.waitForResponse("**/patient/graphql");
await page.getByRole("button", { name: /guardar/i }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);
```

### Testing Responsive Layout

```typescript
test("shows mobile menu on small screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByLabel(/abrir menú/i)).toBeVisible();
  await expect(page.getByRole("navigation")).not.toBeVisible();

  await page.getByLabel(/abrir menú/i).click();
  await expect(page.getByRole("navigation")).toBeVisible();
});
```

### Multi-Step Flows

```typescript
test("completes appointment booking flow", async ({ page }) => {
  // Step 1: Search for doctor
  await page.goto("/search");
  await page.getByLabel(/especialidad/i).click();
  await page.getByRole("option", { name: /cardiología/i }).click();
  await page.getByRole("button", { name: /buscar/i }).click();

  // Step 2: Select doctor
  await page.getByText("Dr. García").click();

  // Step 3: Choose time slot
  await page.getByRole("button", { name: /10:00/ }).click();

  // Step 4: Confirm
  await page.getByRole("button", { name: /confirmar/i }).click();

  // Verify confirmation
  await expect(page.getByText(/cita.*confirmada/i)).toBeVisible();
});
```

## Anti-Patterns

### Don't Use Hard-Coded Waits

```typescript
// ❌ Wrong — fragile, slow
await page.waitForTimeout(3000);

// ✅ Correct — wait for specific conditions
await expect(page.getByText("Success")).toBeVisible();
await page.waitForURL("/dashboard");
```

### Don't Test Third-Party Components

```typescript
// ❌ Wrong — testing Radix Dialog's internal behavior
test("dialog traps focus", async () => { /* ... */ });

// ✅ Correct — test YOUR behavior that uses the dialog
test("shows confirmation before deleting appointment", async () => { /* ... */ });
```

### Don't Share State Between Tests

```typescript
// ❌ Wrong — test depends on previous test's state
test("creates appointment", async () => { /* creates apt */ });
test("views created appointment", async () => { /* assumes apt exists */ });

// ✅ Correct — each test is independent
test("views appointment", async ({ page }) => {
  // Setup: create appointment via API
  await createTestAppointment();
  await page.goto("/appointments");
  // ...
});
```
