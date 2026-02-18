// @ts-check
const { test, expect } = require('@playwright/test');

const GATEWAY_URL = 'http://localhost:8080';

const SERVICES = [
  { name: 'Gateway',           url: `${GATEWAY_URL}/health` },
  { name: 'Survey Service',    url: 'http://localhost:8020/health' },
  { name: 'Question Service',  url: 'http://localhost:8030/health' },
  { name: 'Template Service',  url: 'http://localhost:8040/health' },
  { name: 'Brain Service',     url: 'http://localhost:8016/health' },
  { name: 'Voice Service',     url: 'http://localhost:8017/health' },
  { name: 'Agent Service',     url: 'http://localhost:8050/health' },
  { name: 'Analytics Service', url: 'http://localhost:8060/health' },
  { name: 'Scheduler Service', url: 'http://localhost:8070/health' },
];

test.describe('API Health Checks', () => {
  for (const svc of SERVICES) {
    test(`${svc.name} is healthy`, async ({ request }) => {
      const response = await request.get(svc.url);
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe('OK');
    });
  }
});

test.describe('Gateway Routing', () => {
  test('Gateway proxies to Survey Service root', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/`);
    expect(response.ok()).toBeTruthy();
  });

  test('Gateway serves Dashboard (HTML)', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/`);
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('text/html');
  });

  test('Gateway proxies Survey API list', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/surveys/list`);
    expect(response.ok()).toBeTruthy();
  });

  test('Gateway proxies Template API list', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/templates/list`);
    expect(response.ok()).toBeTruthy();
  });

  test('Gateway proxies service health endpoints', async ({ request }) => {
    const healthEndpoints = [
      '/pg/api/surveys/health',
      '/pg/api/questions/health',
      '/pg/api/templates/health',
      '/pg/api/brain/health',
      '/pg/api/voice/health',
      '/pg/api/agent/health',
      '/pg/api/analytics/health',
      '/pg/api/scheduler/health',
    ];
    for (const ep of healthEndpoints) {
      const response = await request.get(`${GATEWAY_URL}${ep}`);
      expect(response.ok(), `${ep} should return 200`).toBeTruthy();
    }
  });

  test('Gateway proxies Template stats', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/templates/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('Total_Templates');
  });

  test('Gateway proxies Survey stats', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/surveys/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('Total_Surveys');
  });

  test('Gateway proxies Analytics health', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/analytics/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('Gateway proxies Scheduler health', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/scheduler/health`);
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('API Data Integrity', () => {
  test('Template list returns array', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/templates/list`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Survey list returns array', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/surveys/list`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Survey stats have correct shape', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/surveys/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('Total_Surveys');
    expect(body).toHaveProperty('Total_Active_Surveys');
    expect(body).toHaveProperty('Total_Completed_Surveys');
    expect(body).toHaveProperty('AverageCSAT');
  });

  test('Template stats have correct shape', async ({ request }) => {
    const response = await request.get(`${GATEWAY_URL}/pg/api/templates/stat`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('Total_Templates');
    expect(body).toHaveProperty('Total_Draft_Templates');
    expect(body).toHaveProperty('Total_Published_Templates');
  });
});
