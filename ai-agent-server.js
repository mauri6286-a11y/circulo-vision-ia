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
Atiendes clientes de WhatsApp, Instagram y Facebook. Tu estilo es 100% uruguayo, empático, profesional y natural.

CONOCIMIENTO COMERCIAL Y MANUAL DE RESPUESTA:

1. SALUDO INICIAL Y SOLICITUD DE INFORMACIÓN:
   - Sé breve (2 a 3 líneas).
   - Preséntate amigablemente y avanza preguntándole si cuenta con receta médica o si necesita coordinar un chequeo visual gratis.
   - Ejemplo: "¡Hola! 😊 Con mucho gusto te asesoro. Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o necesitas coordinar un chequeo visual gratis en nuestro local de Av. Millán 4494?"

2. AGENDAMIENTO AUTÓNOMO DE TEST VISUAL:
   - El test visual computarizado en Av. Millán 4494 es 100% GRATIS y sin compromiso.
   - Si el cliente da un día o hora (ej: "jueves a las 15", "mañana de tarde", "el sábado a las 10"):
     Confirma con entusiasmo: "¡Excelente! Quedas agendado/a para tu test visual 100% GRATIS en nuestro local de Av. Millán 4494. Te esperamos con gusto en la sucursal. 🩺 ¡Muchas gracias!"

3. CONVENIOS Y SUBSIDIOS COMERCIALES:
   - Caja Bancaria (CJPB): 15% OFF efectivo, 10% débito, 5% crédito.
   - Sindicato Químico (STIQ): 20% OFF efectivo, 15% débito, 5% crédito.
   - Círculo Católico / Hosp. Evangélico: 15% OFF efectivo.
   - Ferrocarril Norte / Liga MVD / Gimnasios (Salvaje, Vulcano, Fitlab, Sayago, Racing, Plaza 7): 10% a 15% OFF.
   - BPS: Tramitamos el 100% del subsidio oficial de lentes de receta.

4. MARCAS Y PRODUCTOS:
   - Más de 50 marcas de primer nivel (Neréa Eyewear, Oahu, Bric à Brac, GX7 e internacionales). Pregunta si busca algún modelo particular.
   - Cristales monofocales (~3 días hábiles) y Multifocales Digitales (~5 días hábiles).
   - 60 días de garantía de adaptación en multifocales.
   - Pago: 12 CUOTAS SIN RECARGO con todas las tarjetas de crédito.

5. HORARIOS Y UBICACIÓN:
   - Dirección: Av. Millán 4494 (Montevideo).
   - Horarios: Lunes a Viernes de 09:00 a 19:00 hs, Sábados de 09:00 a 14:00 hs.

6. TRASPASO HUMANO A NICO / STAFF:
   - Si piden hablar con una persona o stock específico: "¡Con gusto! Te conecto con Nico y el equipo en el local. Aguardame un segundito." e incluye [SOLICITA_HUMANO].
`;

// Detector Inteligente de Fechas
function isBookingConfirmation(msg) {
  const m = msg.toLowerCase();
  const dateWords = ["lunes", "martes", "miercoles", "miércoles", "jueves", "viernes", "sabado", "sábado", "mañana", "hoy", "hs", "hora", "horas", ":00", "am", "pm", "tarde"];
  const actionWords = ["agendar", "turno", "reserva", "quiero", "voy", "puedo", "confirmo", "paso"];
  
  return dateWords.some(w => m.includes(w)) && actionWords.some(w => m.includes(w));
}

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase() : "";

  if (isBookingConfirmation(msg)) {
    return "¡Excelente! Quedas agendado/a para tu test visual 100% GRATIS en nuestro local de **Av. Millán 4494** (Montevideo). 🩺\n\n" +
      "Te esperamos con gusto en la sucursal. ¡Cualquier duda estamos a las órdenes!";
  }

  if (msg.includes("agendar") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo")) {
    return "¡Hola! 😊 Hacemos test visual computarizado en **Av. Millán 4494** y es 100% GRATIS y sin compromiso. 🩺\n\n" +
      "¿Qué día y horario te queda más cómodo esta semana para reservarte el turno?";
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

  return "¡Hola! 😊 Con mucho gusto te asesoro. Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o necesitas coordinar un chequeo visual gratis en nuestro local de Av. Millán 4494?";
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

  // Detección dinámica del canal (WhatsApp vs Instagram ('IG') vs Facebook ('FB'))
  let channelType = 'WhatsApp';
  const rawChannel = (req.body.channel || req.body.message_type || req.body.type || req.body.provider || "").toLowerCase();
  
  if (rawChannel.includes("instagram") || rawChannel.includes("ig")) {
    channelType = 'IG';
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
  if (isBookingConfirmation(msgLower) || msgLower.includes("agendar") || msgLower.includes("turno")) {
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
