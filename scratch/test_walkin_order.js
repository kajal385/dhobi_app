const http = require('http');

const payload = JSON.stringify({
  shop_id: 1,
  customer_name: 'Rahul Sharma',
  customer_mobile: '9876599887',
  society_name: 'Green Valley Homes',
  tower: 'Tower A',
  flat: 'A-203',
  address: 'Flat A-203, Tower A, Green Valley Homes, Baner, Pune',
  pickup_address: 'Flat A-203, Tower A, Green Valley Homes, Baner, Pune',
  delivery_address: 'Flat A-203, Tower A, Green Valley Homes, Baner, Pune',
  total_amount: 450,
  subtotal: 450,
  paid_amount: 450,
  remaining_amount: 0,
  payment_method: 'upi',
  payment_status: 'paid',
  delivery_type: 'Home Delivery',
  due_date: '2 Days',
  due_time: 'Evening',
  is_urgent: false,
  express_sla: false,
  notes: 'Handle with care - steam press shirts',
  items: [
    { name: 'Wash & Iron (KG)', quantity: 3, unit_price: 90, total_price: 270 },
    { name: 'Steam Press (Shirts)', quantity: 4, unit_price: 45, total_price: 180 },
  ],
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/v1/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
    });
  }
);

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(payload);
req.end();
