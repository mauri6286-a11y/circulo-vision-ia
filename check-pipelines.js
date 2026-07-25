import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Accept': 'application/json'
};

async function checkPipelines() {
  const res = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`, { headers });
  const data = await res.json();
  console.log("PIPELINES:");
  console.log(JSON.stringify(data, null, 2));
}

checkPipelines();
