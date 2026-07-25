import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Accept': 'application/json'
};

async function checkUsers() {
  const res = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, { headers });
  const data = await res.json();
  console.log("USUARIOS EN LA SUBCUENTA:");
  console.log(JSON.stringify(data.users || data, null, 2));
}

checkUsers();
