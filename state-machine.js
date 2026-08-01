import { getConfig } from './config-loader.js';
import { clasificarIntencion } from './intencion-classifier.js';

export const StateMachine = {
  async processMessage(contactId, userMessage, currentState = {}, options = {}) {
    const config = getConfig();
    const historial = options.historial || [];

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
          .replace(/^¡Hola!\s*😊?\s*/i, "")
          .replace(/^¡Hola!/i, "")
          .replace(/^Hola!/i, "")
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

    const intentResult = options.intentJson || await clasificarIntencion({
      mensaje: userMessage,
      historial: historial,
      config: config
    });

    const intenciones = intentResult.intenciones || (intentResult.intencion ? [intentResult.intencion] : ['otra']);

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

    const replySnippets = [];

    for (const intent of intenciones) {
      if (intent === 'sin_receta' || intentResult.entidades?.tiene_receta === false) {
        patch.preguntado_receta_chequeo = true;
        patch.funnel = 'CHEQUEO_REQUERIDO';
        if (yaPreguntoReceta) {
          replySnippets.push(`¡Entendido, disculpá la insistencia! ${config.mensajes.sin_receta}`);
        } else {
          replySnippets.push(`¡Sin ningún problema! ${config.mensajes.sin_receta}`);
        }
      } else if (intent === 'tengo_receta' || intentResult.entidades?.tiene_receta === true) {
        patch.funnel = 'ESPERANDO_FOTO_RECETA';
        patch.preguntado_receta_chequeo = true;
        replySnippets.push("Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos.");
      } else if (intent === 'consulta_convenio') {
        const convSlug = intentResult.entidades?.convenio;
        if (convSlug && config.convenios?.activos?.[convSlug]) {
          const item = config.convenios.activos[convSlug];
          replySnippets.push(`Con ${item.nombre} tenés ${item.descuento} (se coordina al momento de la compra).`);
        } else {
          replySnippets.push("Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Hospital Evangélico y Ferrocarril Norte.");
        }
      } else if (intent === 'consulta_precio') {
        const prodSlug = intentResult.entidades?.producto;
        const pArm = config.datos_que_el_bot_informa.armazones.precio_desde;

        if (prodSlug === 'antirreflejo') {
          const pAr = config.datos_que_el_bot_informa.cristales_simples.items.antirreflejo.precio;
          replySnippets.push(`El cristal con antirreflejo cuesta $${pAr.toLocaleString()} (solo cristal, armazones desde $${pArm.toLocaleString()}).`);
        } else if (prodSlug === 'blueblocker') {
          const pBlue = config.datos_que_el_bot_informa.cristales_simples.items.blueblocker.precio;
          replySnippets.push(`El cristal Blueblocker (luz azul) cuesta $${pBlue.toLocaleString()} (armazones desde $${pArm.toLocaleString()}).`);
        } else if (prodSlug === 'blanco') {
          const pBlanco = config.datos_que_el_bot_informa.cristales_simples.items.blanco.precio;
          replySnippets.push(`El cristal blanco cuesta $${pBlanco.toLocaleString()} (armazones aparte desde $${pArm.toLocaleString()}).`);
        } else if (prodSlug === 'armazon') {
          patch.funnel = 'PRESUPUESTADO';
          replySnippets.push(`Contamos con variedad de armazones desde $${pArm.toLocaleString()} (los cristales van aparte según la receta).`);
        } else if (prodSlug && prodSlug.startsWith('bifocal')) {
          const pSinAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_sin_ar.precio;
          const pConAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_con_ar.precio;
          const pSmartSinAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_smart_sin_ar.precio;
          const pSmartConAr = config.datos_que_el_bot_informa.bifocales.items.bifocal_smart_con_ar.precio;
          replySnippets.push(`En cristales bifocales contamos con opciones estándar desde $${pSinAr.toLocaleString()} ($${pConAr.toLocaleString()} con antirreflejo) y la línea Bifocal Smart desde $${pSmartSinAr.toLocaleString()} ($${pSmartConAr.toLocaleString()} con AR). Precios solo del cristal (armazones aparte desde $${pArm.toLocaleString()}).`);
        } else {
          const pBlanco = config.datos_que_el_bot_informa.cristales_simples.items.blanco.precio;
          const pAr = config.datos_que_el_bot_informa.cristales_simples.items.antirreflejo.precio;
          const pBlue = config.datos_que_el_bot_informa.cristales_simples.items.blueblocker.precio;
          patch.funnel = 'PRESUPUESTADO';
          replySnippets.push(`Tenemos cristales desde $${pBlanco.toLocaleString()} (Blanco), $${pAr.toLocaleString()} (Antirreflejo) y $${pBlue.toLocaleString()} (Blueblocker). Armazones aparte desde $${pArm.toLocaleString()}.`);
        }
      } else if (intent === 'horarios') {
        replySnippets.push(`Estamos en ${config.negocio.direccion} (atendemos ${config.negocio.horarios.texto}).`);
      } else if (intent === 'cuotas') {
        replySnippets.push(config.mensajes.cuotas);
      } else if (intent === 'envios') {
        replySnippets.push(config.mensajes.envios);
      } else if (intent === 'tiempo_entrega') {
        const tMono = config.tiempos_de_entrega.monofocales_estandar;
        const tMulti = config.tiempos_de_entrega.multifocales_progresivos;
        replySnippets.push(`Los monofocales tardan ${tMono} y los multifocales ${tMulti}.`);
      } else if (intent === 'garantias') {
        replySnippets.push(config.garantias.adaptacion);
      } else if (intent === 'test_gratis') {
        replySnippets.push(config.mensajes.test_gratis);
      } else if (intent === 'lentes_de_sol') {
        replySnippets.push("Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas). 😎");
      } else if (intent === 'agradecimiento') {
        replySnippets.push("¡Por nada! 😊 Quedamos a las órdenes.");
      } else if (intent === 'despedida') {
        replySnippets.push("¡Muchas gracias a ti! 👍 Saludos.");
      } else if (intent === 'promo') {
        patch.preguntado_receta_chequeo = true;
        replySnippets.push(`En ${config.negocio.nombre} (${config.negocio.direccion}) contamos con test visual 100% GRATIS.`);
      } else if (intent === 'saludo' && replySnippets.length === 0) {
        patch.saludo_enviado = true;
        replySnippets.push(`¡Hola! 😊 En ${config.negocio.nombre} (${config.negocio.direccion}) hacemos test visual 100% GRATIS.`);
      }
    }

    if (replySnippets.length === 0) {
      replySnippets.push("Con gusto te asesoramos. Podés enviarnos la foto de tu receta o contarme qué cristal o armazón buscás.");
    }

    const combinedBody = replySnippets.join(" ");
    return {
      action: 'REPLY_TEXT',
      reply: buildReply(combinedBody),
      patch,
      intent: intentResult
    };
  }
};