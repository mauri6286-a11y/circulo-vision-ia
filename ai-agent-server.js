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
const DEFAULT_CALENDAR_ID = "pZ1yR94gS7442E098hEW"; // Calendario de la Optica (ACTIVO)

const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente y Ejecutiva Comercial de Óptica Círculo Visión (Av. Millán 4494, Montevideo).
Tu estilo es ULTRA NATURAL, CÁLIDO, COMPRENSIVO, URUGUAYO Y DIRECTO.

REGLAS DE INTELIGENCIA DE DIÁLOGO:
1. SI EL CLIENTE EXPRESA INTERÉS EN LA PROMO O PRODUCTO (ej: "Buen día. Estoy interesado en la promoción? Gracias"):
   - AUNQUE EL MENSAJE INCLUYA LA PALABRA 'GRACIAS', PRIORIZA SIEMPRE RESPONDER A SU INTERÉS EN LA PROMOTIÓN.
   - Ejemplo: "¡Hola! 😊 Con mucho gusto te pasamos toda la información de la promo. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS. ¿Ya cuentas con tu receta médica o te gustaría coordinar un chequeo gratis en el local?"
2. DESPEDIDAS / SALUDOS FINALES ("Gracias. Igualmente Saludos", "Igualmente", "Chau"):
   - Si el cliente responde un saludo final, responde de forma corta, distinta y empática (SIN REPETIR LO MISMO).
   - Ejemplo: "¡Muchas gracias a ti! 👋 ¡Saludos y que tengas un excelente día!"
3. CONVENIOS Y CUOTAS: NUNCA MENCIONES CONVENIOS NI CUOTAS A MENOS QUE EL CLIENTE PREGUNTE EXPLÍCITAMENTE POR ELLOS.

LISTADO OFICIAL DE CRISTALES Y PRECIOS:
1. Blanco ($1.300): Opción básica estándar.
2. Antireflejo ($2.200): Quita destellos molestos de luces.
3. Antireflejo + Blueblocker ($3.200): Antireflejo + filtro de luz azul de pantallas.
4. Gx7 Premium Antireflejo ($5.200): Ultra liviano, delgado e irrompible.
5. Gx7 Premium Antireflejo + Blueblocker ($5.990): Protección total contra luz azul.
`;

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase().trim() : "";

  // 1. Detección PRIORITARIA de Interés en Promociones / Productos (incluso si incluye cortesía como "gracias")
  if (msg.includes("interesad") || msg.includes("interesado") || msg.includes("interesada") || msg.includes("promo") || msg.includes("promocion") || msg.includes("promoción")) {
    return "¡Hola! 😊 Con mucho gusto te asesoro sobre la promo. En Óptica Círculo Visión (**Av. Millán 4494**) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
      "Para ayudarte a avanzar: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en nuestro local?";
  }

  // 2. Detección de Despedidas Secundarias ("Igualmente", "Saludos", "Gracias igualmente")
  if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
    return "¡Muchas gracias a ti! 👋 ¡Saludos y que tengas una hermosa jornada!";
  }

  // 3. Detección de Agradecimientos directos
  if (msg === "gracias" || msg === "muchas gracias" || msg === "buenisimo" || msg === "buenísimo" || msg === "impecable" || msg === "dale barbaro" || msg === "dale bárbaro") {
    return "¡Por nada! 😊 Quedamos a las órdenes por cualquier duda o consulta. ¡Que tengas un excelente día!";
  }

  // 4. Detección de DUDAS, POSTERGACIONES o AVISOS FUTUROS ("no sé si voy", "te escribo la semana que viene", "te aviso")
  const hesitationWords = ["no se", "no sé", "no se bien", "no sé bien", "te aviso", "te escribo", "aun no", "aún no", "todavia no", "todavía no", "la semana que viene", "después aviso", "despues aviso", "capaz"];
  if (hesitationWords.some(w => msg.includes(w))) {
    return "¡Perfecto! 😊 No hay ningún problema. Escríbenos en cuanto sepas qué día te conviene pasar y con mucho gusto te reservamos la agenda. ¡Quedamos a las órdenes y que tengas un excelente día!";
  }

  // 5. Detección directa de UBICACIÓN / MONTEVIDEO / DÓNDE ESTÁN
  if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
    return "¡Sí, exactamente en Montevideo! 📍 Estamos en **Av. Millán 4494** (zona Sayago/Aires Puros, entre Loreto Gomensoro y Reyes).\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¿Ya cuentas con tu receta médica o prefieres agendar un chequeo gratis?";
  }

  // 6. Detección de Anuncios de Meta / Instagram / FB (Source URL / Headline / Promo)
  if (msg.includes("source url") || msg.includes("headline") || msg.includes("fb.me") || msg.includes("instagram.com/p/")) {
    return "¡Hola! 😊 Veo que nos escribes por nuestra promo activa por tiempo limitado. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
      "Para pasarte la información exacta de la promo: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?";
  }

  // 7. Marcas Específicas / Varilux / Zeiss / High-End
  if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor")) {
    return "¡Hola! 😊 Los multifocales Varilux Physio son una excelente opción de alta gama en cristales digitales. 👓\n\n" +
      "El precio exacto depende de la graduación específica de tu receta (y si requieres filtros antireflejantes o fotocromáticos).\n\n" +
      "¿Tienes la foto de tu receta a mano así te pasamos la cotización exacta o te conecto directamente con Nico para asesorarte?";
  }

  // 8. Precios / Consulta de Cristales Monofocales o Multifocales
  if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cristal") || msg.includes("precios")) {
    return "¡Hola! 😊 Contamos con opciones de cristales para cada necesidad:\n\n" +
      "1. Blanco ($1.300): Opción básica estándar.\n" +
      "2. Antireflejo ($2.200): Quita destellos molestos de luces.\n" +
      "3. Antireflejo + Blueblocker ($3.200): Antireflejo + filtro de luz azul de pantallas.\n" +
      "4. Gx7 Premium Antireflejo ($5.200): Ultra liviano, delgado e irrompible.\n" +
      "5. Gx7 Premium Antireflejo + Blueblocker ($5.990): Protección total y máxima estética.\n\n" +
      "¿Tienes la foto de tu receta a mano así te pasamos el presupuesto exacto o prefieres agendar un chequeo gratis?";
  }

  // 9. Respuesta a Turno Solo ("tarde" o "mañana")
  if (msg === "tarde" || msg === "de tarde" || msg === "en la tarde") {
    return "¡Genial! 😊 ¿Y qué día de esta semana te queda mejor pasar (Lunes a Viernes o Sábados) así te reservamos el lugar en la tarde?";
  }

  if (msg === "mañana" || msg === "manana" || msg === "de mañana" || msg === "de manana" || msg === "en la mañana") {
    return "¡Bárbaro! 😊 ¿Y qué día de esta semana te queda mejor pasar (Lunes a Viernes o Sábados) así te reservamos el lugar en la mañana?";
  }

  // 10. Respuesta a Día de la Semana ("Miércoles", "Jueves", etc.)
  const daysList = ["lunes", "martes", "miercoles", "miércoles", "jueves", "viernes", "sabado", "sábado"];
  if (daysList.some(d => msg.includes(d))) {
    return "¡Excelente! Quedas agendado/a para tu test visual 100% GRATIS en nuestro local de **Av. Millán 4494** (Montevideo). 🩺\n\n" +
      "Te esperamos con gusto en la sucursal. ¡Cualquier duda estamos a las órdenes!";
  }

  // 11. Si el cliente dice que TIENE RECETA
  if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("tengo examen")) {
    return "¡Excelente! 👓 Puedes enviarnos una foto de tu receta por aquí mismo o contarnos qué cristales buscas (Monofocales o Multifocales Digitales), así te pasamos el presupuesto exacto.";
  }

  // 12. SOLO si el cliente pregunta EXPLÍCITAMENTE por cuotas o tarjetas de crédito
  if (msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("pago") || msg.includes("credito") || msg.includes("crédito") || msg.includes("debito") || msg.includes("débito") || msg.includes("financiar")) {
    return "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo, así como también tarjetas de débito y efectivo. 💳\n\n" +
      "¿Te gustaría agendar una visita o consultar el presupuesto de tus lentes?";
  }

  // 13. SOLO si el cliente pregunta EXPLÍCITAMENTE por convenios
  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes deportivos.\n\n" +
      "¿A qué convenio o mutualista perteneces tú así te paso el descuento exacto?";
  }

  // 14. Agendamiento / Turnos
  if (msg.includes("agendar") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo")) {
    return "¡Hola! 😊 Hacemos test visual computarizado en **Av. Millán 4494** y es 100% GRATIS y sin compromiso. 🩺\n\n" +
      "¿Qué días te quedan mejor y si preferís de mañana o de tarde, así te coordinamos la agenda?";
  }

  // 15. Marcas
  if (msg.includes("marca") || msg.includes("modelo") || msg.includes("armazon") || msg.includes("lente de sol") || msg.includes("gafas")) {
    return "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Oahu, Bric à Brac, GX7 e internacionales).\n\n" +
      "¿Buscas alguna marca o modelo en particular así te confirmo disponibilidad?";
  }

  // 16. Horarios
  if (msg.includes("horario") || msg.includes("abierto")) {
    return "Estamos ubicados en **Av. Millán 4494** (Montevideo). 📍\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  // 17. Traspaso Humano
  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  // 18. Información General / Saludo
  return "¡Hola! 😊 Con mucho gusto te asesoro. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
    "Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo visual gratis en nuestro local?";
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
    const msgLower = userMessage.toLowerCase();
    const hesitationWords = ["no se", "no sé", "no se bien", "no sé bien", "te aviso", "te escribo", "aun no", "aún no", "todavia no", "todavía no", "la semana que viene", "después aviso", "despues aviso", "capaz"];
    
    if (hesitationWords.some(w => msgLower.includes(w))) {
      console.log("🛑 Agendamiento cancelado porque el cliente expresó duda o postergación.");
      return;
    }

    const headers = {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };

    const searchRes = await fetch(`https://services.leadconnectorhq.com/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=50`, { headers });
    const searchData = await searchRes.json();
    
    const opp = searchData.opportunities?.find(o => (o.contact?.id === contactId || o.contactId === contactId));

    if (opp) {
      await fetch(`https://services.leadconnectorhq.com/opportunities/${opp.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          pipelineId: PIPELINE_ID,
          pipelineStageId: STAGE_AGENDA,
          name: opp.name || "Lead Agendado",
          status: "open"
        })
      });
      console.log(`📅 Oportunidad ID ${opp.id} (${opp.name}) movida exitosamente a 'Agenda'`);
    }

    await addTagToContact(contactId, "Turno_Agendado");

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).getTime();

    let chosenStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    chosenStartTime.setHours(15, 0, 0, 0);

    try {
      const freeSlotsRes = await fetch(`https://services.leadconnectorhq.com/calendars/${DEFAULT_CALENDAR_ID}/free-slots?startDate=${startDate}&endDate=${endDate}`, { headers });
      const freeSlotsData = await freeSlotsRes.json();

      const dates = Object.keys(freeSlotsData).filter(k => k !== 'traceId');
      if (dates.length > 0 && freeSlotsData[dates[0]]?.slots?.length > 0) {
        const availableSlotISO = freeSlotsData[dates[0]].slots[0];
        chosenStartTime = new Date(availableSlotISO);
        console.log(`✅ Horario libre verificado y seleccionado en GHL: ${availableSlotISO}`);
      }
    } catch (errSlots) {
      console.log("No se pudo consultar free-slots, usando horario por defecto:", errSlots.message);
    }

    const chosenEndTime = new Date(chosenStartTime.getTime() + 30 * 60000);

    await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        calendarId: DEFAULT_CALENDAR_ID,
        locationId: GHL_LOCATION_ID,
        contactId: contactId,
        startTime: chosenStartTime.toISOString(),
        endTime: chosenEndTime.toISOString(),
        title: "Test Visual Gratis - Óptica Círculo Visión",
        appointmentStatus: "confirmed"
      })
    });
    console.log(`🩺 Cita agendada exitosamente en 'Calendario de la Optica' a las ${chosenStartTime.toISOString()}`);

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
  const daysList = ["lunes", "martes", "miercoles", "miércoles", "jueves", "viernes", "sabado", "sábado"];
  const hesitationWords = ["no se", "no sé", "no se bien", "no sé bien", "te aviso", "te escribo", "aun no", "aún no", "todavia no", "todavía no", "la semana que viene", "después aviso", "despues aviso", "capaz"];

  if (daysList.some(d => msgLower.includes(d)) && !hesitationWords.some(h => msgLower.includes(h))) {
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
