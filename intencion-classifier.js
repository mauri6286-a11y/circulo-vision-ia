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
Tu tarea es analizar el mensaje del cliente y el historial de la conversación, y devolver UNICAMENTE un JSON válido con esta estructura exacta:

{
  "intenciones": ["promo" | "consulta_precio" | "consulta_convenio" | "sin_receta" | "tengo_receta" | "lentes_de_sol" | "horarios" | "envios" | "cuotas" | "tiempo_entrega" | "test_gratis" | "saludo" | "agradecimiento" | "despedida" | "consulta_derivar_humano" | "otra"],
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
1. SOPORTAR MÚLTIPLES INTENCIONES: Si el cliente hace varias preguntas en un mismo mensaje (ej: precio + cuotas + dirección), incluir TODAS las intenciones detectadas en el array "intenciones".
2. "sin_receta": Si indica que no tiene receta ("no tengo receta", "la perdí", "la dejé en casa", "no la traje"), incluir "sin_receta", tiene_receta: false.
3. "tengo_receta": Si indica que si tiene receta ("tengo receta", "con receta"), incluir "tengo_receta", tiene_receta: true.
4. "consulta_convenio":
   - Si menciona un convenio activo (${conveniosActivos.join(', ')}), poner el slug en entidades.convenio y requiere_humano: false.
   - Si menciona UN CONVENIO NO LISTADO O PENDIENTE (ej: "antel", "ancap", "sayago", "fitlab"), poner el slug en entidades.convenio y exige requiere_humano: true, razon_humano: "convenio_a_consultar".
5. "requiere_humano: true": Si pregunta por fotocromáticos, multifocales/varilux, lente completo armado, reclamos, adaptaciones, turnos, o preguntas fuera de tema (wifi, mascotas).
6. "consulta_precio": Si pregunta precio de un producto puntual (antirreflejo, blueblocker, cristal blanco, bifocal, armazón), incluir "consulta_precio" y poner el slug exacto en entidades.producto.
7. NO inventar datos.
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
      // Asegurar compatibilidad array intenciones
      if (!Array.isArray(resultJson.intenciones) && resultJson.intencion) {
        resultJson.intenciones = [resultJson.intencion];
      }
      console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(resultJson));
      return resultJson;
    } catch (err) {
      console.error(`[ERROR] Fallo en clasificarIntencion con Gemini API: ${err.message}. Ejecutando fallback seguro.`);
    }
  } else {
    console.log('[DEBUG] GEMINI_API_KEY no detectada. Usando motor semántico estructural local.');
  }

  // Normalizar acentos y typos
  let lowerMsg = (mensaje || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  lowerMsg = lowerMsg.replace(/\bkuanto\b/g, "cuanto").replace(/\bkristal\b/g, "cristal").replace(/\barrefl/g, "antirrefle");

  const intencionesSet = new Set();
  const entidades = { producto: null, convenio: null, tiene_receta: null };
  let requiere_humano = false;
  let razon_humano = null;

  // 1. Fuera de tema
  if (lowerMsg.includes("wifi") || lowerMsg.includes("mascota") || lowerMsg.includes("perro") || lowerMsg.includes("estacionamiento")) {
    intencionesSet.add("consulta_derivar_humano");
    requiere_humano = true;
    razon_humano = "otro";
  }

  // 2. Promo
  if (lowerMsg.includes("promo") || lowerMsg.includes("source url") || lowerMsg.includes("headline") || lowerMsg.includes("fb.me") || lowerMsg.includes("instagram")) {
    intencionesSet.add("promo");
  }

  // 3. Lentes de sol
  if (lowerMsg.includes("lentes de sol") || lowerMsg.includes("lente de sol") || lowerMsg.includes("gafas de sol") || (lowerMsg.includes("sol") && lowerMsg.includes("polariz"))) {
    intencionesSet.add("lentes_de_sol");
  }

  // 4. Receta
  if (lowerMsg.includes("no tengo") || lowerMsg.includes("perdi") || lowerMsg.includes("deje") || lowerMsg.includes("traje") || lowerMsg.includes("sin receta")) {
    intencionesSet.add("sin_receta");
    entidades.tiene_receta = false;
  } else if ((lowerMsg.includes("tengo receta") || lowerMsg.includes("con receta") || lowerMsg.includes("tengo la receta")) && !lowerMsg.includes("no tengo")) {
    intencionesSet.add("tengo_receta");
    entidades.tiene_receta = true;
  }

  // 5. Convenios
  if (lowerMsg.includes("convenio") || lowerMsg.includes("descuento") || lowerMsg.includes("caja bancaria") || lowerMsg.includes("cjpb") || lowerMsg.includes("quimica") || lowerMsg.includes("ferrocarril") || lowerMsg.includes("sayago") || lowerMsg.includes("fitlab") || lowerMsg.includes("racing") || lowerMsg.includes("mutualista") || lowerMsg.includes("catolico") || lowerMsg.includes("evangelico") || lowerMsg.includes("bps") || lowerMsg.includes("antel") || lowerMsg.includes("ancap")) {
    intencionesSet.add("consulta_convenio");
    if (lowerMsg.includes("antel") || lowerMsg.includes("sayago") || lowerMsg.includes("fitlab") || lowerMsg.includes("racing") || lowerMsg.includes("mutualista")) {
      requiere_humano = true;
      razon_humano = "convenio_a_consultar";
      entidades.convenio = lowerMsg.includes("antel") ? "antel" : "convenio_desconocido";
    } else {
      if (lowerMsg.includes("quimica") || lowerMsg.includes("stiq")) entidades.convenio = "sindicato_quimica";
      else if (lowerMsg.includes("catolico")) entidades.convenio = "circulo_catolico";
      else if (lowerMsg.includes("evangelico")) entidades.convenio = "hospital_evangelico";
      else if (lowerMsg.includes("ferrocarril")) entidades.convenio = "ferrocarril_norte";
      else if (lowerMsg.includes("bps")) entidades.convenio = "bps";
      else entidades.convenio = "caja_bancaria_cjpb";
    }
  }

  // 6. Derivaciones requeridas
  if (lowerMsg.includes("fotocrom") || lowerMsg.includes("transition") || lowerMsg.includes("varilux") || lowerMsg.includes("multifocal") || lowerMsg.includes("completo") || lowerMsg.includes("armado") || lowerMsg.includes("caen") || lowerMsg.includes("ajuste") || lowerMsg.includes("turno")) {
    intencionesSet.add("consulta_derivar_humano");
    requiere_humano = true;
    if (lowerMsg.includes("fotocrom")) razon_humano = "fotocromaticos";
    else if (lowerMsg.includes("varilux") || lowerMsg.includes("multifocal")) razon_humano = "varilux";
    else if (lowerMsg.includes("completo") || lowerMsg.includes("armado")) razon_humano = "lente_completo";
    else if (lowerMsg.includes("caen") || lowerMsg.includes("ajuste")) razon_humano = "ajustes_adaptacion";
    else if (lowerMsg.includes("turno")) razon_humano = "turnos";
  }

  // 7. Precios / Productos
  if (lowerMsg.includes("antirreflejo") || lowerMsg.includes("antireflejo") || lowerMsg.includes("blueblocker") || lowerMsg.includes("blanco") || lowerMsg.includes("armazon") || lowerMsg.includes("marcos") || lowerMsg.includes("bifocal") || lowerMsg.includes("precio") || lowerMsg.includes("cuanto sale") || lowerMsg.includes("cuanto me sale") || lowerMsg.includes("incuyen") || lowerMsg.includes("incluyen")) {
    intencionesSet.add("consulta_precio");
    if (lowerMsg.includes("bifocal")) entidades.producto = "bifocal_sin_ar";
    else if (lowerMsg.includes("blueblocker")) entidades.producto = "blueblocker";
    else if (lowerMsg.includes("blanco")) entidades.producto = "blanco";
    else if (lowerMsg.includes("armazon") || lowerMsg.includes("marcos") || lowerMsg.includes("incuyen") || lowerMsg.includes("incluyen")) entidades.producto = "armazon";
    else if (lowerMsg.includes("antirreflejo") || lowerMsg.includes("antireflejo")) entidades.producto = "antirreflejo";
  }

  // 8. Cuotas
  if (lowerMsg.includes("cuota") || lowerMsg.includes("cuotas") || lowerMsg.includes("tarjeta") || lowerMsg.includes("credito") || lowerMsg.includes("financiar")) {
    intencionesSet.add("cuotas");
  }

  // 9. Envíos
  if (lowerMsg.includes("envio") || lowerMsg.includes("envios") || lowerMsg.includes("interior") || lowerMsg.includes("domicilio")) {
    intencionesSet.add("envios");
  }

  // 10. Horarios / Ubicación
  if (lowerMsg.includes("horario") || lowerMsg.includes("abren") || lowerMsg.includes("direccion") || lowerMsg.includes("donde") || lowerMsg.includes("estan") || lowerMsg.includes("quedan")) {
    intencionesSet.add("horarios");
  }

  // 11. Tiempos de entrega
  if (lowerMsg.includes("demora") || lowerMsg.includes("demoran") || lowerMsg.includes("tarda") || lowerMsg.includes("tardan") || lowerMsg.includes("entrega")) {
    intencionesSet.add("tiempo_entrega");
  }

  // 12. Garantías
  if (lowerMsg.includes("garantia")) {
    if (lowerMsg.includes("especifica") || lowerMsg.includes("este modelo")) {
      intencionesSet.add("consulta_derivar_humano");
      requiere_humano = true;
      razon_humano = "garantia_producto_especifico";
    } else {
      intencionesSet.add("garantias");
    }
  }

  // 13. Test gratis / Chequeo
  if (lowerMsg.includes("examen") || lowerMsg.includes("gratis") || lowerMsg.includes("test") || lowerMsg.includes("chequeo")) {
    intencionesSet.add("test_gratis");
  }

  // 14. Agradecimientos
  if (lowerMsg.includes("gracias") || lowerMsg.includes("impecable") || lowerMsg.includes("buenisimo")) {
    intencionesSet.add("agradecimiento");
  }

  // 15. Despedidas
  if (lowerMsg.includes("saludos") || lowerMsg.includes("que pases bien") || lowerMsg.includes("igualmente")) {
    intencionesSet.add("despedida");
  }

  // 16. Saludo / Ambiguo
  if (intencionesSet.size === 0 && (lowerMsg.includes("hola") || lowerMsg.includes("necesito") || lowerMsg.includes("lentes"))) {
    intencionesSet.add("saludo");
  }

  const intencionesList = Array.from(intencionesSet);
  if (intencionesList.length === 0) {
    intencionesList.push("otra");
  }

  const res = {
    intenciones: intencionesList,
    entidades,
    requiere_humano,
    razon_humano,
    resumen: `Intenciones detectadas: ${intencionesList.join(", ")}.`
  };

  console.log(`[INTENCION] ${mensaje}:`, JSON.stringify(res));
  return res;
}