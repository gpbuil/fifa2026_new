import { test, expect } from '@playwright/test';

test('login shows a single password toggle and toggles visibility', async ({ page }) => {
  await page.goto('/');

  const signOutButton = page.getByRole('button', { name: 'Sair' });
  if (await signOutButton.count()) {
    await signOutButton.first().click();
  }

  const toggle = page.getByTestId('password-toggle');
  await expect(toggle).toHaveCount(1);

  const input = page.getByTestId('password-input');
  await expect(input).toHaveAttribute('type', 'password');

  await toggle.click();
  await expect(input).toHaveAttribute('type', 'text');

  await toggle.click();
  await expect(input).toHaveAttribute('type', 'password');
});

test('reset password form shows toggles for both fields', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Esqueceu a senha\?/i }).click();
  await expect(page.getByText('Seu E-mail de cadastro')).toBeVisible();

  // Simulate recovery mode by forcing the UI state with sessionStorage
  await page.evaluate(() => {
    sessionStorage.setItem('sb-recovery', '1');
  });
  await page.reload();

  await expect(page.getByText('Defina sua nova senha')).toBeVisible();
  await expect(page.getByTestId('password-toggle')).toHaveCount(1);
  await expect(page.getByTestId('confirm-password-toggle')).toHaveCount(1);
});
