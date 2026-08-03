import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Accept': 'application/json'
};

async function testEndpoints() {
  const endpoints = [
    `https://services.leadconnectorhq.com/snippets?locationId=${locationId}`,
    `https://services.leadconnectorhq.com/conversations/snippets?locationId=${locationId}`,
    `https://services.leadconnectorhq.com/locations/${locationId}/snippets`,
    `https://services.leadconnectorhq.com/templates?locationId=${locationId}`,
    `https://services.leadconnectorhq.com/conversations/templates?locationId=${locationId}`
  ];

  for (const url of endpoints) {
    console.log("Probando:", url);
    const res = await fetch(url, { headers });
    console.log("Status:", res.status, await res.text());
  }
}

testEndpoints();