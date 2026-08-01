import { getConfig } from './config-loader.js';

export async function clasificarIntencion({ mensaje, historial = [], config = null }) {
  const cfg = config || getConfig();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  console.log('[DEBUG] contexto enviado a clasificador:', JSON.stringify({ mensaje, historial }));

  const productosValidos = Object.keys(cfg.datos_que_el_bot_informa?.cristales_simples?.items || {})
    .concat(Object.keys(cfg.datos_que_el_bot_informa?.bifocales?.items || {}))
    .concat(['armazon']);

  const conveniosActivos = Object.keys(cfg.convenios?.activos || {});
  const conveniosAConsultar = Object.keys(cfg.convenios?.a_consultar || {});

  if (apiKey) {
    try {
      const systemPrompt = `
Sos el clasificador de intenciones en tiempo real para el agente de IA de ${cfg.negocio?.nombre || 'la óptica'}.
Tu única tarea es analizar el mensaje del cliente y el historial de la conversación, y devolver UNICAMENTE un JSON válido con esta estructura exacta:

{
  "intencion": "promo" | "consulta_precio" | "consulta_convenio" | "sin_receta" | "tengo_receta" | "lentes_de_sol" | "horarios" | "envios" | "cuotas" | "tiempo_entrega" | "test_gratis" | "saludo" | "agradecimiento" | "despedida" | "consulta_derivar_humano" | "otra",
  "entidades": {
    "producto": ${JSON.stringify(productosValidos)} | null,
    "convenio": ${JSON.stringify(conveniosActivos.concat(conveniosAConsultar))} | null,
    "tiene_receta": true | false | null
  },
  "requiere_humano": boolean,
  "razon_humano": "fotocromaticos" | "varilux" | "lente_completo" | "reclamo" | "convenio_a_consultar" | "ajustes_adaptacion" | "turnos" | "garantia_producto_especifico" | "otro" | null,
  "resumen": "Resumen corto de 1 frase"
}

REGLAS DE CLASIFICACIÓN RIGUROSAS:
1. "sin_receta": Si el cliente indica que no tiene receta (ej: "no tengo receta", "la perdí", "la dejé en casa", "no la traje", "sin receta"), clasificar intencion: "sin_receta", tiene_receta: false, requiere_humano: false.
2. "tengo_receta": Si el cliente indica que si tiene receta (ej: "tengo receta", "tengo la receta médica", "con receta"), clasificar intencion: "tengo_receta", tiene_receta: true, requiere_humano: false.
3. "promo": Si ingresa por una promoción o anuncio (ej: "promo", "interesa la promo", "source url", "fb.me"), clasificar intencion: "promo", requiere_humano: false.
4. "consulta_convenio":
   - Si menciona un convenio activo (${conveniosActivos.join(', ')}), poner el slug exacto en entidades.convenio y requiere_humano: false.
   - Si menciona un convenio a consultar (${conveniosAConsultar.join(', ')}) o mutualista/sindicato vago/desconocido (ej: " mutualista ", "fitlab", "sayago", "crossfit"), poner el slug en entidades.convenio y requiere_humano: true, razon_humano: "convenio_a_consultar".
5. "requiere_humano: true": Si pregunta por fotocromáticos/transitions, multifocales/varilux, cotización de lente completo armado (cristal + armazón sumados), reclamos, arreglos/patillas que se caen, agendamiento de turnos específicos, garantía de producto específico, o convenios a consultar.
6. "consulta_precio": Si pregunta precio de un producto puntual (ej: antirreflejo, blueblocker, cristal blanco, bifocal, armazón), clasificar intencion: "consulta_precio" y poner el slug exacto en entidades.producto.
7. NO inventar datos. Tu único trabajo es clasificar en el JSON estructurado.
`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `System Instruction:\n${systemPrompt}\n\nHistorial Reciente:\n${JSON.stringify(historial)}\n\nMensaje Actual del Cliente:\n"${mensaje}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Respuesta vacía de Gemini API');

      const resultJson = JSON.parse(rawText);
      console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(resultJson));
      return resultJson;
    } catch (err) {
      console.error(`[ERROR] Fallo en clasificarIntencion con Gemini API: ${err.message}. Ejecutando fallback seguro.`);
    }
  } else {
    console.log('[DEBUG] GEMINI_API_KEY no detectada. Usando motor semántico estructural local.');
  }

  // Normalizar acentos
  const lowerMsg = (mensaje || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Entrada por Promo / Ad
  if (lowerMsg.includes("promo") || lowerMsg.includes("source url") || lowerMsg.includes("headline") || lowerMsg.includes("fb.me") || lowerMsg.includes("instagram")) {
    const res = {
      intencion: "promo",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Entrada por anuncio o promo activa."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Lentes de sol
  if (lowerMsg.includes("lentes de sol") || lowerMsg.includes("lente de sol") || lowerMsg.includes("gafas de sol") || (lowerMsg.includes("sol") && lowerMsg.includes("polariz"))) {
    const res = {
      intencion: "lentes_de_sol",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta sobre lentes de sol."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Tengo receta
  if ((lowerMsg.includes("tengo receta") || lowerMsg.includes("con receta") || lowerMsg.includes("tengo la receta") || lowerMsg.includes("receta medica")) && !lowerMsg.includes("no tengo") && !lowerMsg.includes("no la tengo") && !lowerMsg.includes("perdi")) {
    const res = {
      intencion: "tengo_receta",
      entidades: { producto: null, convenio: null, tiene_receta: true },
      requiere_humano: false,
      razon_humano: null,
      resumen: "El cliente indica que tiene receta médica."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Sin receta
  if (lowerMsg.includes("no tengo") || lowerMsg.includes("perdi") || lowerMsg.includes("deje") || lowerMsg.includes("traje") || lowerMsg.includes("sin receta")) {
    const res = {
      intencion: "sin_receta",
      entidades: { producto: null, convenio: null, tiene_receta: false },
      requiere_humano: false,
      razon_humano: null,
      resumen: "El cliente no tiene receta médica."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Convenios
  if (lowerMsg.includes("convenio") || lowerMsg.includes("descuento") || lowerMsg.includes("caja bancaria") || lowerMsg.includes("cjpb") || lowerMsg.includes("quimica") || lowerMsg.includes("ferrocarril") || lowerMsg.includes("sayago") || lowerMsg.includes("fitlab") || lowerMsg.includes("racing") || lowerMsg.includes("mutualista") || lowerMsg.includes("catolico") || lowerMsg.includes("evangelico") || lowerMsg.includes("bps")) {
    if (lowerMsg.includes("sayago") || lowerMsg.includes("fitlab") || lowerMsg.includes("racing") || lowerMsg.includes("mutualista") || lowerMsg.includes("liga")) {
      const res = {
        intencion: "consulta_convenio",
        entidades: { producto: null, convenio: "mutualistas_sindicatos", tiene_receta: null },
        requiere_humano: true,
        razon_humano: "convenio_a_consultar",
        resumen: "Consulta sobre convenio a consultar/pendiente."
      };
      console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
      return res;
    }

    let convSlug = "caja_bancaria_cjpb";
    if (lowerMsg.includes("quimica") || lowerMsg.includes("stiq")) convSlug = "sindicato_quimica";
    else if (lowerMsg.includes("ferrocarril")) convSlug = "ferrocarril_norte";
    else if (lowerMsg.includes("catolico")) convSlug = "circulo_catolico";
    else if (lowerMsg.includes("evangelico")) convSlug = "hospital_evangelico";
    else if (lowerMsg.includes("bps")) convSlug = "bps";

    const res = {
      intencion: "consulta_convenio",
      entidades: { producto: null, convenio: convSlug, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: `Consulta sobre convenio ${convSlug}.`
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Derivaciones requeridas (fotocromáticos, varilux, lente completo, adaptaciones, turnos)
  if (lowerMsg.includes("fotocrom") || lowerMsg.includes("transition") || lowerMsg.includes("varilux") || lowerMsg.includes("multifocal") || lowerMsg.includes("completo") || lowerMsg.includes("armado") || lowerMsg.includes("caen") || lowerMsg.includes("ajuste") || lowerMsg.includes("turno")) {
    let razon = "fotocromaticos";
    if (lowerMsg.includes("varilux") || lowerMsg.includes("multifocal")) razon = "varilux";
    else if (lowerMsg.includes("completo") || lowerMsg.includes("armado")) razon = "lente_completo";
    else if (lowerMsg.includes("caen") || lowerMsg.includes("ajuste")) razon = "ajustes_adaptacion";
    else if (lowerMsg.includes("turno")) razon = "turnos";

    const res = {
      intencion: "consulta_derivar_humano",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: true,
      razon_humano: razon,
      resumen: `Derivación requerida a humano por ${razon}.`
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Tiempos de entrega
  if (lowerMsg.includes("demora") || lowerMsg.includes("demoran") || lowerMsg.includes("tarda") || lowerMsg.includes("tardan") || lowerMsg.includes("entrega")) {
    const res = {
      intencion: "tiempo_entrega",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta sobre tiempos de entrega."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Garantías
  if (lowerMsg.includes("garantia")) {
    if (lowerMsg.includes("especifica") || lowerMsg.includes("este modelo")) {
      const res = {
        intencion: "consulta_derivar_humano",
        entidades: { producto: null, convenio: null, tiene_receta: null },
        requiere_humano: true,
        razon_humano: "garantia_producto_especifico",
        resumen: "Consulta de garantía específica de producto."
      };
      console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
      return res;
    }

    const res = {
      intencion: "garantias",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta de garantía de adaptación."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Envíos
  if (lowerMsg.includes("envio") || lowerMsg.includes("interior") || lowerMsg.includes("domicilio")) {
    const res = {
      intencion: "envios",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta de envíos a domicilio."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Cuotas
  if (lowerMsg.includes("cuota") || lowerMsg.includes("tarjeta") || lowerMsg.includes("credito") || lowerMsg.includes("financiar")) {
    const res = {
      intencion: "cuotas",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta de cuotas y medios de pago."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Test gratis
  if (lowerMsg.includes("examen") || lowerMsg.includes("gratis") || lowerMsg.includes("test")) {
    const res = {
      intencion: "test_gratis",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta de test visual gratis."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Agradecimientos
  if (lowerMsg.includes("gracias") || lowerMsg.includes("impecable") || lowerMsg.includes("buenisimo")) {
    const res = {
      intencion: "agradecimiento",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Agradecimiento del cliente."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Despedidas
  if (lowerMsg.includes("saludos") || lowerMsg.includes("que pases bien") || lowerMsg.includes("igualmente")) {
    const res = {
      intencion: "despedida",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Despedida del cliente."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Consulta de precio antirreflejo / blueblocker / blanco / armazón / bifocal
  if (lowerMsg.includes("antirreflejo") || lowerMsg.includes("antireflejo") || lowerMsg.includes("blueblocker") || lowerMsg.includes("luz azul") || lowerMsg.includes("blanco") || lowerMsg.includes("armazon") || lowerMsg.includes("marcos") || lowerMsg.includes("bifocal") || lowerMsg.includes("precio") || lowerMsg.includes("cuanto sale") || lowerMsg.includes("incuyen") || lowerMsg.includes("incluyen")) {
    let prodSlug = "antirreflejo";
    if (lowerMsg.includes("blueblocker") || lowerMsg.includes("luz azul")) prodSlug = "blueblocker";
    else if (lowerMsg.includes("blanco")) prodSlug = "blanco";
    else if (lowerMsg.includes("armazon") || lowerMsg.includes("marcos") || lowerMsg.includes("incuyen") || lowerMsg.includes("incluyen")) prodSlug = "armazon";
    else if (lowerMsg.includes("bifocal")) prodSlug = "bifocal_sin_ar";

    const res = {
      intencion: "consulta_precio",
      entidades: { producto: prodSlug, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: `Consulta de precio para ${prodSlug}.`
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Horarios / Ubicación
  if (lowerMsg.includes("horario") || lowerMsg.includes("abren") || lowerMsg.includes("direccion") || lowerMsg.includes("donde")) {
    const res = {
      intencion: "horarios",
      entidades: { producto: null, convenio: null, tiene_receta: null },
      requiere_humano: false,
      razon_humano: null,
      resumen: "Consulta de horarios y dirección."
    };
    console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
    return res;
  }

  // Fallback final neutro seguro
  const resFallback = {
    intencion: "otra",
    entidades: { producto: null, convenio: null, tiene_receta: null },
    requiere_humano: false,
    razon_humano: null,
    resumen: "Mensaje general o sin clasificación específica."
  };
  console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(resFallback));
  return resFallback;
}