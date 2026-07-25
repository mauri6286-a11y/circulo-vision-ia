import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Accept': 'application/json'
};

async function checkCustomFields() {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/customFields`, { headers });
    const data = await res.json();
    console.log("CAMPOS PERSONALIZADOS ACTUALES:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error consultando custom fields:", e.message);
  }
}

checkCustomFields();
