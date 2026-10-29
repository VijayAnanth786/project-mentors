import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'siet@2727';

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const mentorName = `Dr. E2E Mentor ${runId}`;
const mentorEmail = `mentor.e2e.${runId}@example.com`;
const mentorDepartment = 'Information Technology';
const newPassword = `E2e!${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}#Pwd`;

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Sign In to Your Account' })).toBeVisible();
  await page.getByPlaceholder('Email', { exact: true }).fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}

async function readTotalMentors(page: Page): Promise<number> {
  const label = page.getByText('Total Mentors', { exact: true });
  await expect(label).toBeVisible();

  // SummaryCard renders the label and value as sibling <p> elements.
  const value = label.locator('xpath=following-sibling::p[1]');
  await expect(value).toHaveText(/^\d+$/);
  return Number((await value.innerText()).trim());
}

async function goToAdminSection(page: Page, section: 'Dashboard' | 'Mentors'): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'admin navigation' });
  await nav.getByRole('button', { name: section, exact: true }).click();
}

async function countMentorDirectoryCards(page: Page): Promise<number> {
  await expect(page.getByRole('heading', { name: 'Faculty Mentors', exact: true })).toBeVisible();
  const editButtons = page.getByRole('button', { name: 'Edit', exact: true });
  await expect(editButtons.first()).toBeVisible();
  return editButtons.count();
}

test('mentor onboarding lifecycle: temp password, forced rotation, and session persistence', async ({ page }) => {
  let initialTotalMentors = 0;
  let tempPassword = '';

  await test.step('admin signs in and the profile chip identifies the Administrator role', async () => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome, Admin!/ })).toBeVisible();

    // The seeded admin's display name and role label are both "Administrator";
    // the last occurrence inside the profile chip is the role label.
    const header = page.locator('header');
    await expect(header.getByText('Administrator', { exact: true }).last()).toBeVisible();
    await expect(header.getByText('Student', { exact: true })).toHaveCount(0);
  });

  await test.step('Total Mentors matches the mentor directory before adding a mentor', async () => {
    initialTotalMentors = await readTotalMentors(page);
    expect(initialTotalMentors).toBeGreaterThan(0);

    await goToAdminSection(page, 'Mentors');
    await expect(page).toHaveURL(/\/admin\/mentors$/);
    expect(await countMentorDirectoryCards(page)).toBe(initialTotalMentors);

    await goToAdminSection(page, 'Dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome, Admin!/ })).toBeVisible();
  });

  await test.step('admin adds a mentor and receives a one-time temporary password', async () => {
    await page.getByRole('button', { name: 'Add Mentor', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Add Faculty Mentor' });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('e.g. Dr. K. Ramesh', { exact: true }).fill(mentorName);
    await dialog.getByPlaceholder('e.g. mentor.faculty@gmail.com', { exact: true }).fill(mentorEmail);
    await dialog.getByLabel(/Department/).selectOption(mentorDepartment);

    await dialog.getByRole('button', { name: 'Create Account', exact: true }).click();

    await expect(dialog.getByText('Mentor Account Created Successfully!', { exact: true })).toBeVisible();
    await expect(dialog.getByText('One-Time Temporary Password', { exact: true })).toBeVisible();

    tempPassword = (await dialog.getByText(/^Temp-/).innerText()).trim();
    expect(tempPassword).toMatch(/^Temp-.+/);
    expect(tempPassword).not.toBe(ADMIN_PASSWORD);

    const expiryText = await dialog.getByText(/It can be used once and expires/i).innerText();
    expect(expiryText).toContain('expires');
    expect(expiryText).not.toContain('after the configured validity period');
    expect(expiryText).toMatch(/\d/);

    await dialog.getByRole('button', { name: 'Done & Close', exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step('Total Mentors increments and still matches the mentor directory', async () => {
    const expectedTotal = initialTotalMentors + 1;
    await expect(page.getByText('Total Mentors', { exact: true }).locator('xpath=following-sibling::p[1]')).toHaveText(
      String(expectedTotal)
    );
    expect(await readTotalMentors(page)).toBe(expectedTotal);

    await goToAdminSection(page, 'Mentors');
    await expect(page).toHaveURL(/\/admin\/mentors$/);
    await expect(page.getByRole('heading', { name: mentorName, exact: true })).toBeVisible();
    expect(await countMentorDirectoryCards(page)).toBe(expectedTotal);
  });

  await test.step('mentor logs in with the temporary password and is forced to rotate it', async () => {
    await page.locator('header').getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await login(page, mentorEmail, tempPassword);

    await expect(page.getByRole('heading', { name: 'Update Temporary Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set Password & Open Dashboard', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('header')).toHaveCount(0);

    const currentPassword = page.getByPlaceholder('Current Password', { exact: true });
    await expect(currentPassword).toHaveValue(tempPassword);

    await currentPassword.fill(tempPassword);
    await page.getByPlaceholder('New Secure Password (min. 8 chars)', { exact: true }).fill(newPassword);
    await page.getByPlaceholder('Confirm New Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Set Password & Open Dashboard', exact: true }).click();

    await expect(page).toHaveURL(/\/mentor\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Hello, / })).toBeVisible();
    await expect(page.locator('header').getByText('Faculty Mentor', { exact: true })).toBeVisible();
  });

  await test.step('reloading preserves the mentor session and dashboard route', async () => {
    console.log('BEFORE RELOAD', await page.evaluate(() => ({ url: location.pathname, user: localStorage.getItem('pm_user'), token: !!localStorage.getItem('pm_auth_token') })));
    await page.reload({ waitUntil: 'domcontentloaded' });
    console.log('AFTER RELOAD', await page.evaluate(() => ({ url: location.pathname, user: localStorage.getItem('pm_user'), token: !!localStorage.getItem('pm_auth_token') })));
    console.log('ME RESPONSE', await page.evaluate(async () => {
      const token = localStorage.getItem('pm_auth_token');
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      return { status: res.status, body: await res.text() };
    }));

    await expect(page).toHaveURL(/\/mentor\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Hello, / })).toBeVisible();
    await expect(page.locator('header').getByText('Faculty Mentor', { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'mentor navigation' })).toBeVisible();

    const session = await page.evaluate(() => ({
      token: localStorage.getItem('pm_auth_token'),
      user: localStorage.getItem('pm_user')
    }));
    expect(session.token).toBeTruthy();
    expect(session.user).toBeTruthy();
    expect(JSON.parse(session.user as string).mustChangePassword).toBe(false);
  });

  await test.step('old temporary password is rejected and the new password opens the dashboard', async () => {
    await page.locator('header').getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await login(page, mentorEmail, tempPassword);
    await expect(page.getByText('Invalid email or password.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('header')).toHaveCount(0);

    await login(page, mentorEmail, newPassword);
    await expect(page).toHaveURL(/\/mentor\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Hello, / })).toBeVisible();
    await expect(page.locator('header').getByText('Faculty Mentor', { exact: true })).toBeVisible();
  });
});
