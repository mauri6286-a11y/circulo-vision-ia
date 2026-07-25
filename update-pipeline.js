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

const pipelineId = "wyP2TvxIOaDFD6g5jz4s";

const updatedPipeline = {
  name: "Pipeline de Ventas - Óptica Círculo Visión",
  stages: [
    {
      id: "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a",
      name: "1. Nuevo Lead (WhatsApp / Meta)",
      position: 0
    },
    {
      id: "69f05da9-8188-4ff7-9fa5-d3a4d4bcc4a8",
      name: "2. En Conversación",
      position: 1
    },
    {
      id: "7b61706a-cb1f-4dea-8e61-6a556708dc76",
      name: "3. Calificación (Convenios / Receta)",
      position: 2
    },
    {
      id: "a3517455-ab22-4a44-842f-f0bef6326c22",
      name: "4. Turno / Control Agendado",
      position: 3
    },
    {
      id: "1ee9cfbd-9b2f-4bdb-a558-89fb668b32d0",
      name: "5. Visita a Local (Millán 4494)",
      position: 4
    },
    {
      id: "2c1a8b62-c713-482b-b376-2f97044fece9",
      name: "6. Presupuesto / En Seguimiento",
      position: 5
    },
    {
      id: "83d2f80e-4767-444f-b0ed-76c8afe5d624",
      name: "7. Venta Concluida / Entregado",
      position: 6
    },
    {
      id: "1726170e-4443-4d3f-b2c3-046e0006d74c",
      name: "8. En Espera de Retiro",
      position: 7
    },
    {
      id: "0d1854de-f6f7-49b3-9b00-db8b8e7c9656",
      name: "9. Fidelización / Pedir Reseña",
      position: 8
    }
  ]
};

async function updatePipeline() {
  console.log("🔄 Actualizando Pipeline de GHL a Español...");
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines/${pipelineId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedPipeline)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ ¡Pipeline actualizado con éxito!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      const err = await res.text();
      console.error("❌ Error actualizando pipeline:", res.status, err);
    }
  } catch (e) {
    console.error("❌ Error en la llamada HTTP:", e.message);
  }
}

updatePipeline();
