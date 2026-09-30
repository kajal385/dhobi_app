const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- STARTING LAUNDRY OWNER REGISTRATION & ADMIN VERIFICATION TEST ---');

  // Step 1: Register Laundry Shop
  const regPayload = {
    name: 'Sparkle Fresh Laundry',
    owner_name: 'Vikram Shinde',
    phone: '9812344556',
    address: 'Shop 12, Sunrise Plaza, Wakad Road, Pune 411057',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    latitude: 18.5987,
    longitude: 73.7654,
    gst_number: '27XYZAB1234C1Z9',
    bank_name: 'ICICI Bank',
    bank_account: '623901554433',
    ifsc_code: 'ICIC0006239',
  };

  const regRes = await makeRequest(
    {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/v1/owner/register-shop',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    regPayload
  );

  console.log('\n1. Laundry Shop Registration Response:');
  console.log('Status:', regRes.status);
  console.log('Shop ID:', regRes.data?.data?.id);
  console.log('Verification Status:', regRes.data?.data?.verification_status);
  console.log('Is Verified:', regRes.data?.data?.is_verified);

  const shopId = regRes.data?.data?.id;

  // Step 2: Upload Documents
  if (shopId) {
    const docPayload = {
      shop_id: shopId,
      document_type: 'GST_AND_GUMASTA_CERTIFICATE',
      document_number: '27XYZAB1234C1Z9',
      file_path: 'https://dhobipro.com/docs/gst_sparkle_fresh.pdf',
    };

    const docRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 8000,
        path: '/api/v1/owner/documents',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      docPayload
    );

    console.log('\n2. Document Upload Response:');
    console.log('Status:', docRes.status);
    console.log('Document ID:', docRes.data?.data?.id);
  }

  // Step 3: Admin Web Panel Fetches Verification Queue
  const queueRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/v1/admin/verifications?status=pending',
    method: 'GET',
  });

  console.log('\n3. Admin Verification Queue Response:');
  console.log('Status:', queueRes.status);
  console.log('Pending Queue Count:', Array.isArray(queueRes.data) ? queueRes.data.length : 'N/A');

  // Step 4: Admin Approves Laundry Shop
  if (shopId) {
    const approveRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8000,
      path: `/api/v1/admin/verifications/${shopId}/approve`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('\n4. Admin Approval Response:');
    console.log('Status:', approveRes.status);
    console.log('Approval Message:', approveRes.data?.message);
    console.log('Updated Verification Status:', approveRes.data?.data?.verification_status);
    console.log('Updated Is Verified:', approveRes.data?.data?.is_verified);
  }

  // Step 5: Customer App Fetches Live Shops List
  const shopsRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/v1/shops',
    method: 'GET',
  });

  console.log('\n5. Customer App Live Approved Shops Response:');
  console.log('Status:', shopsRes.status);
  const items = shopsRes.data?.data?.data || shopsRes.data?.data;
  console.log('Available Live Approved Shops Count:', Array.isArray(items) ? items.length : 0);
  if (Array.isArray(items) && items.length > 0) {
    console.log('Newly Approved Shop Listed in Customer App:', items[items.length - 1].name, '📍', items[items.length - 1].address);
  }
}

runTest();
