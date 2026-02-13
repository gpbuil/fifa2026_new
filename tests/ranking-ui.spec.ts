import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe('ranking route', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to run ranking tests.');

  test('search, detail table visual matchup, legend matrix, and pagination flow works', async ({ page }) => {
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

    await page.goto('/ranking');
    await expect(page.getByText('Ranking Geral')).toBeVisible();
    await expect(page.getByTestId('ranking-wireframe-layout')).toBeVisible();

    const noOfficialResults = page.getByText('Sem resultados oficiais');
    if (await noOfficialResults.count()) {
      test.skip(true, 'No official results found in this environment.');
    }

    const rows = page.getByTestId('ranking-row');
    await expect(rows.first()).toBeVisible();

    await page.getByTestId('ranking-search-input').fill('nao-encontrado-xpto');
    await expect(page.getByTestId('ranking-empty-search')).toBeVisible();
    await page.getByTestId('ranking-search-input').fill('');

    await rows.first().click();
    const detailTable = page.getByTestId('detail-table');
    const detailEmptyResolved = page.getByTestId('detail-empty-resolved');
    if (await detailTable.count()) {
      await expect(detailTable).toBeVisible();
    } else {
      await expect(detailEmptyResolved).toBeVisible();
    }
    const detailRows = page.getByTestId('detail-row');
    if (await detailRows.count()) {
      await expect(detailRows.first()).toBeVisible();
      await expect(page.getByTestId('detail-matchup').first()).toContainText('vs');
    } else {
      await expect(page.getByTestId('detail-empty-resolved')).toBeVisible();
    }

    await expect(page.getByTestId('detail-pagination')).toBeVisible();
    await expect(page.getByTestId('ranking-pagination')).toBeVisible();
    await expect(page.getByTestId('legend-matrix')).toBeVisible();
    await expect(page.getByTestId('legend-row-exact')).toBeVisible();
    await expect(page.getByText('3º lugar')).toBeVisible();
    await expect(page.getByText('Final')).toBeVisible();

    const rankingNext = page.getByTestId('ranking-page-next');
    if (await rankingNext.isEnabled()) {
      await rankingNext.click();
      await expect(page.getByTestId('ranking-page-indicator')).toContainText('Pagina 2');
    }

    const detailNext = page.getByTestId('detail-page-next');
    if (await detailNext.isEnabled()) {
      await detailNext.click();
      await expect(page.getByTestId('detail-page-indicator')).toContainText('Pagina 2');
    }
  });
});
