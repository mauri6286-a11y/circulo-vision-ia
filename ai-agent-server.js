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
Tu estilo es 100% HUMANO, ULTRA CORTÓ, DIRECTO Y CONVERSACIONAL (ESTILO WHATSAPP URUGUAYO REAL).

REGLAS DE ESTILO WHATSAPP (MÁXIMA BREVEDAD):
1. RESPUESTAS CORTAS DE MÁXIMO 2 O 3 LÍNEAS. NUNCA MANDES TEXTOS LARGOS O CHOCLOS DE INFORMACIÓN.
2. NO REPETIR SALUDOS ("¡Hola! ¿Cómo estás?") SI YA SE SALUDÓ EN EL CHAT.
3. RESPONDE EXACTAMENTE LO QUE PREGUNTA EL CLIENTE Y TERMINA CON UNA PREGUNTA CLAVE DE AVANCE.

REGLAS DE SEGURIDAD ABSOLUTA (HUMANO NICO):
- CERO AGENDAMIENTOS POR IA: Si piden agendarse, turno o chequeo -> Traspaso a Nico con [SOLICITA_HUMANO].
- CERO CONFIRMACIONES DE RETIRO: Si preguntan si llegaron o están listos los lentes -> Traspaso a Nico con [SOLICITA_HUMANO].

PRECIOS Y ARMAZONES:
- Los precios de $1.300 a $5.990 corresponden a los CRISTALES.
- Si preguntan "¿Incluyen armazón?" o por armazones:
  "Los precios son por los cristales. En el local tenemos armazones desde $1.200 para armar el lente completo. ¿Tenés receta a mano o precisás un chequeo gratis?"

LISTADO DE CRISTALES Y PRECIOS:
- Blanco ($1.300): Opción básica estándar.
- Antireflejo ($2.200): Quita destellos molestos.
- Antireflejo + Blueblocker ($3.200): Filtro luz azul de pantallas.
- Bifocales (desde $2.500): Visión cerca y lejos.
- Gx7 Premium Antireflejo ($5.200): Ultra liviano e irrompible.
- Gx7 Premium Antireflejo + Blueblocker ($5.990): Protección total.
- Armazones: Desde $1.200.
`;

function getSmartResponse(userMessage) {
  const msg = userMessage ? userMessage.toLowerCase().trim() : "";

  // 1. RETIRO / ESTADO DE LENTES -> HUMANO
  if (msg.includes("llegaron") || msg.includes("listos") || msg.includes("prontos") || msg.includes("retirar") || msg.includes("mi pedido") || msg.includes("mis lentes") || msg.includes("taller")) {
    return "Con gusto te confirmamos. Le paso tu consulta a Nico y al equipo para que revisen el estado exacto de tu pedido y te avisen. Aguardame un segundito. [SOLICITA_HUMANO]";
  }

  // 2. SOLICITUD DE AGENDAMIENTO -> HUMANO
  if (msg.includes("agendar") || msg.includes("agendarme") || msg.includes("agendame") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("cita") || msg.includes("reserva") || msg.includes("reservar")) {
    return "¡Con gusto! Le paso tu solicitud a Nico en el local para que verifique la agenda física y te confirme el turno. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  // 3. CONSULTA DE ARMAZONES / INCLUYEN ARMAZÓN
  if (msg.includes("incluyen armazon") || msg.includes("incluyen armazón") || msg.includes("armazon") || msg.includes("armazones") || msg.includes("marco") || msg.includes("marcos")) {
    return "Los precios indicados son por los cristales. En el local tenemos armazones desde $1.200 para armar el combo completo. ¿Tenés receta a mano o precisás un chequeo gratis?";
  }

  // 4. AGRADECIMIENTOS
  if (msg.includes("gracias") || msg.includes("dale ok") || msg.includes("buenisimo") || msg.includes("buenísimo") || msg.includes("impecable") || msg.includes("dale barbaro") || msg.includes("dale bárbaro")) {
    return "¡Por nada! 😊 Quedamos a las órdenes por cualquier consulta. ¡Que tengas un excelente día!";
  }

  // 5. DESPEDIDAS SECUNDARIAS
  if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
    return "¡Muchas gracias a ti! 👋 ¡Saludos y buena jornada!";
  }

  // 6. BIFOCALES
  if (msg.includes("bifocal") || msg.includes("bifocales")) {
    return "Contamos con cristales bifocales desde $2.500 según la receta. ¿Tenés foto de tu receta a mano o querés coordinar un chequeo gratis?";
  }

  // 7. LENTES DE SOL
  if (msg.includes("lentes de sol") || msg.includes("lente de sol") || msg.includes("gafas de sol") || msg.includes("polarizado") || msg.includes("polarizados") || (msg.includes("sol") && (msg.includes("lente") || msg.includes("gafa")))) {
    return "Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas como Oahu, Bric à Brac, GX7). 🕶️ ¿Buscás algún modelo en particular o querés probarte en el local?";
  }

  // 8. PROMOS / INFORMACIÓN INICIAL
  if (msg.includes("interesad") || msg.includes("interesado") || msg.includes("interesada") || msg.includes("promo") || msg.includes("promocion") || msg.includes("promoción") || msg.includes("source url") || msg.includes("headline")) {
    return "¡Hola! 😊 Contamos con cristales desde $1.300 y armazones desde $1.200 en Av. Millán 4494. ¿Tenés la receta médica o necesitás coordinar un chequeo gratis?";
  }

  // 9. TENGO RECETA / LENTES DE RECETA
  if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("lentes de receta") || msg.includes("lentes de reseta")) {
    return "¡Bárbaro! Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos, o si preferís coordinamos un chequeo gratis. ¿Qué te queda mejor?";
  }

  // 10. UBICACIÓN
  if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
    return "Estamos en **Av. Millán 4494** (Montevideo). Atendemos Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¿Tenés receta o preferís un chequeo gratis?";
  }

  // 11. MARCAS DIGITALES / VARILUX
  if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor")) {
    return "Los multifocales Varilux son de excelente gama digital. El precio depende de tu receta. ¿Tenés la foto a mano o querés asesorarte en el local de Av. Millán 4494?";
  }

  // 12. PRECIOS DE CRISTALES
  if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cristal") || msg.includes("precios")) {
    return "Tenemos cristales desde $1.300 (Blanco), $2.200 (Antireflejo), $3.200 (Blueblocker) y armazones desde $1.200. ¿Tenés la receta a mano para cotizarte exacto?";
  }

  // 13. CUOTAS / TARJETAS
  if (msg.includes("cuota") || msg.includes("tarjeta") || msg.includes("pago") || msg.includes("credito") || msg.includes("crédito") || msg.includes("debito") || msg.includes("débito") || msg.includes("financiar")) {
    return "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo, débito y efectivo. 💳 ¿Querés consultar presupuesto o coordinar chequeo gratis?";
  }

  // 14. CONVENIOS
  if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
    return "Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y clubes deportivos. ¿A qué convenio pertenecés así te paso el descuento exacto?";
  }

  // 15. HORARIOS
  if (msg.includes("horario") || msg.includes("abierto")) {
    return "Estamos en Av. Millán 4494. Atendemos de Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¡Te esperamos cuando gustes!";
  }

  // 16. TRASPASO HUMANO DIRECTO
  if (msg.includes("nico") || msg.includes("humano") || msg.includes("persona") || msg.includes("hablar") || msg.includes("stock")) {
    return "¡Con gusto! Te conecto directamente con Nico y nuestro equipo en el local. Aguardame un segundito por favor. [SOLICITA_HUMANO]";
  }

  return "¡Hola! 😊 En Óptica Círculo Visión (Av. Millán 4494) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?";
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

  // DETECCIÓN DE MENSAJES DE STAFF / NICO / AUDIOS OUTBOUND
  const isOutboundStaff = direction.toLowerCase().includes("outbound") || 
                          userId || 
                          source.toLowerCase().includes("user") || 
                          source.toLowerCase().includes("mobile") || 
                          fullBodyStr.includes('"direction":"outbound"') ||
                          fullBodyStr.includes('"userid":');

  if (isOutboundStaff) {
    console.log(`👤 Mensaje del equipo (Staff / Nico) detectado. Pausando IA para ${contactId}...`);
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
    console.log(`🛑 Mensaje ignorado por la IA porque Nico/Staff tiene el control de ${contactId}.`);
    return res.status(200).json({ status: "paused_human_active" });
  }

  let incomingMessage = typeof req.body.message === 'string' ? req.body.message : (req.body.message?.body || req.body.body || req.body.text || req.body.customData?.message || "");
  const audioAttachment = req.body.attachments?.[0] || req.body.mediaUrl || req.body.media_url;

  if (!incomingMessage && audioAttachment) {
    console.log("🎙️ Nota de voz / Audio detectado:", audioAttachment);
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
