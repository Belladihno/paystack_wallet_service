import { createHmac } from 'crypto';

const WEBHOOK_URL = 'http://localhost:3001/wallet/paystack/webhook'; // your server URL
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error('Set PAYSTACK_SECRET_KEY in your environment');
  process.exit(1);
}

// Mock Paystack webhook payload
const payload = {
  event: 'charge.success',
  data: {
    reference: 'ref_test_123456',
    amount: 5000, // in kobo
    status: 'success',
    id: 12345678,
  },
};

// Convert payload to string
const payloadString = JSON.stringify(payload);

// Generate HMAC signature
const signature = createHmac('sha512', PAYSTACK_SECRET_KEY)
  .update(payloadString)
  .digest('hex');

async function sendWebhook() {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
      },
      body: payloadString,
    });

    const result = await res.json();
    console.log('Webhook test result:', result);
  } catch (err) {
    console.error('Webhook test failed:', err);
  }
}

sendWebhook();
