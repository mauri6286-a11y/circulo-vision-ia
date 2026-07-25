import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.PALM_API_KEY;

const NICO_USER_ID = "Dm9trLIiq2sJmRCsgqrH"; // ID de usuario de Nicolás Cejas en GHL
const PIPELINE_ID = "wyP2TvxIOaDFD6g5jz4s"; // Pipeline de Ventas - Óptica Círculo Visión
const STAGE_NUEVO_LEAD = "1cfaaaf5-8cdc-45cd-8fd2-8a6b29c9681a"; // 1. Nuevo Lead (WhatsApp / Meta)

// PROMPT COMPLETO DE ENTRENAMIENTO DE IA PARA ÓPTICA CÍRCULO VISIÓN (ACTUALIZADO CON DATOS REALES)
const SYSTEM_PROMPT = `
Eres la Asistente Virtual Inteligente de Óptica Círculo Visión en Montevideo, Uruguay.
Tu objetivo es responder consultas por WhatsApp con amabilidad, calidez y precisión médica/comercial.

INFORMACIÓN OFICIAL DE LA ÓPTICA:
- Dirección: Av. Millán 4494, Montevideo, Uruguay.
- Teléfono / WhatsApp Oficial: 091 478 282 (+59891478282).
- Horarios de Atención:
  * Lunes a Viernes: 09:00 a 19:00 hs.
  * Sábados: 09:00 a 14:00 hs.

TIEMPOS DE ENTREGA Y GARANTÍAS:
- Test / Examen Visual Computarizado: ¡Es 100% GRATIS!
- Demora Lentes Monofocales estándar: Aprox. 3 días hábiles (si están antes, se avisa inmediatamente).
- Demora Lentes Multifocales / Progresivos Digitales: Aprox. 5 días hábiles.
- Garantía de Adaptación: Todos nuestros cristales y multifocales cuentan con 60 días de garantía de adaptación.
- Ajustes y Mantenimiento: 15% de descuento en reparaciones y ajustes de armazones SIN COSTO.
- Envíos: Hacemos envíos a domicilio a todo el país, pero para la toma de medidas inicial es necesario pasar por el local en Millán 4494.

FORMAS DE PAGO:
- Aceptamos todas las tarjetas de crédito hasta en 12 CUOTAS SIN RECARGO (incluyendo Compra Ágil y Pago Después).
- Efectivo y Débito.

CONVENIOS Y BENEFICIOS EXCLUSIVOS:
1. CAJA BANCARIA (C.J.P.B.):
   - 15% OFF en efectivo (marcos, receta, sol, reparaciones).
   - 10% OFF en débito.
   - 5% OFF en crédito.
   - 5% OFF en lentes de contacto blandos.
2. SINDICATO DE LA INDUSTRIA QUÍMICA (STIQ):
   - 20% OFF en efectivo.
   - 15% OFF en débito.
   - 5% OFF en crédito.
3. FUNCIONARIOS CÍRCULO CATÓLICO Y HOSPITAL EVANGÉLICO:
   - 15% OFF en efectivo, 10% OFF en débito, 5% OFF en crédito.
4. CUADRO DE FÚTBOL FERROCARRIL NORTE & LIGA MVD:
   - 10% OFF en descuento general y 5% OFF en contactología.
5. BPS (Banco de Previsión Social):
   - Tramitación directa de subsidio para lentes de receta de trabajadores y jubilados.
6. GIMNASIOS Y DEPORTES:
   - Convenios activos con CrossFit Salvaje, Vulcano, Fitlab, Club Sayago, Racing de Montevideo, Plaza 7, Fanacap, Hornex, Molinos, Líbano, Accent, Hument.

PRODUCTOS DESTACADOS:
- Filtro de Luz Azul (Blue Defense) para pantallas.
- Antirreflex Premium y Cristales Fotocromáticos (Transitions).
- Armazones exclusivos: Neréa Eyewear, Oahu, Bric à Brac, GX7, etc.

REGLAS DE ATENCIÓN EN WHATSAPP:
1. Responde de forma breve, empática y clara (usa emojis sutiles 👓✨).
2. Explica los convenios con precisión cuando el cliente pregunte.
3. Invita siempre a coordinar su test visual GRATIS o pasar por el local en Millán 4494.
4. TRASPASO A NICO / ATENCIÓN HUMANA: Si el cliente consulta por stock exacto de una marca o modelo específico, o pide hablar con un humano, responde amablemente: "Con gusto te conecto con Nico y nuestro equipo en el local para asesorarte de forma directa. Un segundo por favor." e incluye la palabra [SOLICITA_HUMANO].
`;

async function generateAIResponse(userMessage) {
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY no está configurada en las variables de entorno.");
    return "¡Hola! Gracias por comunicarte con Óptica Círculo Visión en Millán 4494. Tu test visual es GRATIS y abrimos de Lun a Vie de 9 a 19 hs y Sáb de 9 a 14 hs. ¿En qué te asesoramos?";
  }

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const contents = [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nMensaje del cliente: "${userMessage}"` }] }
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await res.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      
      if (data.error) {
        console.error(`⚠️ Error en modelo ${model}:`, data.error.message || JSON.stringify(data.error));
      }
    } catch (err) {
      console.error(`❌ Error en petición a ${model}:`, err.message);
    }
  }

  return "¡Hola! Gracias por comunicarte con Óptica Círculo Visión (Av. Millán 4494). Contamos con convenio CJPB, BPS, STIQ, 12 cuotas sin recargo y tu test visual es GRATIS. ¿En qué te podemos ayudar?";
}

// Crear oportunidad y asignar a Nico automáticamente
async function ensureOpportunityAndAssignToNico(contactId, contactName) {
  try {
    const headers = {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    };

    // 1. Asignar el contacto a Nico
    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ assignedTo: NICO_USER_ID })
    });

    // 2. Crear la tarjeta en el Pipeline de Ventas en "1. Nuevo Lead"
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
    console.log(`📌 Oportunidad creada y asignada a Nico para ${contactName || contactId}`);
  } catch (e) {
    console.error("Error asignando contacto/oportunidad:", e.message);
  }
}

// Webhook para GHL
app.post('/webhook/ghl-message', async (req, res) => {
  const { contact_id, first_name, last_name, message, body } = req.body;
  const incomingMessage = message || body || "";
  const contactName = `${first_name || ''} ${last_name || ''}`.trim();

  if (!contact_id || !incomingMessage) {
    return res.status(400).json({ status: "ignored", reason: "Sin mensaje o contact_id" });
  }

  // Asignar a Nico y crear oportunidad en el Pipeline
  await ensureOpportunityAndAssignToNico(contact_id, contactName);

  // Generar respuesta con la IA entrenada
  const aiReply = await generateAIResponse(incomingMessage);

  // Traspaso a Humano
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
    console.log(`✅ Mensaje de IA enviado por WhatsApp a ${contactId}`);
  } catch (e) {
    console.error("Error enviando mensaje GHL:", e.message);
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
    console.error("Error aplicando etiqueta:", e.message);
  }
}

// Endpoint de Diagnóstico para probar la API Key de Gemini
app.get('/test-ai', async (req, res) => {
  const keyPresent = !!GEMINI_API_KEY;
  const keyPrefix = GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 6) + "..." : "NINGUNA";

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];
  let results = [];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hola, qué convenios tienen?' }] }]
        })
      });
      const data = await response.json();
      results.push({ model, status: response.status, data });
    } catch (e) {
      results.push({ model, error: e.message });
    }
  }

  res.json({
    keyPresent,
    keyPrefix,
    results
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agente IA Círculo Visión (Entrenado 100%) corriendo en puerto ${PORT}`);
});
