import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.PALM_API_KEY;

const NICO_USER_ID = "Dm9trLIiq2sJmRCsgqrH"; // ID de Nico
const PIPELINE_ID = "wyP2TvxIOaDFD6g5jz4s"; // Pipeline de Ventas - Óptica Círculo Visión
const STAGE_NUEVO_LEAD = "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a"; // 1. Nuevo Lead (WhatsApp / Meta)

const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Tu tono es ULTRA NATURAL, BREVE, CÁLIDO Y CONVERSACIONAL.

REGLAS DE ORO DE CONVERSACIÓN (ESTRICTAS):
1. MENSAJES CORTOS: Escribe respuestas breves de máximo 2 a 3 líneas. No satures con información no solicitada.
2. PRIMER SALUDO: Si saluda por primera vez, preséntate brevemente y pregúntale cómo lo puedes ayudar.
   Ej: "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Av. Millán 4494). ¡Qué gusto saludarte! ¿En qué te podemos ayudar hoy?"
3. MARCAS: Si el cliente pregunta qué marcas trabajan o si tienen armazones de marca, explícale que trabajan con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 e internacionales) y pregúntale si busca alguna marca o modelo en particular.
   Ej: "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 e internacionales). ¿Buscas alguna marca o modelo en particular así te confirmo si la tenemos disponible?"
4. CONVENIOS: Si pregunta por convenios, pregúntale a qué mutualista o sindicato pertenece para darle el dato exacto.
   Ej: "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes. ¿A qué convenio o mutualista perteneces tú así te paso el beneficio exacto?"
5. TEST VISUAL: Menciona que el test visual computarizado es 100% GRATIS ÚNICAMENTE cuando el cliente pregunte si hacen examen de vista o cuánto cuesta la revisión.
   Ej: "¡Hola! 😊 Sí, hacemos test visual computarizado en nuestro local de Av. Millán 4494 y es 100% GRATIS y sin compromiso. ¿Te gustaría coordinar un turno?"
6. MULTIFOCALES / CRISTALES: Responde de forma concisa sobre demoras (5 días), garantía (60 días de adaptación) y 12 cuotas sin recargo.
7. TRASPASO A NICO / STAFF: Si consulta por stock de una marca/modelo específico o pide hablar con una persona, dile:
   "¡Con gusto! Te conecto directamente con Nico y el equipo en el local para asesorarte. Aguardame un segundito." e incluye [SOLICITA_HUMANO].
`;

// Respuestas Breves y Contextuales
function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase() : "";

  // Si pregunta específicamente por MARCAS
  if (msg.includes("marca") || msg.includes("modelo") || msg.includes("armazon") || msg.includes("lente de sol") || msg.includes("gafas") || msg.includes("coleccion")) {
    return "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 y marcas internacionales).\n\n" +
      "¿Buscas alguna marca o modelo en particular así te confirmo si la tenemos disponible?";
  }

  // Si pregunta específicamente por el TEST / EXAMEN VISUAL
  if (msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("medir") || msg.includes("vista") || msg.includes("oftalm")) {
    return "¡Hola! 😊 Sí, hacemos test visual computarizado en nuestro local de Av. Millán 4494 y es 100% GRATIS y sin compromiso.\n\n" +
      "¿Te gustaría coordinar un turno para esta semana?";
  }

  // Si pregunta por CONVENIOS
  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes deportivos.\n\n" +
      "¿A qué convenio, mutualista o sindicato perteneces tú así te paso el descuento exacto?";
  }

  // Si pregunta por MULTIFOCALES / CRISTALES / PRECIOS
  if (msg.includes("multifocal") || msg.includes("cristal") || msg.includes("demora") || msg.includes("tiempo") || msg.includes("garantia") || msg.includes("precio") || msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("lente")) {
    return "Nuestros multifocales digitales demoran solo 5 días hábiles y cuentan con 60 días de garantía de adaptación. 👓\n\n" +
      "Además, aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo. ¿Te gustaría coordinar una visita al local?";
  }

  // Si pregunta por HORARIOS O DIRECCIÓN
  if (msg.includes("horario") || msg.includes("donde") || msg.includes("direccion") || msg.includes("abierto") || msg.includes("ubicacion") || msg.includes("millan") || msg.includes("como llego")) {
    return "Estamos ubicados en **Av. Millán 4494** (Montevideo). 📍\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  // Si pide hablar con Nico o atención humana
  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  // Saludo por defecto
  return "¡Hola! 😊 Soy la asistente de Óptica Círculo Visión (Av. Millán 4494). ¡Qué gusto saludarte! ¿En qué te podemos ayudar hoy?";
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

  return getSmartResponse(userMessage);
}

// Verificar si el contacto tiene etiqueta de atención humana
async function isIAHandledByHuman(contactId) {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return false;
    const data = await res.json();
    const tags = data.contact?.tags || [];

    const isPaused = tags.some(t => {
      const lower = t.toLowerCase();
      return lower.includes("humano") || lower.includes("atencion_humana") || lower.includes("pausad") || lower.includes("staff");
    });

    if (isPaused) {
      console.log(`⏸️ IA Pausada para ${contactId} (Etiquetas activas: ${tags.join(', ')})`);
    }
    return isPaused;
  } catch (e) {
    console.error("Error verificando tags de humano:", e.message);
    return false;
  }
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

async function handleWebhook(req, res) {
  console.log("📥 Webhook recibido de GHL:", JSON.stringify(req.body, null, 2));

  const contactId = req.body.contact_id || req.body.contactId || req.body.contact?.id || req.body.id;
  const direction = req.body.direction || req.body.type || "";
  const userId = req.body.userId || req.body.user_id;

  if (direction === 'outbound' || direction === 'outbound-api' || direction === 'Outbound' || userId) {
    console.log(`👤 Mensaje del equipo (Staff) detectado. Pausando IA para el contacto ${contactId}...`);
    if (contactId) {
      await addTagToContact(contactId, "Atencion_Humana");
    }
    return res.status(200).json({ status: "staff_message_detected_ia_paused" });
  }

  if (!contactId) {
    return res.status(200).json({ status: "ignored" });
  }

  const isHumanActive = await isIAHandledByHuman(contactId);
  if (isHumanActive) {
    console.log(`🛑 Mensaje de cliente ignorado por la IA porque Nico/Staff tiene el control.`);
    return res.status(200).json({ status: "paused_human_active" });
  }

  const incomingMessage = typeof req.body.message === 'string' ? req.body.message : (req.body.message?.body || req.body.body || req.body.text || req.body.customData?.message || "");
  const firstName = req.body.first_name || req.body.contact?.first_name || "";
  const lastName = req.body.last_name || req.body.contact?.last_name || "";
  const contactName = `${firstName} ${lastName}`.trim();

  await ensureOpportunityAndAssignToNico(contactId, contactName);

  const aiReply = await generateAIResponse(incomingMessage);

  if (aiReply.includes("[SOLICITA_HUMANO]")) {
    const cleanReply = aiReply.replace("[SOLICITA_HUMANO]", "").trim();
    await sendGHLMessage(contactId, cleanReply);
    await addTagToContact(contactId, "Atencion_Humana");
    return res.json({ status: "handoff_to_human", reply: cleanReply });
  }

  await sendGHLMessage(contactId, aiReply);
  res.json({ status: "success", reply: aiReply });
}

app.post('/webhook/ghl-message', handleWebhook);
app.post('/', handleWebhook);

app.get('/', (req, res) => {
  res.send("🚀 Servidor de Agente IA Óptica Círculo Visión activo 24/7.");
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
