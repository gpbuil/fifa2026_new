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

test('forgot password uses the exact app origin and hides Supabase 500 details', async ({ page }) => {
  let recoverUrl = '';

  await page.route('https://rtjozxqtrcsjnryurxkf.supabase.co/auth/v1/recover**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
        },
      });
      return;
    }

    recoverUrl = route.request().url();
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Esqueceu a senha\?/i }).click();
  await page.getByPlaceholder('seu@email.com').fill('usuario@example.com');
  await page.getByRole('button', { name: /Enviar Link de Recupera/i }).click();

  await expect(page.getByText(/Nao foi possivel enviar o link agora/i)).toBeVisible();
  expect(recoverUrl).toContain('redirect_to=http%3A%2F%2Flocalhost%3A5173');
  expect(recoverUrl).not.toContain('redirect_to=http%3A%2F%2Flocalhost%3A5173%2F');
});
