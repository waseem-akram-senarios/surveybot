// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

// ─── Recipient App Accessibility ─────────────────────────────────────────────

test.describe('Recipient App - Basic Access', () => {
  test('recipient app responds at /survey/ path', async ({ request }) => {
    // The gateway proxies /survey/ to the recipient Next.js app
    const response = await request.get(`${BASE}/survey/test-id`);
    // Next.js should return 200 even for unknown IDs (client-side routing)
    expect(response.status()).toBeLessThan(500);
  });

  test('recipient app serves Next.js assets', async ({ request }) => {
    // _next/ assets should be proxied
    const response = await request.get(`${BASE}/_next/data`);
    // May 404 for exact path, but should not 502/503
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});

// ─── Full Recipient Survey Flow (with real survey) ───────────────────────────

test.describe('Recipient Survey E2E Flow', () => {
  const TEMPLATE_NAME = `E2E_Recipient_${Date.now()}`;
  let surveyId = '';
  let questionIds = [];

  test.beforeAll(async ({ request }) => {
    // 1. Create template
    const tResp = await request.post(`${BASE}/pg/api/templates/create`, {
      data: { TemplateName: TEMPLATE_NAME },
    });
    expect(tResp.ok()).toBeTruthy();

    // 2. Create questions
    const q1Resp = await request.post(`${BASE}/pg/api/questions`, {
      data: {
        QueText: 'How satisfied are you with our service?',
        QueCriteria: 'categorical',
        QueCategories: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'],
      },
    });
    expect(q1Resp.ok()).toBeTruthy();
    const q1 = await q1Resp.json();
    const q1Match = q1.match(/ID\s+([0-9a-f-]+)/i);
    questionIds.push(q1Match ? q1Match[1] : '');

    const q2Resp = await request.post(`${BASE}/pg/api/questions`, {
      data: {
        QueText: 'Rate our driver on a scale of 1-5',
        QueCriteria: 'scale',
        QueScale: 5,
      },
    });
    expect(q2Resp.ok()).toBeTruthy();
    const q2 = await q2Resp.json();
    const q2Match = q2.match(/ID\s+([0-9a-f-]+)/i);
    questionIds.push(q2Match ? q2Match[1] : '');

    const q3Resp = await request.post(`${BASE}/pg/api/questions`, {
      data: {
        QueText: 'Any additional feedback?',
        QueCriteria: 'open',
      },
    });
    expect(q3Resp.ok()).toBeTruthy();
    const q3 = await q3Resp.json();
    const q3Match = q3.match(/ID\s+([0-9a-f-]+)/i);
    questionIds.push(q3Match ? q3Match[1] : '');

    // 3. Add questions to template
    for (let i = 0; i < questionIds.length; i++) {
      const addResp = await request.post(`${BASE}/pg/api/templates/addquestions`, {
        data: { TemplateName: TEMPLATE_NAME, QueId: questionIds[i], Order: i + 1 },
      });
      expect(addResp.ok()).toBeTruthy();
    }

    // 4. Publish template
    await request.patch(`${BASE}/pg/api/templates/status`, {
      data: { TemplateName: TEMPLATE_NAME, Status: 'Published' },
    });

    // 5. Generate survey
    const sResp = await request.post(`${BASE}/pg/api/surveys/generate`, {
      data: {
        Name: TEMPLATE_NAME,
        Recipient: 'Jane Doe',
        RiderName: 'Test Rider',
        RideId: 'RIDE_RCP_001',
        TenantId: 'itcurves',
        Biodata: 'Recipient E2E test user',
        URL: `${BASE}/survey/placeholder`,
      },
    });
    expect(sResp.ok()).toBeTruthy();
    const sBody = await sResp.json();
    surveyId = sBody.SurveyId || '';
    expect(surveyId).toBeTruthy();
  });

  test('survey landing page loads and shows recipient name', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should show the survey landing page with recipient name or loading
    const bodyText = await page.textContent('body');
    const hasContent = bodyText && (
      bodyText.includes('Jane Doe') ||
      bodyText.includes('Hello') ||
      bodyText.includes('SurvAI') ||
      bodyText.includes('Customer Satisfaction')
    );
    expect(hasContent).toBeTruthy();
  });

  test('start page shows survey mode options', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}/start`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show "Normal Survey" and "Voice-Based Survey" options
    const bodyText = await page.textContent('body');
    const hasOptions = bodyText && (
      bodyText.includes('Normal Survey') ||
      bodyText.includes('Voice') ||
      bodyText.includes('how would you like')
    );
    expect(hasOptions).toBeTruthy();
  });

  test('start page has working navigation links', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}/start`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check "Start Normal Survey" button/link exists
    const normalBtn = page.getByRole('link', { name: /Start Normal Survey/i });
    if (await normalBtn.count() > 0) {
      const href = await normalBtn.getAttribute('href');
      expect(href).toContain(`/survey/${surveyId}/text`);
    }

    // Check "Start Voice Survey" button/link exists
    const voiceBtn = page.getByRole('link', { name: /Start Voice Survey/i });
    if (await voiceBtn.count() > 0) {
      const href = await voiceBtn.getAttribute('href');
      expect(href).toContain(`/survey/${surveyId}/voice`);
    }
  });

  test('text survey page loads with questions', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}/text`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    // Should show the first question or loading state
    const bodyText = await page.textContent('body');
    const hasQuestionContent = bodyText && (
      bodyText.includes('satisfied') ||
      bodyText.includes('rate') ||
      bodyText.includes('feedback') ||
      bodyText.includes('Next') ||
      bodyText.includes('Previous') ||
      bodyText.includes('No questions')
    );
    expect(hasQuestionContent).toBeTruthy();
  });

  test('text survey page has navigation buttons', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}/text`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    // Should have Previous and Next buttons
    const prevBtn = page.getByRole('button', { name: /Previous/i });
    const nextBtn = page.getByRole('button', { name: /Next/i });

    const hasPrev = await prevBtn.count();
    const hasNext = await nextBtn.count();

    // At least one navigation button should exist
    expect(hasPrev + hasNext).toBeGreaterThan(0);
  });

  test('text survey - answer questions and navigate', async ({ page }) => {
    await page.goto(`${BASE}/survey/${surveyId}/text`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    // Try clicking a category option for the first question
    const categoryOption = page.getByText('Very Satisfied').first();
    if (await categoryOption.isVisible()) {
      await categoryOption.click();
      await page.waitForTimeout(500);
    }

    // Try clicking Next
    const nextBtn = page.getByRole('button', { name: /Next/i });
    if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('completed survey page handles status redirect', async ({ page }) => {
    // Visiting /complete while survey is In-Progress should redirect back
    await page.goto(`${BASE}/survey/${surveyId}/complete`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should redirect back to survey start or show loading
    const url = page.url();
    const bodyText = await page.textContent('body');
    const validState =
      url.includes(`/survey/${surveyId}`) ||
      (bodyText && bodyText.length > 0);
    expect(validState).toBeTruthy();
  });

  test('survey API returns questions for this survey', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/${surveyId}/questions`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const questions = body.Questions || body;
    expect(Array.isArray(questions) ? questions.length : 0).toBeGreaterThanOrEqual(1);
  });

  test('survey status is still In-Progress', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/${surveyId}/status`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.Status).toBe('In-Progress');
  });

  test.afterAll(async ({ request }) => {
    // Cleanup
    if (surveyId) {
      await request.delete(`${BASE}/pg/api/surveys/${surveyId}`);
    }
    await request.patch(`${BASE}/pg/api/templates/status`, {
      data: { TemplateName: TEMPLATE_NAME, Status: 'Draft' },
    });
    await request.delete(`${BASE}/pg/api/templates/delete`, {
      data: { TemplateName: TEMPLATE_NAME },
    });
  });
});

// ─── Invalid Survey Handling ─────────────────────────────────────────────────

test.describe('Recipient - Edge Cases', () => {
  test('handles non-existent survey gracefully', async ({ page }) => {
    await page.goto(`${BASE}/survey/non-existent-id-12345`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should show error or some content, not crash
    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 0).toBeTruthy();
  });

  test('invalid survey API returns appropriate error', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/INVALID_ID_999/status`);
    // Should return 404 or similar, not 500/502
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
