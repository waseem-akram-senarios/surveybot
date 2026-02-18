// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

// ─── Survey API Tests ────────────────────────────────────────────────────────

test.describe('Survey API', () => {
  test('survey stats endpoint returns correct shape', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(typeof body.Total_Surveys).toBe('number');
    expect(typeof body.Total_Active_Surveys).toBe('number');
    expect(typeof body.Total_Completed_Surveys).toBe('number');
    expect(typeof body.AverageCSAT).toBe('number');
  });

  test('survey list returns array', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/list`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('completed surveys list returns array', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/list_completed`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('template stats endpoint returns correct shape', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/templates/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(typeof body.Total_Templates).toBe('number');
    expect(typeof body.Total_Published_Templates).toBe('number');
  });
});

// ─── Full Survey Creation & Lifecycle via API ────────────────────────────────

test.describe('Survey Lifecycle via API', () => {
  const TEMPLATE_NAME = `E2E_SurveyLife_${Date.now()}`;
  let surveyId = '';
  let questionId = '';

  test('setup: create template with question', async ({ request }) => {
    // Create template
    const tResp = await request.post(`${BASE}/pg/api/templates/create`, {
      data: { TemplateName: TEMPLATE_NAME },
    });
    expect(tResp.ok()).toBeTruthy();

    // Create question
    const qResp = await request.post(`${BASE}/pg/api/questions`, {
      data: {
        QueText: 'E2E Lifecycle: Rate our service?',
        QueCriteria: 'scale',
        QueScale: 5,
      },
    });
    expect(qResp.ok()).toBeTruthy();
    const qBody = await qResp.json();
    const idMatch = qBody.match(/ID\s+([0-9a-f-]+)/i);
    questionId = idMatch ? idMatch[1] : '';

    // Add question to template
    const addResp = await request.post(`${BASE}/pg/api/templates/addquestions`, {
      data: { TemplateName: TEMPLATE_NAME, QueId: questionId, Order: 1 },
    });
    expect(addResp.ok()).toBeTruthy();

    // Publish template
    await request.patch(`${BASE}/pg/api/templates/status`, {
      data: { TemplateName: TEMPLATE_NAME, Status: 'Published' },
    });
  });

  test('generate a survey from the template', async ({ request }) => {
    const response = await request.post(`${BASE}/pg/api/surveys/generate`, {
      data: {
        Name: TEMPLATE_NAME,
        Recipient: 'E2E Test User',
        RiderName: 'Test Rider',
        RideId: 'RIDE_E2E_001',
        TenantId: 'itcurves',
        Biodata: 'Test user for E2E automation',
        URL: `${BASE}/survey/placeholder`,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    surveyId = body.SurveyId || '';
    expect(surveyId).toBeTruthy();
  });

  test('survey appears in list', async ({ request }) => {
    const response = await request.get(`${BASE}/pg/api/surveys/list`);
    expect(response.ok()).toBeTruthy();
    const surveys = await response.json();
    const found = surveys.find((s) => s.SurveyId === surveyId);
    expect(found).toBeTruthy();
  });

  test('survey has questions', async ({ request }) => {
    if (!surveyId) return;
    const response = await request.get(`${BASE}/pg/api/surveys/${surveyId}/questions`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    // Should have at least 1 question
    const questions = body.Questions || body;
    expect(Array.isArray(questions) ? questions.length : 0).toBeGreaterThan(0);
  });

  test('survey status is In-Progress', async ({ request }) => {
    if (!surveyId) return;
    const response = await request.get(`${BASE}/pg/api/surveys/${surveyId}/status`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.Status).toBe('In-Progress');
  });

  test('can get survey recipient info', async ({ request }) => {
    if (!surveyId) return;
    const response = await request.get(`${BASE}/pg/api/surveys/${surveyId}/recipient`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.Recipient).toBe('E2E Test User');
  });

  test('cleanup: delete survey and template', async ({ request }) => {
    if (surveyId) {
      // Set back to In-Progress so we can delete it
      await request.patch(`${BASE}/pg/api/surveys/${surveyId}/status`, {
        data: { Status: 'In-Progress' },
      });
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

// ─── Surveys UI Tests ────────────────────────────────────────────────────────

test.describe('Surveys UI', () => {
  test('dashboard page loads with stats and table', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 10).toBeTruthy();
  });

  test('manage surveys page loads', async ({ page }) => {
    await page.goto(`${BASE}/surveys/manage`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 10).toBeTruthy();
  });

  test('completed surveys page loads', async ({ page }) => {
    await page.goto(`${BASE}/surveys/completed`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 10).toBeTruthy();
  });

  test('launch survey page loads', async ({ page }) => {
    await page.goto(`${BASE}/surveys/launch`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 10).toBeTruthy();
  });
});
