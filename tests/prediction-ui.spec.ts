import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe('prediction input ui', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to run prediction UI tests.');

  test('renders compact groups and knockout layouts', async ({ page }) => {
    await page.goto('/');

    const signOutButton = page.getByRole('button', { name: 'Sair' });
    if (await signOutButton.count()) {
      await signOutButton.first().click();
      await page.goto('/');
    }

    await page.getByLabel('E-mail').fill(E2E_EMAIL!);
    await page.getByTestId('password-input').fill(E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await expect(page.getByText('Entrada de Resultados')).toBeVisible();
    const blockedGrid = page.getByTestId('groups-blocked-grid');
    if (await blockedGrid.count()) {
      await expect(blockedGrid).toBeVisible();
      await expect(page.locator('[data-testid^="group-results-table-"]').first()).toBeVisible();
      await expect(page.locator('[data-testid^="group-standings-table-"]').first()).toBeVisible();
    } else {
      await expect(page.getByTestId('group-card-A')).toBeVisible();
      await expect(page.getByTestId('group-match-row').first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'MATA-MATA' }).click();
    await expect(page.getByTestId('knockout-grid')).toBeVisible();
  });

  test('mobile tabs switch between groups and knockout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const signOutButton = page.getByRole('button', { name: 'Sair' });
    if (await signOutButton.count()) {
      await signOutButton.first().click();
      await page.goto('/');
    }

    await page.getByLabel('E-mail').fill(E2E_EMAIL!);
    await page.getByTestId('password-input').fill(E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await expect(page.getByTestId('prediction-mobile-tabs')).toBeVisible();
    const blockedGrid = page.getByTestId('groups-blocked-grid');
    if (await blockedGrid.count()) {
      await expect(blockedGrid).toBeVisible();
    } else {
      await expect(page.getByTestId('group-card-A')).toBeVisible();
    }

    await page.getByRole('button', { name: 'Mata-mata' }).click();
    await expect(page.getByTestId('knockout-grid')).toBeVisible();
  });
});
