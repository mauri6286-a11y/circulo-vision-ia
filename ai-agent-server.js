import express from 'express';
import dotenv from 'dotenv';
import { StateMachine } from './state-machine.js';
import { WebhookGuard } from './webhook-guard.js';
import { GHLState } from './ghl-state.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const NICO_USER_ID = "Dm9trLIiq2sJmRCsgqrH"; // ID de Nico
const PIPELINE_ID = "wyP2TvxIOaDFD6g5jz4s"; // Pipeline de Ventas - Óptica Círculo Visión
const STAGE_NUEVO_LEAD = "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a"; // 1. Nuevo Lead
const OUR_BOT_APP_ID = "6a498c97418d7351792c4b78"; // ID de la app de nuestro bot
const STAFF_WINDOW_MS = 30 * 60 * 1000; // Ventana de 30 minutos para considerar intervención humana activa

// Memoria de deduplicación de respuestas salientes consecutivas por contacto
const lastSentReplies = new Map();

export const store = new GHLState({
  apiToken: GHL_TOKEN,
  locationId: GHL_LOCATION_ID,
  cacheTtlMs: 0
});

await store.init();

// Consulta la API oficial de GHL con ventana de tiempo para intervención del Staff (30 min)
async function checkGHLHistoryAndStaff(contactId) {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}`, {
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return { isStaffActive: false, hasPreviousMessages: false };
    const data = await res.json();
    const conv = data.conversations?.[0];
    if (!conv) return { isStaffActive: false, hasPreviousMessages: false };

    const msgRes = await fetch(`https://services.leadconnectorhq.com/conversations/${conv.id}/messages?limit=25`, {
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!msgRes.ok) return { isStaffActive: false, hasPreviousMessages: true };
    const msgData = await msgRes.json();
    const messages = msgData.messages?.messages || [];

    const hasPreviousMessages = messages.length > 1;
    const now = Date.now();

    const lastInboundMsg = messages.find(m => m.direction === 'inbound');
    const lastInboundTs = lastInboundMsg ? new Date(lastInboundMsg.dateAdded).getTime() : 0;

    let isStaffActive = false;

    for (const m of messages) {
      if (m.direction !== 'outbound') continue;

      // Ignorar eventos de actividad del sistema (Opportunity created, stage changes, etc.)
      if (m.type === 28 || m.messageType === 'TYPE_ACTIVITY_OPPORTUNITY' || (m.body && m.body.includes('Opportunity created'))) {
        continue;
      }

      const appId = m.meta?.marketplace?.appId;
      if (appId === OUR_BOT_APP_ID) continue; // Es el bot

      const bodyText = (m.body || "").trim();
      const msgTs = new Date(m.dateAdded).getTime();
      const elapsedMin = Math.round((now - msgTs) / 60000);

      // Solo es Staff Activo si fue enviado en los últimos 30 minutos Y después del último mensaje del cliente
      if (now - msgTs <= STAFF_WINDOW_MS && msgTs >= lastInboundTs) {
        isStaffActive = true;
        console.log(`[DEBUG] Staff detectado por mensaje: "${bodyText || '[Nota de voz/Adjunto]'}" del ${m.dateAdded} (hace ${elapsedMin} min)`);
        break;
      } else {
        console.log(`[DEBUG] Mensaje de staff antiguo/vencido (hace ${elapsedMin} min - ignorado): "${bodyText || '[Nota de voz/Adjunto]'}" del ${m.dateAdded}`);
      }
    }

    return { isStaffActive, hasPreviousMessages };
  } catch (e) {
    console.error("Error verificando historial GHL API:", e.message);
    return { isStaffActive: false, hasPreviousMessages: false };
  }
}

async function verificarTagHumano(contactId) {
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
      await store.setState(contactId, { funnel: 'TRASPASO_HUMANO' });
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

async function sendGHLMessage(contactId, messageText, channelType = 'WhatsApp') {
  const now = Date.now();
  const lastSent = lastSentReplies.get(contactId);

  // Deduplicación de respuestas idénticas consecutivas (<30 segundos)
  if (lastSent && lastSent.text === messageText && (now - lastSent.sentAt) < 30000) {
    console.log(`[DEBUG] Respuesta idéntica consecutiva descartada por deduplicación para ${contactId}: "${messageText}"`);
    return;
  }

  lastSentReplies.set(contactId, { text: messageText, sentAt: now });

  console.log(`💬 Enviando respuesta por el canal [${channelType}] a ${contactId}...`);
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
    console.log(`🏷️ Etiqueta '${tag}' agregada exitosamente a ${contactId}`);
  } catch (e) {
    console.error("Error agregando tag:", e.message);
  }
}

// Lógica de procesamiento de ráfagas contra GHL Custom Fields (ghl-state)
async function procesarLoteDeMensajes(contactId, messages) {
  const textoCompleto = messages.map(m => m.text).filter(Boolean).join('\n').trim();
  console.log(`[DEBUG] Ráfaga entrante para contacto ${contactId}: "${textoCompleto}"`);

  // 1. LEER SIEMPRE EL ESTADO ACTUAL PRIMERO DESDE GHL CUSTOM FIELDS
  const currentState = await store.getState(contactId);
  console.log(`[DEBUG] Estado actual leído desde GHL para ${contactId}:`, JSON.stringify(currentState));

  // Detección exhaustiva de adjuntos (PDF, comprobante, imagen, audio, archivo)
  const hasAttachment = messages.some(m => {
    if (m.hasAttachment) return true;
    const r = m.raw || {};
    if (r.attachments && r.attachments.length > 0) return true;
    if (r.message?.attachments && r.message.attachments.length > 0) return true;
    if (r.mediaUrl || r.media_url || r.fileUrl || r.document) return true;
    const typeStr = (r.type || r.contentType || r.messageType || "").toString().toLowerCase();
    if (typeStr.includes("pdf") || typeStr.includes("attachment") || typeStr.includes("media") || typeStr.includes("image") || typeStr.includes("audio") || typeStr.includes("document") || typeStr.includes("file")) return true;
    const txt = (m.text || "").toLowerCase();
    if (txt.includes(".pdf") || txt.includes(".jpg") || txt.includes(".jpeg") || txt.includes(".png") || txt.includes("comprobante") || txt.includes("recibo") || txt.includes("transferencia")) return true;
    return false;
  });

  console.log(`[DEBUG] mensaje entrante tiene adjunto para ${contactId}: ${hasAttachment}`);

  // Auditar mensajes de staff recientes en GHL API
  const ghlAudit = await checkGHLHistoryAndStaff(contactId);

  if (ghlAudit.isStaffActive) {
    console.log(`⏸️ Staff/Humano detectado activo reciente en GHL API. Pausando IA para ${contactId}...`);
    await store.setState(contactId, { funnel: 'TRASPASO_HUMANO' });
    await addTagToContact(contactId, "atencion_humana");
    return null;
  }

  if (ghlAudit.hasPreviousMessages && !currentState.saludo_enviado) {
    currentState.saludo_enviado = true;
  }

  const isHumanActive = await verificarTagHumano(contactId);
  if (isHumanActive || currentState.funnel === 'TRASPASO_HUMANO') {
    console.log(`⏸️ Mensaje ignorado por la IA porque Nico/Staff tiene el control de ${contactId}.`);
    return null;
  }

  // MANEJO DE ADJUNTOS / COMPROBANTES / PDF: JAMÁS SALUDA NI USA PLANTILLA DE PITCH
  if (hasAttachment || !textoCompleto) {
    console.log(`📎 Adjunto/PDF o mensaje sin texto detectado para ${contactId}. Enviando mensaje corto de recibido y pasando a humano...`);
    const confirmReply = "¡Recibido! En un momento revisamos el archivo y te confirmamos.";
    await sendGHLMessage(contactId, confirmReply);
    await addTagToContact(contactId, "atencion_humana");
    await store.setState(contactId, {
      funnel: 'TRASPASO_HUMANO',
      saludo_enviado: true
    });
    return null;
  }

  const firstRaw = messages[0]?.raw || {};
  const firstName = firstRaw.first_name || firstRaw.contact?.first_name || "";
  const lastName = firstRaw.last_name || firstRaw.contact?.last_name || "";
  const contactName = `${firstName} ${lastName}`.trim();

  await ensureOpportunityAndAssignToNico(contactId, contactName);

  // Evaluar máquina de estados con el estado actual traído de GHL
  const stateResult = StateMachine.processMessage(contactId, textoCompleto, currentState);
  console.log(`[DEBUG] Resultado de StateMachine para ${contactId}:`, JSON.stringify(stateResult));

  if (stateResult.action === 'IGNORE_HUMAN_ACTIVE') {
    return null;
  }

  const replyText = typeof stateResult === 'string' ? stateResult : stateResult.reply;
  const patchToSave = stateResult.patch || {};

  console.log(`[DEBUG] patch antes de setState para ${contactId}:`, JSON.stringify(patchToSave));

  if (Object.keys(patchToSave).length === 0) {
    console.warn(`[DEBUG] ADVERTENCIA: El patch viene VACÍO ({}) para contacto ${contactId}!`);
  } else {
    await store.setState(contactId, patchToSave);
  }

  if (stateResult.action === 'HANDOFF_HUMAN') {
    const cleanReply = replyText.replace("[SOLICITA_HUMANO]", "").trim();
    await sendGHLMessage(contactId, cleanReply);
    await addTagToContact(contactId, "atencion_humana");
    await store.setState(contactId, { funnel: 'TRASPASO_HUMANO' });
    return null;
  }

  return replyText;
}

export const guard = new WebhookGuard({
  debounceMs: 7000,
  processBatch: procesarLoteDeMensajes,
  isHumanHandling: verificarTagHumano,
  sendReply: async (contactId, texto) => {
    await sendGHLMessage(contactId, texto);
  }
});

function extraerContactId(body) {
  return body.contact_id || body.contactId || body.contact?.id || body.id;
}

function extraerMessageId(body) {
  return body.message_id || body.messageId || body.message?.id || body.id || body.altId || body.message?.altId || null;
}

function extraerTexto(body) {
  return typeof body.message === 'string' ? body.message : (body.message?.body || body.body || body.text || body.customData?.message || "");
}

function extraerAdjunto(body) {
  if (body.attachments && body.attachments.length > 0) return true;
  if (body.message?.attachments && body.message.attachments.length > 0) return true;
  if (body.mediaUrl || body.media_url || body.fileUrl || body.document) return true;
  const typeStr = (body.type || body.contentType || body.messageType || "").toString().toLowerCase();
  if (typeStr.includes("pdf") || typeStr.includes("attachment") || typeStr.includes("media") || typeStr.includes("image") || typeStr.includes("audio") || typeStr.includes("document") || typeStr.includes("file")) return true;
  const txt = extraerTexto(body).toLowerCase();
  if (txt.includes(".pdf") || txt.includes(".jpg") || txt.includes(".jpeg") || txt.includes(".png") || txt.includes("comprobante") || txt.includes("recibo") || txt.includes("transferencia")) return true;
  return false;
}

function handleWebhookEndpoint(req, res) {
  res.status(200).json({ ok: true });

  const contactId = extraerContactId(req.body);
  const messageId = extraerMessageId(req.body);
  const text = extraerTexto(req.body);
  const hasAttachment = extraerAdjunto(req.body);

  guard.ingest({
    contactId,
    messageId,
    text,
    hasAttachment,
    raw: req.body
  });
}

app.post('/webhook/ghl-message', handleWebhookEndpoint);
app.post('/', handleWebhookEndpoint);

app.get('/health', (req, res) => {
  res.status(200).json(guard.healthSnapshot());
});

process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor limpiamente...');
  await guard.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor limpiamente...');
  await guard.shutdown();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Agente IA Omnicanal Círculo Visión listo en puerto ${PORT} con Deduplicación Saliente y Ventana de 30m.`);
});