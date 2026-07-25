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

async function createCustomField() {
  console.log("➕ Creando campo personalizado 'Fecha de Nacimiento' en GHL...");
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/customFields`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: "Fecha de Nacimiento",
        dataType: "DATE",
        placeholder: "Seleccionar fecha de nacimiento"
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log("✅ ¡Campo 'Fecha de Nacimiento' creado con éxito en GHL!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      const err = await res.text();
      console.error("❌ Error creando campo:", res.status, err);
    }
  } catch (e) {
    console.error("❌ Error en la petición HTTP:", e.message);
  }
}

createCustomField();
