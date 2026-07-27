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
Tu estilo es 100% HUMANO, ULTRA CONTEXTUAL, CÁLIDO, URUGUAYO Y ADAPTATIVO. LEES Y ANALIZAS CADA MENSAJE CON ATENCIÓN EXTREMA.

REGLA DE SEGURIDAD ABSOLUTA DE AGENDAMIENTO (REGLA #1):
- LA IA NUNCA AGEDA AUTOMÁTICAMENTE NI CONFIRMA FECHAS O HORARIOS POR SU CUENTA.
- SIEMPRE QUE UN CLIENTE PIDA AGENDARSE, UN TURNO, UN TEST VISUAL, UN CHEQUEO O VENIR AL LOCAL:
  Debes transferir la solicitud INMEDIATAMENTE a Nico y al equipo humano con [SOLICITA_HUMANO]:
  "¡Hola! 😊 Con mucho gusto. Le paso tu solicitud de agenda a Nico y al equipo en el local para que verifiquen los horarios disponibles en la agenda física de la óptica y te confirmen el turno exacto. Aguardame un segundito por favor. [SOLICITA_HUMANO]"

REGLA DE SEGURIDAD ABSOLUTA DE RETIRO / ESTADO DE LENTES (REGLA #2):
- LA IA NUNCA CONFIRMA NI DICE QUE UNOS LENTES ESTÁN PRONTOS O LLEGARON.
- SI PREGUNTAN SI SUS LENTES LLEGARON O ESTÁN LISTOS:
  "¡Hola! 😊 Con gusto. Para confirmarte con total seguridad si tu pedido ya está pronto en el taller, le paso tu consulta a Nico y al equipo en el local para que revisen el estado exacto de tu trabajo y te confirmen. Aguardame un segundito por favor. [SOLICITA_HUMANO]"

REGLA DE AGRADECIMIENTO ("Gracias", "Dale ok gracias", "Impecable"):
- Responder siempre cortésmente: "¡Por nada! 😊 Quedamos a las órdenes por cualquier duda o consulta. ¡Que tengas un excelente día!" (NUNCA ENVIAR EL SALUDO INICIAL).

REGLAS GENERALES:
1. BIFOCALES: Opciones desde $2.500.
2. LENTES DE SOL: Sin recetas ni chequeos. Presenta colecciones UV400/polarizados (+50 marcas).
3. CONVENIOS Y CUOTAS: NUNCA los menciones a menos que pregunten explícitamente por ellos.

LISTADO DE CRISTALES Y PRECIOS:
- Blanco ($1.300): Opción básica estándar.
- Antireflejo ($2.200): Quita destellos molestos.
- Antireflejo + Blueblocker ($3.200): Filtro luz azul de pantallas.
- Bifocales (desde $2.500): Visión cerca y lejos.
- Gx7 Premium Antireflejo ($5.200): Ultra liviano e irrompible.
- Gx7 Premium Antireflejo + Blueblocker ($5.990): Protección total.
`;

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase().trim() : "";

  // 1. REGLA SUPREMA #1: RETIRO / ESTADO DE LENTES -> TRASPASO OBLIGATORIO A HUMANO
  if (msg.includes("llegaron") || msg.includes("listos") || msg.includes("prontos") || msg.includes("retirar") || msg.includes("mi pedido") || msg.includes("mis lentes") || msg.includes("taller")) {
    return "¡Hola! 😊 Para confirmarte con total certeza si tu pedido ya está pronto en el taller, le paso tu consulta a Nico y al equipo en el local para que revisen tu trabajo y te confirmen. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  // 2. REGLA SUPREMA #2: SOLICITUD DE AGENDAMIENTO / TURNO / CHEQUEO -> TRASPASO OBLIGATORIO A HUMANO
  if (msg.includes("agendar") || msg.includes("agendarme") || msg.includes("agendame") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("cita") || msg.includes("reserva") || msg.includes("reservar")) {
    return "¡Hola! 😊 Con mucho gusto. Le paso tu solicitud de agenda a Nico y al equipo en el local para que verifiquen los horarios disponibles en la agenda y te confirmen el turno exacto. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  // 3. AGRADECIMIENTOS Y CORTESÍA (ej: "Dale ok Gracias", "Gracias", "Impecable")
  if (msg.includes("gracias") || msg.includes("dale ok") || msg.includes("buenisimo") || msg.includes("buenísimo") || msg.includes("impecable") || msg.includes("dale barbaro") || msg.includes("dale bárbaro")) {
    return "¡Por nada! 😊 Quedamos a las órdenes por cualquier duda o consulta. ¡Que tengas un excelente día!";
  }

  // 4. DESPEDIDAS SECUNDARIAS
  if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
    return "¡Muchas gracias a ti! 👋 ¡Saludos y que tengas una hermosa jornada!";
  }

  // 5. BIFOCALES
  if (msg.includes("bifocal") || msg.includes("bifocales")) {
    return "¡Hola! 😊 Con mucho gusto te asesoro sobre los cristales bifocales. 👓\n\n" +
      "El valor de los cristales bifocales varía según la graduación de tu receta (tenemos opciones bifocales desde $2.500).\n\n" +
      "¿Tienes la foto de tu receta a mano así te pasamos el presupuesto exacto o prefieres coordinar un chequeo gratis en el local?";
  }

  // 6. LENTES DE SOL
  if (msg.includes("lentes de sol") || msg.includes("lente de sol") || msg.includes("gafas de sol") || msg.includes("polarizado") || msg.includes("polarizados") || (msg.includes("sol") && (msg.includes("lente") || msg.includes("gafa")))) {
    return "¡Hola! 😊 Con mucho gusto. En Óptica Círculo Visión (Av. Millán 4494) contamos con una excelente variedad de lentes de sol con protección UV400 y filtros polarizados de más de 50 marcas de primer nivel (como Oahu, Bric à Brac, GX7 e internacionales). 🕶️\n\n" +
      "¿Buscas algún modelo o estilo en particular, o prefieres pasarte por nuestro local a probártelos?";
  }

  // 7. PROMOS
  if (msg.includes("interesad") || msg.includes("interesado") || msg.includes("interesada") || msg.includes("promo") || msg.includes("promocion") || msg.includes("promoción")) {
    return "¡Hola! 😊 Con mucho gusto te asesoro sobre la promo. En Óptica Círculo Visión (**Av. Millán 4494**) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
      "Para ayudarte a avanzar: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en nuestro local?";
  }

  // 8. UBICACIÓN
  if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
    return "¡Sí, exactamente en Montevideo! 📍 Estamos en **Av. Millán 4494** (zona Sayago/Aires Puros, entre Loreto Gomensoro y Reyes).\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¿Ya cuentas con tu receta médica o prefieres agendar un chequeo gratis?";
  }

  // 9. ANUNCIOS META
  if (msg.includes("source url") || msg.includes("headline") || msg.includes("fb.me") || msg.includes("instagram.com/p/")) {
    return "¡Hola! 😊 Veo que nos escribes por nuestra promo activa por tiempo limitado. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
      "Para pasarte la información exacta de la promo: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?";
  }

  // 10. MARCAS DIGITALES / VARILUX
  if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor")) {
    return "¡Hola! 😊 Los multifocales Varilux Physio son una excelente opción de alta gama en cristales digitales. 👓\n\n" +
      "El precio exacto depende de la graduación específica de tu receta (y si requieres filtros antireflejantes o fotocromáticos).\n\n" +
      "¿Tienes la foto de tu receta a mano así te pasamos la cotización exacta o te conecto directamente con Nico para asesorarte?";
  }

  // 11. PRECIOS DE CRISTALES
  if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cristal") || msg.includes("precios")) {
    return "¡Hola! 😊 Contamos con opciones de cristales para cada necesidad:\n\n" +
      "1. Blanco ($1.300): Opción básica estándar.\n" +
      "2. Antireflejo ($2.200): Quita destellos molestos de luces.\n" +
      "3. Antireflejo + Blueblocker ($3.200): Antireflejo + filtro de luz azul de pantallas.\n" +
      "4. Gx7 Premium Antireflejo ($5.200): Ultra liviano, delgado e irrompible.\n" +
      "5. Gx7 Premium Antireflejo + Blueblocker ($5.990): Protección total y máxima estética.\n\n" +
      "¿Tienes la foto de tu receta a mano así te pasamos el presupuesto exacto o prefieres agendar un chequeo gratis?";
  }

  // 12. RECETA
  if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("tengo examen")) {
    return "¡Excelente! 👓 Puedes enviarnos una foto de tu receta por aquí mismo o contarnos qué cristales buscas (Monofocales o Multifocales Digitales), así te pasamos el presupuesto exacto.";
  }

  // 13. CUOTAS / TARJETAS
  if (msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("pago") || msg.includes("credito") || msg.includes("crédito") || msg.includes("debito") || msg.includes("débito") || msg.includes("financiar")) {
    return "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo, así como también tarjetas de débito y efectivo. 💳\n\n" +
      "¿Te gustaría agendar una visita o consultar el presupuesto de tus lentes?";
  }

  // 14. CONVENIOS
  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "¡Con gusto! 😊 Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y varios clubes deportivos.\n\n" +
      "¿A qué convenio o mutualista perteneces tú así te paso el descuento exacto?";
  }

  // 15. MARCAS
  if (msg.includes("marca") || msg.includes("modelo") || msg.includes("armazon") || msg.includes("armazones")) {
    return "¡Hola! 😊 Trabajamos con más de 50 marcas de primer nivel (como Oahu, Bric à Brac, GX7 e internacionales).\n\n" +
      "¿Buscas alguna marca o modelo en particular así te confirmo disponibilidad?";
  }

  // 16. HORARIOS
  if (msg.includes("horario") || msg.includes("abierto")) {
    return "Estamos ubicados en **Av. Millán 4494** (Montevideo). 📍\n\n" +
      "Nuestros horarios son de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  // 17. TRASPASO HUMANO DIRECTO
  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local para que te asesoren de forma personalizada. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  return "¡Hola! 😊 Con mucho gusto te asesoro. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual computarizado 100% GRATIS. 👓\n\n" +
    "Para ayudarte mejor a avanzar: ¿ya cuentas con tu receta médica o prefieres coordinar tu chequeo visual gratis en nuestro local?";
}

async function generateAIResponse(userMessage) {
  console.log(`💬 Procesando mensaje omnicanal: "${userMessage}"`);

  if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
    const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY.trim()
          },
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
          console.error(`⚠️ Respuesta Gemini fallida (${model}):`, JSON.stringify(data));
        }
      } catch (err) {
        console.error(`Error en ${model}:`, err.message);
      }
    }
  }

  return getSmartResponse(userMessage);
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
  const direction = (req.body.direction || req.body.type || req.body.message?.direction || "").toString();
  const userId = req.body.userId || req.body.user_id || req.body.message?.userId;
  const source = (req.body.source || req.body.message?.source || "").toString();

  const fullBodyStr = JSON.stringify(req.body).toLowerCase();
  let channelType = 'WhatsApp';
  
  if (fullBodyStr.includes("instagram") || fullBodyStr.includes('"ig"') || fullBodyStr.includes("dm de insta")) {
    channelType = 'IG';
  } else if (fullBodyStr.includes("facebook") || fullBodyStr.includes("messenger") || fullBodyStr.includes('"fb"')) {
    channelType = 'FB';
  }

  // DETECCIÓN TOTAL DE MENSAJES DE STAFF / AUDIO DESDE GHL / WHATSAPP / INSTAGRAM
  const isOutboundStaff = direction.toLowerCase().includes("outbound") || 
                          userId || 
                          source.toLowerCase().includes("user") || 
                          source.toLowerCase().includes("mobile") || 
                          fullBodyStr.includes('"direction":"outbound"') ||
                          fullBodyStr.includes('"userid":');

  if (isOutboundStaff) {
    console.log(`👤 Mensaje del equipo (Staff / Nico / Audio) detectado. Pausando IA para el contacto ${contactId}...`);
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
      console.log(`✅ Mensaje enviado exitosamente por [${channelType}] a ${channelType}`);
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
