import { test, expect } from '@playwright/test';

test.describe('Hasta Yönetimi (Patients E2E Flow)', () => {
  test.beforeEach(async ({ page }) => {
    // Auth mock
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'doktor@urolog.com',
          username: 'dr_alp',
          full_name: 'Dr. Alp',
          role: 'admin',
          is_active: true,
        }),
      });
    });

    // References mock
    await page.route('**/api/v1/patients/references', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['Tanıdık', 'İnternet', 'Konsültasyon']),
      });
    });

    // Definitions mock
    await page.route('**/api/v1/definitions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('hasta listesi ve arama arayüzü başarıyla yüklenmeli', async ({ page }) => {
    const mockPatients = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        ad: 'Mehmet',
        soyad: 'Öztürk',
        tc_kimlik: '12345678901',
        cep_tel: '05551234567',
        cinsiyet: 'Erkek',
        dogum_tarihi: '1985-05-15',
        created_at: '2026-01-01T10:00:00',
        son_tani: 'BPH',
        muayene_count: 2,
        operation_count: 0,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        ad: 'Ayşe',
        soyad: 'Demir',
        tc_kimlik: '98765432101',
        cep_tel: '05329876543',
        cinsiyet: 'Kadın',
        dogum_tarihi: '1990-08-20',
        created_at: '2026-02-01T11:00:00',
        son_tani: 'Ürolitiyazis',
        muayene_count: 1,
        operation_count: 1,
      },
    ];

    await page.route('**/api/v1/patients?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPatients),
      });
    });

    // Sayfaya git
    await page.goto('/patients');

    // Tablo veya kart görünümünde hasta isimlerinin görüntülendiğini doğrula
    await expect(page.getByText('Mehmet')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Öztürk')).toBeVisible();
    await expect(page.getByText('Ayşe')).toBeVisible();
    await expect(page.getByText('Demir')).toBeVisible();
  });

  test('yeni hasta oluşturma sayfası doğrulamaları ve kayıt akışı', async ({ page }) => {
    let createdPayload: any = null;

    await page.route('**/api/v1/patients', async (route) => {
      if (route.request().method() === 'POST') {
        createdPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '33333333-3333-3333-3333-333333333333',
            ...createdPayload,
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock bootstrap for redirect target
    await page.route('**/api/v1/patients/33333333-3333-3333-3333-333333333333/bootstrap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          patient: {
            id: '33333333-3333-3333-3333-333333333333',
            ad: 'Ali',
            soyad: 'Kaya',
          },
          muayeneler: [],
          appointments: [],
          timeline: [],
        }),
      });
    });

    await page.goto('/patients/create');

    // Zorunlu alanları doldur
    const adInput = page.locator('input[name="ad"]');
    const soyadInput = page.locator('input[name="soyad"]');

    await expect(adInput).toBeVisible();
    await adInput.fill('Ali');
    await soyadInput.fill('Kaya');

    // Kaydet butonunun görünür olduğunu doğrula ve tıkla
    const submitButton = page.getByRole('button', { name: /Kaydet|Oluştur/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Yönlendirme veya API çağrısının gerçekleştiğini doğrula
    await page.waitForTimeout(1000);
    expect(createdPayload).not.toBeNull();
    expect(createdPayload.ad).toBe('Ali');
    expect(createdPayload.soyad).toBe('Kaya');
  });
});
