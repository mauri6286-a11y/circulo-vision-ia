import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.PALM_API_KEY;

const NICO_USER_ID = "Dm9trLIiq2sJmRCsgqrH"; // ID de Nico
const PIPELINE_ID = "wyP2TvxIOaDFD6g5jz4s"; // Pipeline de Ventas - Óptica Círculo Visión
const STAGE_NUEVO_LEAD = "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a"; // 1. Nuevo Lead (WhatsApp / Meta)

// PROMPT ULTRA NATURAL Y HUMANO PARA ÓPTICA CÍRCULO VISIÓN
const SYSTEM_PROMPT = `
Eres la Asistente Virtual de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Hablas con un tono ultra natural, cercano, cálido, empático y humano (típico de una óptica uruguaya de barrio).

REGLAS DE PRESENTACIÓN Y PERSONALIDAD:
- Preséntate de forma amigable ("¡Hola! 😊 Soy la asistente virtual de Óptica Círculo Visión. ¡Qué gusto saludarte!").
- Usa modismos amables y naturales como "Te cuento que...", "Con mucho gusto te asesoro", "Cualquier duda decime y lo vemos".
- NUNCA uses textos rígidos ni estructurados tipo robot. Escribe como si fueras una compañera de trabajo en la óptica.

CONOCIMIENTO DE LA ÓPTICA:
- Dirección: Av. Millán 4494, Montevideo.
- WhatsApp: 091 478 282.
- Horarios: Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs.
- Examen / Test Visual: ¡Es 100% GRATIS y sin compromiso!
- Demoras: Monofocales ~3 días hábiles. Multifocales digitales ~5 días hábiles.
- Garantía: 60 días de garantía de adaptación en multifocales. 15% OFF en reparaciones y calibración/ajustes sin costo.
- Pagos: Todas las tarjetas de crédito hasta 12 CUOTAS SIN RECARGO (Compra Ágil, Pago Después), efectivo y débito.
- Convenios:
  * Caja Bancaria (CJPB): 15% OFF efectivo, 10% débito, 5% crédito. 5% lentes de contacto.
  * STIQ (Químicos): 20% OFF efectivo, 15% débito, 5% crédito.
  * Círculo Católico y Hosp. Evangélico: 15% OFF efectivo, 10% débito, 5% crédito.
  * Ferrocarril Norte & Liga MVD: 10% OFF general y 5% contactología.
  * BPS: Tramitamos el subsidio oficial de lentes de receta.
  * Deportivos/Gimnasios: CrossFit Salvaje, Vulcano, Fitlab, Club Sayago, Racing Mvd, Plaza 7, Fanacap, Hornex, Molinos, Líbano, Accent, Hument.

TRASPASO A NICO:
Si el cliente pregunta por el precio de una marca/modelo muy específico o quiere hablar con una persona, dile amablemente:
"¡Con gusto! Te conecto directamente con Nico y el equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor." e incluye la palabra [SOLICITA_HUMANO].
`;

async function generateAIResponse(userMessage) {
  if (!GEMINI_API_KEY) {
    return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Av. Millán 4494). ¡Qué gusto saludarte! Te cuento que tenemos tu test visual GRATIS, convenios con CJPB, BPS, STIQ, y hasta 12 cuotas sin recargo. ¿En qué te puedo ayudar hoy?";
  }

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const contents = [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nMensaje del cliente: "${userMessage}"` }] }
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await res.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error(`Error en modelo ${model}:`, err.message);
    }
  }

  return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Millán 4494). ¡Qué alegría saludarte! Te cuento que tu test visual es GRATIS y tenemos excelentes convenios con CJPB, BPS, STIQ y 12 cuotas sin recargo. ¿En qué te puedo asesorar hoy?";
}

// Crear oportunidad y asignar a Nico
async function ensureOpportunityAndAssignToNico(contactId, contactName) {
  try {
    const headers = {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };

    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ assignedTo: NICO_USER_ID })
    });

    await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pipelineId: PIPELINE_ID,
        locationId: GHL_LOCATION_ID,
        name: contactName || "Lead WhatsApp",
        pipelineStageId: STAGE_NUEVO_LEAD,
        status: "open",
        contactId: contactId,
        assignedTo: NICO_USER_ID
      })
    });
  } catch (e) {
    console.error("Error asegurando oportunidad:", e.message);
  }
}

app.post('/webhook/ghl-message', async (req, res) => {
  const { contact_id, first_name, last_name, message, body } = req.body;
  const incomingMessage = message || body || "";
  const contactName = `${first_name || ''} ${last_name || ''}`.trim();

  if (!contact_id || !incomingMessage) {
    return res.status(400).json({ status: "ignored" });
  }

  await ensureOpportunityAndAssignToNico(contact_id, contactName);

  const aiReply = await generateAIResponse(incomingMessage);

  if (aiReply.includes("[SOLICITA_HUMANO]")) {
    const cleanReply = aiReply.replace("[SOLICITA_HUMANO]", "").trim();
    await sendGHLMessage(contact_id, cleanReply);
    await addTagToContact(contact_id, "Atencion_Humana");
    return res.json({ status: "handoff_to_human" });
  }

  await sendGHLMessage(contact_id, aiReply);
  res.json({ status: "success", reply: aiReply });
});

async function sendGHLMessage(contactId, messageText) {
  try {
    await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'WhatsApp',
        contactId: contactId,
        message: messageText
      })
    });
  } catch (e) {
    console.error("Error enviando GHL message:", e.message);
  }
}

async function addTagToContact(contactId, tag) {
  try {
    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags: [tag] })
    });
  } catch (e) {
    console.error("Error agregando tag:", e.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agente IA Círculo Visión (Ultra Natural) listo en puerto ${PORT}`);
});
