const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    }).on('error', reject);
  });
}

async function checkOrders() {
  console.log('--- CHECKING DATABASE ORDERS IN DHOBI_DB ---');
  try {
    const ownerRes = await fetchUrl('http://127.0.0.1:8000/api/v1/owner/orders?shop_id=1');
    console.log('Owner Orders Endpoint Response Status:', ownerRes.status);
    console.log('Total Owner Orders Count:', Array.isArray(ownerRes.data.data) ? ownerRes.data.data.length : 0);
    console.log('Owner Orders Sample Data:', JSON.stringify(ownerRes.data.data, null, 2));

    const custRes = await fetchUrl('http://127.0.0.1:8000/api/v1/orders');
    console.log('\nCustomer Orders Endpoint Response Status:', custRes.status);
    console.log('Customer Orders:', JSON.stringify(custRes.data, null, 2));

    const adminOrdersRes = await fetchUrl('http://127.0.0.1:8000/api/v1/admin/orders');
    console.log('\nAdmin Orders:', JSON.stringify(adminOrdersRes.data, null, 2));

    const adminStatsRes = await fetchUrl('http://127.0.0.1:8000/api/v1/admin/stats');
    console.log('\nAdmin Stats:', JSON.stringify(adminStatsRes.data, null, 2));
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
}

checkOrders();
