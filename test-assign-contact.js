import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

const headers = {
  'Authorization': `Bearer ${token}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const nicoUserId = "Dm9trLIiq2sJmRCsgqrH"; // Nicolas Cejas
const contactId = "Hkx2c9s2d3NQRj4tiaQx"; // Gerardo

async function assignContact() {
  console.log("👤 Probando asignación de contacto a Nicolas Cejas...");
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        assignedTo: nicoUserId
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log("✅ ¡Contacto asignado a Nicolas Cejas exitosamente!");
      console.log(JSON.stringify(data.contact, null, 2));
    } else {
      const err = await res.text();
      console.error("❌ Error asignando contacto:", res.status, err);
    }
  } catch (e) {
    console.error("❌ Error HTTP:", e.message);
  }
}

assignContact();
