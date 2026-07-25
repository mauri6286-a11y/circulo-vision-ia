import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Accept': 'application/json'
};

async function inspect() {
  console.log("=== INSPECCIONANDO SUB-CUENTA GHL ===");

  // 1. Pipelines
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`, { headers });
    const data = await res.json();
    console.log("\n--- PIPELINES (Oportunidades) ---");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error obteniendo pipelines:", e.message);
  }

  // 2. Users / Staff
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, { headers });
    const data = await res.json();
    console.log("\n--- USUARIOS / STAFF ---");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error obteniendo usuarios:", e.message);
  }

  // 3. Contacts count
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=5`, { headers });
    const data = await res.json();
    console.log("\n--- CONTACTOS (Muestra) ---");
    console.log(`Total contactos: ${data.meta?.total || 0}`);
    console.log(JSON.stringify(data.contacts || [], null, 2));
  } catch (e) {
    console.error("Error obteniendo contactos:", e.message);
  }
}

inspect();
