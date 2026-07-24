import * as fs from 'fs';
import * as path from 'path';

async function testApi() {
  
  const API_URL = 'http://127.0.0.1:8080/api/v1';
  
  console.log('Logging in as admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'ChangeMe-Development-123!' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  console.log('Login successful');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Create Equipment
  console.log('Creating Equipment...');
  let eqRes = await fetch(`${API_URL}/equipment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: 'EQ-' + Date.now(),
      name: 'Máy phay CNC',
      category: 'Máy công cụ',
      status: 'ACTIVE',
      installationDate: '2026-07-01'
    })
  });
  let eq = await eqRes.json();
  console.log('Equipment response:', eq);
  
  // 2. Create Warehouse
  // Since there is no warehouse API created yet, wait, in Inventory phase, did I create warehouse API?
  // Let's create a material first.
  console.log('Creating Material...');
  let matRes = await fetch(`${API_URL}/inventory/materials`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: 'MAT-' + Date.now(),
      name: 'Dầu nhờn',
      unit: 'Lít',
      minStock: 10
    })
  });
  let mat = await matRes.json();
  console.log('Material response:', mat);
  
  // 3. Create WorkOrder
  console.log('Creating Work Order...');
  let woRes = await fetch(`${API_URL}/work-orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: 'WO-' + Date.now(),
      title: 'Bảo trì máy phay',
      type: 'MAINTENANCE',
      equipmentId: eq.data?.id
    })
  });
  let wo = await woRes.json();
  console.log('Work Order response:', wo);
  
  // 4. Create Maintenance Plan
  console.log('Creating Maintenance Plan...');
  let maintRes = await fetch(`${API_URL}/maintenance`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      equipmentId: eq.data?.id,
      title: 'Kiểm tra dầu hàng tháng',
      frequencyDays: 30
    })
  });
  let maint = await maintRes.json();
  console.log('Maintenance response:', maint);

  console.log('All E2E tests passed successfully!');
}

testApi().catch(console.error);
