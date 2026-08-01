import { getConfig } from './config-loader.js';
import { clasificarIntencion } from './intencion-classifier.js';

export const StateMachine = {
  async processMessage(contactId, userMessage, currentState = {}, options = {}) {
    const config = getConfig();
    const historial = options.historial || [];

    // 1. SI IA YA ESTÁ EN TRASPASO O PAUSADA
    if (currentState.funnel === 'TRASPASO_HUMANO' || currentState.ia_pausada) {
      return { action: 'IGNORE_HUMAN_ACTIVE', patch: {} };
    }

    const patch = {};
    const yaSaludado = Boolean(currentState.saludo_enviado);
    const yaPreguntoReceta = Boolean(currentState.preguntado_receta_chequeo);

    const buildHandoffReply = (reasonText = "") => {
      const now = new Date();
      const opts = { timeZone: config.negocio.zona_horaria || 'America/Montevideo', hour12: false, weekday: 'short', hour: '2-digit' };
      const formatter = new Intl.DateTimeFormat('es-UY', opts);
      const parts = formatter.formatToParts(now);
      const map = {};
      parts.forEach(p => { map[p.type] = p.value; });

      const hour = parseInt(map.hour || '0', 10);
      const dayStr = (map.weekday || "").toLowerCase();

      const isSunday = dayStr.includes('dom') || dayStr.includes('sun');
      const isSaturday = dayStr.includes('sáb') || dayStr.includes('sab') || dayStr.includes('sat');

      let inHours = false;
      if (isSunday) {
        inHours = false;
      } else if (isSaturday) {
        inHours = hour >= 9 && hour < 14;
      } else {
        inHours = hour >= 9 && hour < 19;
      }

      const prefix = reasonText ? `${reasonText.trim()} ` : "";
      const handoffText = inHours ? config.mensajes.handoff_en_horario : config.mensajes.handoff_fuera_horario;

      return `${prefix}${handoffText} [SOLICITA_HUMANO]`.trim();
    };

    const buildReply = (baseText, recetaChequeoQuestion = "") => {
      let text = baseText;

      if (yaSaludado) {
        text = text
          .replace(/^¡Hola!\s*😊\s*/i, "")
          .replace(/^¡Hola!\s*/i, "")
          .replace(/^Hola!\s*/i, "")
          .replace(/^Hola,\s*/i, "")
          .replace(/^Hola\s*/i, "");

        if (text.length > 0) {
          text = text.charAt(0).toUpperCase() + text.slice(1);
        }
      }

      if (!yaPreguntoReceta && recetaChequeoQuestion) {
        text = `${text.trim()} ${recetaChequeoQuestion.trim()}`;
        patch.preguntado_receta_chequeo = true;
      }

      patch.saludo_enviado = true;
      return text.trim();
    };

    // 2. LLAMADA A LA CAPA DE INTENCIÓN DE GEMINI (O REUTILIZAR INTENT SI FUE PREPROCESADO)
    const intentResult = options.intentJson || await clasificarIntencion({
      mensaje: userMessage,
      historial: historial,
      config: config
    });

    // 3. SI GEMINI DETERMINÓ QUE REQUIERE HUMANO -> TRASPASO DIRECTO
    if (intentResult.requiere_humano) {
      let reasonMsg = "";
      if (intentResult.razon_humano === "fotocromaticos") {
        reasonMsg = "Para darte el presupuesto exacto de cristales fotocromáticos según tu receta,";
      } else if (intentResult.razon_humano === "varilux") {
        reasonMsg = "Para lentes multifocales Varilux y cotización personalizada,";
      } else if (intentResult.razon_humano === "lente_completo") {
        reasonMsg = "Para cotizarte el lente completo armado con el armazón y tu receta sumados,";
      } else if (intentResult.razon_humano === "convenio_a_consultar") {
        reasonMsg = "Para confirmarte el descuento específico de ese convenio/institución,";
      } else if (intentResult.razon_humano === "ajustes_adaptacion") {
        reasonMsg = "Para revisar la adaptación y el ajuste de tus lentes,";
      } else if (intentResult.razon_humano === "turnos") {
        reasonMsg = "Para coordinar la reserva de tu turno,";
      } else if (intentResult.razon_humano === "garantia_producto_especifico") {
        reasonMsg = "Para confirmarte la garantía exacta de ese producto específico,";
      }

      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply(reasonMsg),
        patch: { funnel: 'TRASPASO_HUMANO' },
        intent: intentResult
      };
    }

    const lowerMsg = (userMessage || "").toLowerCase();
    const isCompoundEnvios = lowerMsg.includes("envio") || lowerMsg.includes("envios");

    // 4. EVALUACIÓN DETERMINISTA SOBRE LA INTENCIÓN Y ENTIDADES CLASIFICADAS POR GEMINI

    // A. SIN RECETA (tiene_receta === false o intencion === 'sin_receta')
    if (intentResult.intencion === 'sin_receta' || intentResult.entidades?.tiene_receta === false) {
      patch.preguntado_receta_chequeo = true;
      patch.funnel = 'CHEQUEO_REQUERIDO';

      if (yaPreguntoReceta) {
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`¡Entendido, disculpá la insistencia! ${config.mensajes.sin_receta}`),
          patch,
          intent: intentResult
        };
      } else {
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`¡Sin ningún problema! ${config.mensajes.sin_receta}`),
          patch,
          intent: intentResult
        };
      }
    }

    // A2. TENGO RECETA (tiene_receta === true o intencion === 'tengo_receta')
    if (intentResult.intencion === 'tengo_receta' || intentResult.entidades?.tiene_receta === true) {
      patch.funnel = 'ESPERANDO_FOTO_RECETA';
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Bárbaro! Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos, o si preferís coordinamos un chequeo gratis. ¿Qué te queda mejor?"),
        patch,
        intent: intentResult
      };
    }

    // B. CONSULTA CONVENIO
    if (intentResult.intencion === 'consulta_convenio') {
      const convSlug = intentResult.entidades?.convenio;
      if (convSlug && config.convenios?.activos?.[convSlug]) {
        const item = config.convenios.activos[convSlug];
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`Con ${item.nombre} tenés ${item.descuento}. Para aplicarlo, se coordina al momento de la compra en el local.`),
          patch,
          intent: intentResult
        };
      } else {
        return {
          action: 'REPLY_TEXT',
          reply: buildReply("Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Hospital Evangélico y Ferrocarril Norte. ¿A cuál pertenecés así te paso el descuento exacto?"),
          patch,
          intent: intentResult
        };
      }
    }

    // C. CONSULTA PRECIO
    if (intentResult.intencion === 'consulta_precio') {
      const prodSlug = intentResult.entidades?.producto;
      const pArm = config.datos_que_el_bot_informa.armazones.precio_desde;
      const enviosNote = isCompoundEnvios ? " Además, hacemos envíos a domicilio en todo el país (la toma de medidas se realiza en el local)." : "";

      if (prodSlug === 'antirreflejo') {
        const pAr = config.datos_que_el_bot_informa.cristales_simples.items.antirreflejo.precio;
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`El cristal con antirreflejo tiene un costo de $${pAr.toLocaleString()} (solo cristal, el armazón va aparte desde $${pArm.toLocaleString()}).${enviosNote}`, "¿Es para cerca, lejos o bifocal así te confirmamos exacto?"),
          patch,
          intent: intentResult
        };
      }
      if (prodSlug === 'blueblocker') {
        const pBlue = config.datos_que_el_bot_informa.cristales_simples.items.blueblocker.precio;
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`El cristal con filtro Blueblocker (luz azul para pantallas) cuesta $${pBlue.toLocaleString()} (solo cristal, armazones desde $${pArm.toLocaleString()}).${enviosNote}`, "¿Tenés receta médica o precisás coordinar un chequeo gratis?"),
          patch,
          intent: intentResult
        };
      }
      if (prodSlug === 'blanco') {
        const pBlanco = config.datos_que_el_bot_informa.cristales_simples.items.blanco.precio;
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`El cristal blanco estándar tiene un costo de $${pBlanco.toLocaleString()} (solo cristal, armazones aparte desde $${pArm.toLocaleString()}).${enviosNote}`, "¿Querés consultar presupuesto con tu receta o coordinar chequeo gratis?"),
          patch,
          intent: intentResult
        };
      }
      if (prodSlug === 'armazon') {
        patch.funnel = 'PRESUPUESTADO';
        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`Contamos con variedad de armazones desde $${pArm.toLocaleString()} (los cristales van aparte según la receta).${enviosNote}`, "¿Buscás armazones de hombre, dama, niños o querés probarte en el local?"),
          patch,
          intent: intentResult
        };
      }
      if (prodSlug && prodSlug.startsWith('bifocal')) {
        const pSinAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_sin_ar.precio;
        const pConAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_con_ar.precio;
        const pSmartSinAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_smart_sin_ar.precio;
        const pSmartConAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_smart_con_ar.precio;

        return {
          action: 'REPLY_TEXT',
          reply: buildReply(`En cristales bifocales contamos con opciones estándar desde $${pSinAr.toLocaleString()} ($${pConAr.toLocaleString()} con antirreflejo) y la línea Bifocal Smart de lumen invisible desde $${pSmartSinAr.toLocaleString()} ($${pSmartConAr.toLocaleString()} con antirreflejo). Precios solo del cristal (armazones aparte desde $${pArm.toLocaleString()}).${enviosNote}`),
          patch,
          intent: intentResult
        };
      }

      const pBlanco = config.datos_que_el_bot_informa.cristales_simples.items.blanco.precio;
      const pAr = config.datos_que_el_bot_informa.cristales_simples.items.antirreflejo.precio;
      const pBlue = config.datos_que_el_bot_informa.cristales_simples.items.blueblocker.precio;
      patch.funnel = 'PRESUPUESTADO';
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`El precio depende del cristal que necesites: tenemos cristales desde $${pBlanco.toLocaleString()} (Blanco), $${pAr.toLocaleString()} (Antirreflejo) y $${pBlue.toLocaleString()} (Blueblocker). Los armazones van aparte desde $${pArm.toLocaleString()}.${enviosNote}`),
        patch,
        intent: intentResult
      };
    }

    // D. HORARIOS Y UBICACIÓN
    if (intentResult.intencion === 'horarios') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`Estamos en ${config.negocio.direccion}. Atendemos en horario de ${config.negocio.horarios.texto}. Podés pasar a probarte los armazones que gustes en cualquier momento.`),
        patch,
        intent: intentResult
      };
    }

    // E. TIEMPOS DE ENTREGA
    if (intentResult.intencion === 'tiempo_entrega') {
      const tMono = config.tiempos_de_entrega.monofocales_estandar;
      const tMulti = config.tiempos_de_entrega.multifocales_progresivos;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`Los cristales monofocales tardan ${tMono} y los multifocales/bifocales ${tMulti}.`),
        patch,
        intent: intentResult
      };
    }

    // F. GARANTÍAS DE ADAPTACIÓN
    if (intentResult.intencion === 'garantias') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`${config.garantias.adaptacion} ¿Precisás consultar por algún modelo en particular?`),
        patch,
        intent: intentResult
      };
    }

    // G. ENVÍOS
    if (intentResult.intencion === 'envios') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(config.mensajes.envios),
        patch,
        intent: intentResult
      };
    }

    // H. CUOTAS / TARJETAS
    if (intentResult.intencion === 'cuotas') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(config.mensajes.cuotas),
        patch,
        intent: intentResult
      };
    }

    // I. TEST GRATIS
    if (intentResult.intencion === 'test_gratis') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(config.mensajes.test_gratis),
        patch,
        intent: intentResult
      };
    }

    // J. LENTES DE SOL
    if (intentResult.intencion === 'lentes_de_sol') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas como Oahu, Bric à Brac, GX7). 😎 ¿Buscás algún modelo en particular o querés probarte en el local?"),
        patch,
        intent: intentResult
      };
    }

    // K. AGRADECIMIENTOS
    if (intentResult.intencion === 'agradecimiento') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Por nada! 😊 Quedamos a las órdenes por cualquier consulta. ¡Que tengas un excelente día!"),
        patch,
        intent: intentResult
      };
    }

    // L. DESPEDIDAS
    if (intentResult.intencion === 'despedida') {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Muchas gracias a ti! 👍 Saludos y buena jornada."),
        patch,
        intent: intentResult
      };
    }

    // M. PROMO / AD
    if (intentResult.intencion === 'promo') {
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`Veo que nos escribes por nuestra promo activa. En ${config.negocio.nombre} (${config.negocio.direccion}) contamos con test visual 100% GRATIS.`, "¿Ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?"),
        patch,
        intent: intentResult
      };
    }

    // N. SALUDO
    if (intentResult.intencion === 'saludo') {
      patch.saludo_enviado = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(`¡Hola! 😊 En ${config.negocio.nombre} (${config.negocio.direccion}) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?`),
        patch,
        intent: intentResult
      };
    }

    // FALLBACK GENERAL
    patch.saludo_enviado = true;
    return {
      action: 'REPLY_TEXT',
      reply: yaSaludado
        ? "Con gusto te asesoramos. Podés enviarnos la foto de tu receta o contarme qué cristal o armazón buscás para darte la info exacta."
        : `¡Hola! 😊 En ${config.negocio.nombre} (${config.negocio.direccion}) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?`,
      patch,
      intent: intentResult
    };
  }
};