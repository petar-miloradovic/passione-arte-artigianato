const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Twint API credentials (set in environment variables)
const TWINT_CLIENT_ID = process.env.TWINT_CLIENT_ID || 'your_client_id';
const TWINT_CLIENT_SECRET = process.env.TWINT_CLIENT_SECRET || 'your_client_secret';

app.post('/api/orders', (req, res) => {
  try {
    console.log('Received order data:', req.body);
    const data = req.body;
    const csvPath = path.join(__dirname, 'acquisti.csv');

    // Read existing CSV to find max id
    const csv = fs.readFileSync(csvPath, 'utf8');
    console.log('CSV content length:', csv.length);
    const lines = csv.split('\n').filter(l => l.trim());
    console.log('Lines count:', lines.length);
    let maxId = 0;
    if (lines.length > 1) {
      const ids = lines.slice(1).map(l => {
        const cols = l.split(',');
        console.log('Row:', l, 'cols[0]:', cols[0]);
        return parseInt(cols[0]) || 0;
      });
      console.log('Ids:', ids);
      maxId = Math.max(...ids);
    }
    const newId = maxId + 1;
    console.log('New ID:', newId);

    // Format items: titolo;prezzo;qty|...
    const itemsStr = data.items.map(it => `${it.titolo};${it.prezzo};${it.qty}`).join('|');
    console.log('Items str:', itemsStr);

    // Create new row
    const row = [
      newId,
      data.timestamp,
      data.buyer.email,
      data.buyer.nome,
      data.buyer.cognome,
      data.buyer.indirizzo,
      data.buyer.citta,
      data.buyer.cap,
      data.buyer.cantone,
      data.buyer.messaggio,
      itemsStr,
      data.subtotal,
      data.shipping,
      data.total,
      'nuovo'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','); // escape quotes

    console.log('Row to append:', row);

    // Append to CSV
    fs.appendFileSync(csvPath, '\n' + row);

    res.json({ orderNumber: newId });
  } catch (err) {
    console.error('Error in /api/orders:', err);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

app.post('/api/twint/payment-request', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount required' });

    // Get access token
    const tokenRes = await axios.post('https://api.twint.ch/oauth2/token', {
      grant_type: 'client_credentials',
      client_id: TWINT_CLIENT_ID,
      client_secret: TWINT_CLIENT_SECRET
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;

    // Create payment request
    const payRes = await axios.post('https://api.twint.ch/merchant/paymentrequest', {
      amount: amount.toString(),
      currency: 'CHF',
      merchantTransactionReference: `order_${Date.now()}`
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ code: payRes.data.code });
  } catch (err) {
    console.error('Error in /api/twint/payment-request:', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});