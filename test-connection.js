import dotenv from 'dotenv';
dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

if (!token || token.startsWith('pit-YOUR')) {
  console.error("❌ Error: GHL_PRIVATE_TOKEN no está configurado correctamente en el archivo .env");
  process.exit(1);
}

console.log("🔌 Iniciando prueba de conexión con GHL V2...");

async function testConnection() {
  let url = 'https://services.leadconnectorhq.com/contacts/?limit=1';
  if (locationId && locationId !== 'PONER_AQUI_TU_LOCATION_ID') {
    url += `&locationId=${locationId}`;
  } else {
    console.warn("⚠️ Advertencia: No se detectó un GHL_LOCATION_ID válido. Se intentará consultar contactos globales si el token tiene permisos de agencia, pero puede fallar si es a nivel subcuenta.");
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ ¡Conexión exitosa con GoHighLevel V2!");
      console.log("Resultado obtenido de contactos:", JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.error(`❌ Error en la conexión (Status ${response.status}):`, errorText);
    }
  } catch (error) {
    console.error("❌ Error al realizar la petición HTTP:", error.message);
  }
}

testConnection();
