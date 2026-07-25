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
const STAGE_NUEVO_LEAD = "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a"; // 1. Nuevo Lead
const STAGE_AGENDA = "1ee9cfbd-9b2f-4bdb-a558-89fb668b32d0"; // 6. Agenda

const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Tu tono es ULTRA NATURAL, BREVE, CÁLIDO Y CONVERSACIONAL.

REGLAS DE ORO DE CONVERSACIÓN (ESTRICTAS):
1. MENSAJES CORTOS: Escribe respuestas breves de máximo 2 a 3 líneas. No satures con información no solicitada.
2. SOLICITUD DE MÁS INFORMACIÓN: Cuando el cliente pida información general (ej: "Quiero más información", "Info", "Más datos"), preséntate amigablemente y PREGÚNTALE DIRECTAMENTE SI TIENE RECETA O SI NECESITA UN CHEQUEO VISUAL GRATIS.
   Ej: "¡Hola! 😊 Con mucho gusto te asesoro. Para avanzar y orientarte mejor: ¿ya cuentas con tu receta médica o necesitas coordinar un chequeo visual gratis en nuestro local de Av. Millán 4494?"
3. AGENDAMIENTO / TURNO: Cuando el cliente solicite agendarse o pida turno para el test visual, explícale que el test visual computarizado en Av. Millán 4494 es 100% GRATIS y sin compromiso, e invítalo a elegir el día y hora que mejor le quede.
   Ej: "¡Hola! 😊 Sí, hacemos test visual computarizado en nuestro local de Av. Millán 4494 y es 100% GRATIS y sin compromiso. ¿Qué día y horario te queda mejor esta semana para agendarte?"
4. MARCAS: Si el cliente pregunta qué marcas trabajan, explícale que trabajan con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 e internacionales) y pregúntale si busca alguna marca o modelo en particular.
5. CONVENIOS: Si pregunta por convenios, pregúntale a qué mutualista o sindicato pertenece para darle el dato exacto.
6. MULTIFOCALES / CRISTALES: Responde de forma concisa sobre demoras (5 días), garantía (60 días de adaptación) y 12 cuotas sin recargo.
7. TRASPASO A NICO / STAFF: Si consulta por stock de una marca/modelo específico o pide hablar con una persona, dile:
   "¡Con gusto! Te conecto directamente con Nico y el equipo en el local para asesorarte. Aguardame un segundito." e incluye [SOLICITA_HUMANO].
`;

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase() : "";

  if (msg.includes("info") || msg.includes("informacion") || msg.includes("asesor") || msg.includes("consulta") || msg.includes("detalles") || msg.includes("mas info")) {
    return "¡Hola! 😊 Con mucho gusto te asesoro.\n\n" +
      "Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o necesitas coordinar un chequeo visual gratis en nuestro local de Av. Millán 4494?";
  }

  if (msg.includes("agendar") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("medir") || msg.includes("vista")) {
    return "¡Hola! 😊 Sí, hacemos test visual computarizado en nuestro local de Av. Millán 4494 y es 100% GRATIS y sin compromiso. 🩺\n\n" +
      "¿Qué día y horario te queda más cómodo esta semana para reservarte el turno?";
  }

  if (msg.includes("marca") || msg.includes("modelo") || msg.includes("armazon") || msg.includes("lente de sol") || msg.includes("gafas")) {
    return "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 y marcas internacionales).\n\n" +
      "¿Buscas alguna marca o modelo en particular así te confirmo si la tenemos disponible?";
  }

  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes deportivos.\n\n" +
      "¿A qué convenio, mutualista o sindicato perteneces tú así te paso el descuento exacto?";
  }

  if (msg.includes("multifocal") || msg.includes("cristal") || msg.includes("demora") || msg.includes("tiempo") || msg.includes("garantia") || msg.includes("precio") || msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("lente")) {
    return "Nuestros multifocales digitales demoran solo 5 días hábiles y cuentan con 60 días de garantía de adaptación. 👓\n\n" +
      "Además, aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo. ¿Te gustaría coordinar una visita al local?";
  }

  if (msg.includes("horario") || msg.includes("donde") || msg.includes("direccion") || msg.includes("abierto") || msg.includes("ubicacion") || msg.includes("millan") || msg.includes("como llego")) {
    return "Estamos ubicados en **Av. Millán 4494** (Montevideo). 📍\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  return "¡Hola! 😊 Con mucho gusto te asesoro. Para ayudarte mejor: ¿ya tienes tu receta médica o necesitas coordinar un chequeo visual gratis en el local de Av. Millán 4494?";
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

async function moveOpportunityToAgenda(contactId) {
  try {
    const headers = {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };

    const searchRes = await fetch(`https://services.leadconnectorhq.com/opportunities/search?locationId=${GHL_LOCATION_ID}&contact_id=${contactId}`, { headers });
    const searchData = await searchRes.json();

    const opportunity = searchData.opportunities?.[0];

    if (opportunity) {
      await fetch(`https://services.leadconnectorhq.com/opportunities/${opportunity.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          pipelineStageId: STAGE_AGENDA
        })
      });
      console.log(`📅 Oportunidad movida automáticamente a la etapa 'Agenda' para el contacto ${contactId}`);
    }
  } catch (e) {
    console.error("Error moviendo oportunidad a Agenda:", e.message);
  }
}

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
        name: contactName || "Lead",
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

  // Detección dinámica del canal (WhatsApp vs Instagram vs Facebook)
  let channelType = 'WhatsApp';
  const rawChannel = (req.body.channel || req.body.message_type || req.body.type || req.body.provider || "").toLowerCase();
  
  if (rawChannel.includes("instagram") || rawChannel.includes("ig")) {
    channelType = 'Instagram';
  } else if (rawChannel.includes("fb") || rawChannel.includes("facebook") || rawChannel.includes("messenger")) {
    channelType = 'FB';
  }

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

  const msgLower = incomingMessage.toLowerCase();
  if (msgLower.includes("agendar") || msgLower.includes("turno") || msgLower.includes("reserva")) {
    await moveOpportunityToAgenda(contactId);
  }

  const aiReply = await generateAIResponse(incomingMessage);

  if (aiReply.includes("[SOLICITA_HUMANO]")) {
    const cleanReply = aiReply.replace("[SOLICITA_HUMANO]", "").trim();
    await sendGHLMessage(contactId, cleanReply, channelType);
    await addTagToContact(contactId, "Atencion_Humana");
    return res.json({ status: "handoff_to_human", reply: cleanReply });
  }

  await sendGHLMessage(contactId, aiReply, channelType);
  res.json({ status: "success", channel: channelType, reply: aiReply });
}

app.post('/webhook/ghl-message', handleWebhook);
app.post('/', handleWebhook);

app.get('/', (req, res) => {
  res.send("🚀 Servidor de Agente IA Óptica Círculo Visión activo 24/7.");
});

async function sendGHLMessage(contactId, messageText, channelType = 'WhatsApp') {
  console.log(`📤 Enviando respuesta por el canal [${channelType}] a ${contactId}...`);
  try {
    const res = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: channelType, // 'WhatsApp' | 'Instagram' | 'FB'
        contactId: contactId,
        message: messageText
      })
    });
    if (res.ok) {
      console.log(`✅ Mensaje enviado exitosamente por [${channelType}] a ${contactId}`);
    } else {
      const err = await res.text();
      console.error(`❌ Error respuesta GHL API (${res.status}):`, err);
    }
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
