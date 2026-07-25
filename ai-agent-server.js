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
const DEFAULT_CALENDAR_ID = "r7BEH6BpgfYJ1xJ47G99"; // Calendario Óptica Círculo Visión

const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente y Ejecutiva Comercial de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Tu objetivo es brindar una atención humana, profesional, cálida y de altísima conversión en WhatsApp, Instagram y Facebook.

MANUAL DE EXPERIENCIA CONVERSACIONAL Y VENTAS (100% OPTIMIZADO):

1. SOLICITUD DE MÁS INFORMACIÓN O SALUDO INICIAL:
   - Responde de forma cálida, concisa y comercialmente estratégica.
   - Presenta los beneficios clave (Test Visual Gratis, Convenios CJPB/STIQ/BPS, 12 cuotas sin recargo) y cualifica al cliente.
   - Ejemplo de respuesta:
     "¡Hola! 😊 Con mucho gusto te asesoro. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS, convenios (CJPB, STIQ, BPS) y 12 cuotas sin recargo.

     Para orientarte mejor: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo visual gratis en el local?"

2. SI EL CLIENTE RESPONDE QUE TIENE RECETA:
   - "¡Excelente! 👓 Puedes enviarnos una foto de tu receta por aquí mismo o contarnos qué cristales buscas (Monofocales o Multifocales Digitales), así te pasamos el presupuesto exacto con tu convenio."

3. SOLICITUD DE AGENDAMIENTO / TURNO:
   - El test visual computarizado en Av. Millán 4494 es 100% GRATIS y sin compromiso.
   - Pregúntale al cliente qué días le sirven y preferentemente si le conviene de mañana o de tarde.
   - Ejemplo de respuesta:
     "¡Hola! 😊 Hacemos test visual computarizado en Av. Millán 4494 y es 100% GRATIS y sin compromiso. 🩺

     ¿Qué días te quedan mejor y si preferís de mañana o de tarde, así te coordinamos la agenda?"

4. SI EL CLIENTE RESPONDE SOLO EL TURNO (ej: "Tarde" o "Mañana"):
   - NO LO AGENDES TODAVÍA. Pregúntale el día que le queda mejor.
   - Ejemplo: "¡Genial! 😊 ¿Y qué día de la semana te queda mejor pasar (Lunes a Viernes de 9 a 19 hs o Sábados de 9 a 14 hs) así te reservamos el lugar en el turno tarde?"

5. SI EL CLIENTE RESPONDE SOLO EL DÍA (ej: "Jueves" o "Sábado"):
   - Pregúntale si prefiere turno mañana o tarde.
   - Ejemplo: "¡Bárbaro! 😊 ¿Y prefieres pasar de mañana o de tarde?"

6. CUANDO EL CLIENTE DA EL DÍA Y EL TURNO COMPLETO (ej: "Jueves de tarde", "Sábado de mañana", "El viernes a las 15"):
   - CONFIRMA EL AGENDAMIENTO Y FINALIZA CÁLIDAMENTE:
     "¡Excelente! Quedas agendado/a para tu test visual 100% GRATIS en nuestro local de Av. Millán 4494 (Montevideo). 🩺 Te esperamos con gusto en la sucursal."

7. CONVENIOS Y SUBSIDIOS:
   - Caja Bancaria (CJPB): 15% OFF efectivo. STIQ: 20% OFF efectivo. Círculo Católico / Evangélico: 15% OFF efectivo. BPS: Subsidio oficial.

8. MARCAS Y PRODUCTOS:
   - Más de 50 marcas de armazones. Cristales monofocales (3 días) y Multifocales Digitales (5 días) con 60 días de garantía. 12 cuotas sin recargo.

9. TRASPASO HUMANO A NICO / STAFF:
   - Si piden hablar con alguien o consultar stock: "¡Con gusto! Te conecto con Nico y el equipo en el local. Aguardame un segundito." e incluye [SOLICITA_HUMANO].
`;

function hasFullBookingData(msg) {
  const m = msg.toLowerCase();
  
  const days = ["lunes", "martes", "miercoles", "miércoles", "jueves", "viernes", "sabado", "sábado", "mañana", "hoy"];
  const shifts = ["tarde", "mañana", "manana", "mediodia", "mediodía", "hs", "hora", "horas"];

  const isOnlyShift = (m.trim() === "tarde" || m.trim() === "mañana" || m.trim() === "manana" || m.trim() === "de tarde" || m.trim() === "de mañana");
  if (isOnlyShift) return false;

  const hasDay = days.some(d => m.includes(d));
  const hasShift = shifts.some(s => m.includes(s));

  return hasDay && hasShift;
}

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase().trim() : "";

  if (msg === "tarde" || msg === "de tarde" || msg === "en la tarde") {
    return "¡Genial! 😊 ¿Y qué día de la semana te queda mejor pasar (Lunes a Viernes o Sábados) así te reservamos el lugar en la tarde?";
  }

  if (msg === "mañana" || msg === "manana" || msg === "de mañana" || msg === "de manana" || msg === "en la mañana") {
    return "¡Bárbaro! 😊 ¿Y qué día de la semana te queda mejor pasar (Lunes a Viernes o Sábados) así te reservamos el lugar en la mañana?";
  }

  if (hasFullBookingData(msg)) {
    return "¡Excelente! Quedas agendado/a para tu test visual 100% GRATIS en nuestro local de **Av. Millán 4494** (Montevideo). 🩺\n\n" +
      "Te esperamos con gusto en la sucursal. ¡Cualquier duda estamos a las órdenes!";
  }

  if (msg.includes("agendar") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo")) {
    return "¡Hola! 😊 Hacemos test visual computarizado en **Av. Millán 4494** y es 100% GRATIS y sin compromiso. 🩺\n\n" +
      "¿Qué días te quedan mejor y si preferís de mañana o de tarde, así te coordinamos la agenda?";
  }

  if (msg.includes("info") || msg.includes("informacion") || msg.includes("asesor") || msg.includes("consulta") || msg.includes("detalles") || msg.includes("mas info") || msg.includes("buenas") || msg.includes("hola")) {
    return "¡Hola! 😊 Con mucho gusto te asesoro. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS, convenios (CJPB, STIQ, BPS) y 12 cuotas sin recargo. 👓\n\n" +
      "Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo visual gratis en nuestro local?";
  }

  if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("tengo examen")) {
    return "¡Excelente! 👓 Puedes enviarnos una foto de tu receta por aquí mismo o contarnos qué cristales buscas (Monofocales o Multifocales Digitales), así te pasamos el presupuesto exacto con el beneficio de tu convenio.";
  }

  if (msg.includes("marca") || msg.includes("modelo") || msg.includes("armazon") || msg.includes("lente de sol") || msg.includes("gafas")) {
    return "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Neréa Eyewear, Oahu, Bric à Brac, GX7 e internacionales).\n\n" +
      "¿Buscas alguna marca o modelo en particular así te confirmo disponibilidad?";
  }

  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes deportivos.\n\n" +
      "¿A qué convenio o mutualista perteneces tú así te paso el descuento exacto?";
  }

  if (msg.includes("multifocal") || msg.includes("cristal") || msg.includes("demora") || msg.includes("tiempo") || msg.includes("garantia") || msg.includes("precio") || msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("lente")) {
    return "Nuestros multifocales digitales demoran solo 5 días hábiles y cuentan con 60 días de garantía de adaptación. 👓\n\n" +
      "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo. ¿Te gustaría coordinar una visita al local?";
  }

  if (msg.includes("horario") || msg.includes("donde") || msg.includes("direccion") || msg.includes("abierto") || msg.includes("ubicacion") || msg.includes("millan")) {
    return "Estamos ubicados en **Av. Millán 4494** (Montevideo). 📍\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  return "¡Hola! 😊 Con mucho gusto te asesoro. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS, convenios (CJPB, STIQ, BPS) y 12 cuotas sin recargo. ¿Ya cuentas con tu receta médica o prefieres coordinar un chequeo gratis?";
}

async function generateAIResponse(userMessage) {
  console.log(`💬 Procesando mensaje omnicanal: "${userMessage}"`);

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

async function processAutoBooking(contactId, userMessage) {
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
      console.log(`📅 Oportunidad movida automáticamente a 'Agenda' para ${contactId}`);
    }

    await addTagToContact(contactId, "Turno_Agendado");

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(15, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        calendarId: DEFAULT_CALENDAR_ID,
        locationId: GHL_LOCATION_ID,
        contactId: contactId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        title: "Test Visual Gratis - Óptica Círculo Visión",
        appointmentStatus: "confirmed"
      })
    });
  } catch (e) {
    console.error("Error en proceso de agendamiento:", e.message);
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
      console.log(`⏸️ IA Pausada para ${contactId} (Etiquetas: ${tags.join(', ')})`);
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

  // Detección omnicanal universal por búsqueda de palabras clave en el objeto completo
  const fullBodyStr = JSON.stringify(req.body).toLowerCase();
  let channelType = 'WhatsApp';
  
  if (fullBodyStr.includes("instagram") || fullBodyStr.includes('"ig"') || fullBodyStr.includes("dm de insta")) {
    channelType = 'IG';
  } else if (fullBodyStr.includes("facebook") || fullBodyStr.includes("messenger") || fullBodyStr.includes('"fb"')) {
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

  // Extraer texto o detectar audio entrante de WhatsApp / Instagram
  let incomingMessage = typeof req.body.message === 'string' ? req.body.message : (req.body.message?.body || req.body.body || req.body.text || req.body.customData?.message || "");
  const audioAttachment = req.body.attachments?.[0] || req.body.mediaUrl || req.body.media_url;

  if (!incomingMessage && audioAttachment) {
    console.log("🎙️ Nota de voz / Audio detectado de WhatsApp/Instagram:", audioAttachment);
    incomingMessage = "Hola quisiera información y agendarme para un test visual";
  }

  const firstName = req.body.first_name || req.body.contact?.first_name || "";
  const lastName = req.body.last_name || req.body.contact?.last_name || "";
  const contactName = `${firstName} ${lastName}`.trim();

  await ensureOpportunityAndAssignToNico(contactId, contactName);

  const msgLower = incomingMessage.toLowerCase();
  if (hasFullBookingData(msgLower)) {
    await processAutoBooking(contactId, incomingMessage);
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
  res.send("🚀 Servidor de Agente IA Omnicanal Círculo Visión activo 24/7.");
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
        type: channelType,
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
  console.log(`🚀 Agente IA Omnicanal Círculo Visión listo en puerto ${PORT}`);
});
