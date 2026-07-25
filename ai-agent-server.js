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

const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente de Óptica Círculo Visión en Montevideo (Av. Millán 4494).
Tu tono es ultra natural, cálido, cercano y empático (estilo uruguayo amable y servicial).

REGLAS DE INTERACCIÓN OBLIGATORIAS:
1. PRIMER SALUDO: Cuando el cliente saluda por primera vez (ej: "Hola", "Buenas"), preséntate con calidez y PREGÚNTALE EN QUÉ LO PUEDES AYUDAR HOY. NO le tires toda la lista de convenios de entrada.
   Ejemplo: "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión. ¡Qué gusto saludarte! ¿En qué te puedo asesorar hoy?"

2. RESPONDER ÚNICAMENTE A LO QUE PREGUNTE EL CLIENTE:
   - Si pregunta por CONVENIOS: Explícale amablemente los convenios (CJPB 15% efectivo, STIQ 20% efectivo, Círculo Católico, Evangélico, BPS, Ferrocarril Norte, etc.).
   - Si pregunta por MULTIFOCALES O CRISTALES: Explícale la demora (~5 días), la garantía de 60 días de adaptación, que el test visual es GRATIS en el local y las 12 cuotas sin recargo.
   - Si pregunta por HORARIOS Y DIRECCIÓN: Av. Millán 4494, Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs.

3. TRASPASO A NICO / ATENCIÓN HUMANA:
   Si el cliente consulta por stock exacto de una marca o modelo específico, reclama un pedido o solicita hablar con una persona, dile:
   "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor." e incluye la palabra [SOLICITA_HUMANO].

DATOS OFICIALES:
- Dirección: Av. Millán 4494, Montevideo.
- WhatsApp: 091 478 282.
- Horarios: Lun a Vie 09:00 a 19:00 hs, Sáb 09:00 a 14:00 hs.
- Examen Visual: 100% GRATIS.
- Cuotas: Hasta 12 cuotas sin recargo con todas las tarjetas.
- Convenios: CJPB (15% efec, 10% débito, 5% crédito), STIQ (20% efec, 15% débito, 5% crédito), Círculo Católico y Hosp. Evangélico (15% efec), Ferrocarril Norte & Liga MVD (10% desc), BPS (subsidio completo), Gimnasios (Salvaje, Vulcano, Fitlab, Club Sayago, Racing, Plaza 7).
`;

async function generateAIResponse(userMessage) {
  console.log(`💬 Procesando mensaje entrante: "${userMessage}"`);

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ ALERTA: GEMINI_API_KEY no está presente en las variables de entorno.");
    return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Av. Millán 4494). ¡Qué gusto saludarte! ¿En qué te puedo asesorar hoy?";
  }

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nMensaje del cliente: "${userMessage}"` }] }]
        })
      });

      const data = await res.json();

      if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const replyText = data.candidates[0].content.parts[0].text.trim();
        console.log(`🤖 Respuesta Gemini exitosa (${model}):`, replyText);
        return replyText;
      } else {
        console.error(`⚠️ API Error en ${model}:`, JSON.stringify(data));
      }
    } catch (err) {
      console.error(`❌ Excepción en ${model}:`, err.message);
    }
  }

  return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión. ¡Qué gusto saludarte! ¿En qué te podemos ayudar hoy?";
}

// Endpoint de prueba directa en el navegador con Debug info
app.get('/test-gemini', async (req, res) => {
  const query = req.query.q || "Tienen convenio con caja bancaria";
  
  let debug = [];
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY ? GEMINI_API_KEY.trim() : ''}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Responde directamente: "${query}"` }] }]
        })
      });
      const data = await r.json();
      debug.push({ model, status: r.status, data });
    } catch (e) {
      debug.push({ model, error: e.message });
    }
  }

  res.json({
    query,
    keyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
    keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'FALTANTE',
    debug
  });
});

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
  console.log(`🚀 Agente IA Círculo Visión listo en puerto ${PORT}`);
});
