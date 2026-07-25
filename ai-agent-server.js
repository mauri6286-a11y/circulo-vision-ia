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
Eres la Asistente Virtual Inteligente de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Tu tono es ultra natural, cálido, cercano y empático (estilo uruguayo amable y servicial).

REGLAS DE INTERACCIÓN:
1. PRIMER SALUDO: Cuando el cliente saluda por primera vez (ej: "Hola", "Buenas"), preséntate amigablemente y PREGÚNTALE EN QUÉ LO PUEDES AYUDAR.
2. RESPONDER A LO QUE PREGUNTA EL CLIENTE:
   - CONVENIOS: Explica CJPB (15% efec, 10% débito, 5% crédito), STIQ (20% efec, 15% débito, 5% crédito), Círculo Católico, Evangélico, Ferrocarril Norte, Liga MVD, BPS subsidio, y Gimnasios (Salvaje, Vulcano, Fitlab, Sayago, Racing, Plaza 7).
   - MULTIFOCALES / CRISTALES: Demora ~5 días hábiles, 60 días de garantía de adaptación, test visual 100% GRATIS y 12 cuotas sin recargo.
   - HORARIOS Y DIRECCIÓN: Av. Millán 4494, Lun a Vie 9 a 19 hs, Sáb 9 a 14 hs.
3. TRASPASO A NICO: Si consulta por stock de una marca/modelo específico o pide hablar con una persona, dile:
   "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para asesorarte. Aguardame un segundito." e incluye [SOLICITA_HUMANO].
`;

// Enrutador inteligente de respuestas completas
function getSmartResponse(userMessage) {
  const msg = userMessage.toLowerCase();

  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Hola! 😊 Te cuento que en Óptica Círculo Visión tenemos excelentes convenios activos:\n\n" +
      "👉 **Caja Bancaria (CJPB):** 15% OFF en efectivo, 10% en débito y 5% en crédito.\n" +
      "👉 **Sindicato Químico (STIQ):** 20% OFF en efectivo y 15% en débito.\n" +
      "👉 **Círculo Católico y Hosp. Evangélico:** 15% OFF en efectivo.\n" +
      "👉 **Ferrocarril Norte y Liga MVD:** 10% OFF general.\n" +
      "👉 **BPS:** Tramitamos tu subsidio oficial de lentes de receta.\n\n" +
      "¿Te gustaría agendar tu test visual GRATIS en nuestro local de Av. Millán 4494?";
  }

  if (msg.includes("multifocal") || msg.includes("cristal") || msg.includes("demora") || msg.includes("tiempo") || msg.includes("garantia") || msg.includes("precio") || msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("lente")) {
    return "¡Hola! 😊 Con mucho gusto te cuento sobre nuestros cristales y armazones:\n\n" +
      "👓 **Tiempos de entrega:** Monofocales en ~3 días hábiles y Multifocales Digitales en ~5 días hábiles.\n" +
      "🛡️ **Garantía:** Todos nuestros cristales cuentan con 60 días de garantía de adaptación.\n" +
      "💳 **Formas de pago:** Aceptamos todas las tarjetas de crédito hasta en 12 CUOTAS SIN RECARGO (Compra Ágil, Pago Después).\n" +
      "🩺 **Test Visual:** ¡Es 100% GRATIS en nuestro local de Av. Millán 4494!\n\n" +
      "¿Quieres agendar un turno para esta semana?";
  }

  if (msg.includes("horario") || msg.includes("donde") || msg.includes("direccion") || msg.includes("abierto") || msg.includes("ubicacion") || msg.includes("millan") || msg.includes("como llego")) {
    return "¡Hola! 😊 Estamos ubicados en **Av. Millán 4494** (Montevideo).\n\n" +
      "⏰ **Nuestros horarios de atención son:**\n" +
      "- Lunes a Viernes de 09:00 a 19:00 hs.\n" +
      "- Sábados de 09:00 a 14:00 hs.\n\n" +
      "¡Te esperamos cuando gustes para hacer tu test visual GRATIS!";
  }

  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock") || msg.includes("modelo") || msg.includes("marca")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Av. Millán 4494). ¡Qué gusto saludarte! Te cuento que tu test visual es GRATIS, tenemos convenios con CJPB, BPS, STIQ y hasta 12 cuotas sin recargo. ¿En qué te puedo asesorar hoy?";
}

async function generateAIResponse(userMessage) {
  console.log(`💬 Procesando mensaje entrante: "${userMessage}"`);

  if (GEMINI_API_KEY && GEMINI_API_KEY.length > 20) {
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
        }
      } catch (err) {
        console.error(`Error en ${model}:`, err.message);
      }
    }
  }

  // Fallback Inteligente Adaptativo
  console.log("ℹ️ Usando enrutador inteligente de respuestas para Óptica Círculo Visión.");
  return getSmartResponse(userMessage);
}

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
