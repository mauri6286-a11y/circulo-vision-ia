export const StateMachine = {
  processMessage(contactId, userMessage, currentState = {}) {
    const msg = userMessage ? userMessage.toLowerCase().trim() : "";
    const yaSaludado = Boolean(currentState.saludo_enviado);
    const yaPreguntoReceta = Boolean(currentState.preguntado_receta_chequeo);

    // 1. SI IA YA ESTÁ EN TRASPASO O PAUSADA
    if (currentState.funnel === 'TRASPASO_HUMANO' || currentState.ia_pausada) {
      return { action: 'IGNORE_HUMAN_ACTIVE', patch: {} };
    }

    const patch = {};

    const buildHandoffReply = (reasonText = "") => {
      const now = new Date();
      const options = { timeZone: 'America/Montevideo', hour12: false, weekday: 'short', hour: '2-digit' };
      const formatter = new Intl.DateTimeFormat('es-UY', options);
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

      if (inHours) {
        return `${prefix}Le paso tu consulta a nuestro equipo, que te va a responder en breve por acá. 😊 [SOLICITA_HUMANO]`.trim();
      } else {
        return `${prefix}Le dejo tu consulta a nuestro equipo. Te responden apenas abramos en nuestro horario de atención (Lun a Vie 9 a 19 hs, Sáb 9 a 14 hs). ¡Muchas gracias! [SOLICITA_HUMANO]`.trim();
      }
    };

    // PASO 6 — MENSAJES SIN TEXTO / ADJUNTOS / COMPROBANTES / PDF
    if (!msg || msg === "[adjunto]" || msg.includes(".pdf") || msg.includes("comprobante") || msg.includes("recibo") || msg.includes("transferencia") || msg.includes("pago realizado")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("¡Recibido!"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

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

    // 2. COLABORACIONES / ACUERDOS / PROPUESTAS / INFLUENCERS / B2B -> TRASPASO A HUMANO
    if (msg.includes("colaborar") || msg.includes("colaboracion") || msg.includes("colaboración") || msg.includes("colaboraciones") || msg.includes("acuerdo") || msg.includes("otra optica") || msg.includes("otra óptica") || msg.includes("propuesta") || msg.includes("canje") || msg.includes("influencer") || msg.includes("publicidad")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Con gusto."),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 3. PROBLEMAS DE ADAPTACIÓN / AJUSTE / LENTES QUE SE CAEN -> TRASPASO A HUMANO
    if (msg.includes("caen") || msg.includes("caen al piso") || msg.includes("se me caen") || msg.includes("ajuste") || msg.includes("patilla") || msg.includes("patillas") || msg.includes("adaptacion") || msg.includes("adaptación") || msg.includes("aflojo") || msg.includes("aflojó") || msg.includes("me aprieta") || msg.includes("me molesta") || msg.includes("veo borroso") || msg.includes("no veo bien")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para revisar la adaptación y el ajuste de tus lentes,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 4. RETIRO / ESTADO DE LENTES DE TALLER -> TRASPASO A HUMANO
    if (msg.includes("llegaron") || msg.includes("listos") || msg.includes("prontos") || msg.includes("retirar") || msg.includes("mi pedido") || msg.includes("mis lentes") || msg.includes("taller") || msg.includes("buscar mi pedido")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para confirmarte el estado exacto de tu pedido en taller,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 5. AGENDAMIENTO / TURNOS / RESERVAS -> TRASPASO A HUMANO
    if (msg.includes("agendar") || msg.includes("agendarme") || msg.includes("agendame") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("cita") || msg.includes("reserva") || msg.includes("reservar") || msg.includes("reservás") || msg.includes("reservas")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para coordinar la reserva de tu turno,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 6. FOTOCROMÁTICOS / TRANSITIONS -> TRASPASO A HUMANO
    if (msg.includes("fotocrom") || msg.includes("transition") || msg.includes("fotosensibl")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para darte el presupuesto exacto de cristales fotocromáticos según tu receta,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 7. VARILUX / MULTIFOCALES DIGITALES -> TRASPASO A HUMANO
    if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor") || msg.includes("multifocal") || msg.includes("multifocales")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para lentes multifocales Varilux y cotización personalizada,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 8. COTIZACIÓN DEL LENTE COMPLETO ARMADO / COMBO -> TRASPASO A HUMANO
    if ((msg.includes("completo") || msg.includes("armado") || msg.includes("sumados") || msg.includes("ambos")) && (msg.includes("lente") || msg.includes("precio") || msg.includes("cuanto"))) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: buildHandoffReply("Para cotizarte el lente completo armado con el armazón y tu receta sumados,"),
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 9. CLIENTE AFIRMA NO TENER RECETA / REPETICIÓN "YA TE DIJE QUE NO TENGO"
    if (msg.includes("no tengo receta") || msg.includes("no la tengo") || msg.includes("sin receta") || msg.includes("ya te dije") || msg.includes("ya dije") || msg.includes("aun no") || msg.includes("aún no") || msg.includes("todavia no") || msg.includes("todavía no") || (msg.includes("no tengo") && !msg.includes("receta médica"))) {
      patch.preguntado_receta_chequeo = true;
      patch.funnel = 'CHEQUEO_REQUERIDO';

      if (yaPreguntoReceta || msg.includes("ya te dije") || msg.includes("ya dije")) {
        return {
          action: 'REPLY_TEXT',
          reply: buildReply("¡Entendido, disculpá la insistencia! Como no tenés receta, lo resolvemos súper fácil con un chequeo visual 100% GRATIS en nuestro local de Av. Millán 4494 para hacerte la receta en el momento. ¿Te queda bien pasar entre semana (9 a 19 hs) o un sábado (9 a 14 hs)?"),
          patch
        };
      } else {
        return {
          action: 'REPLY_TEXT',
          reply: buildReply("¡Sin ningún problema! Lo resolvemos coordinando un chequeo visual 100% GRATIS en nuestro local de Av. Millán 4494 para hacer la receta en el momento. ¿Te queda mejor pasar entre semana o un sábado?"),
          patch
        };
      }
    }

    // 10. TENGO RECETA (DEBE EXCLUIR EXPRESIONES NEGATIVAS COMO "NO TENGO RECETA")
    if ((msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("lentes de receta") || msg.includes("lentes de reseta")) && !msg.includes("no tengo") && !msg.includes("no la tengo") && !msg.includes("ya te dije")) {
      patch.funnel = 'ESPERANDO_FOTO_RECETA';
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Bárbaro! Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos, o si preferís coordinamos un chequeo gratis. ¿Qué te queda mejor?"),
        patch
      };
    }

    // 11. ENTRADA POR ANUNCIOS / PROMOS
    if (msg.includes("source url") || msg.includes("headline") || msg.includes("fb.me") || msg.includes("instagram.com/p/") || msg.includes("promo")) {
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Veo que nos escribes por nuestra promo activa. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS.", "¿Ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?"),
        patch
      };
    }

    // 12. BIFOCALES
    if (msg.includes("bifocal") || msg.includes("bifocales")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "En cristales bifocales contamos con opciones estándar desde $5.490 ($7.490 con antirreflejo) y la línea Bifocal Smart de lumen invisible desde $6.490 ($8.490 con antirreflejo). Precios solo del cristal (armazones aparte desde $2.490).",
          "¿Tenés la foto de tu receta a mano para asesorarte mejor?"
        ),
        patch
      };
    }

    // 13. PRECIO ESPECÍFICO: ANTIRREFLEJO
    if (msg.includes("antirreflejo") || msg.includes("antireflejo") || msg.includes("ar ")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "El cristal con antirreflejo tiene un costo de $2.200 (solo cristal, el armazón va aparte desde $2.490).",
          "¿Es para cerca, lejos o bifocal así te confirmamos exacto?"
        ),
        patch
      };
    }

    // 14. PRECIO ESPECÍFICO: BLUEBLOCKER / LUZ AZUL
    if (msg.includes("blueblocker") || msg.includes("blue blocker") || msg.includes("luz azul") || msg.includes("pantalla") || msg.includes("computadora")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "El cristal con filtro Blueblocker (luz azul para pantallas) cuesta $3.200 (solo cristal, armazones desde $2.490).",
          "¿Tenés receta médica o precisás coordinar un chequeo gratis?"
        ),
        patch
      };
    }

    // 15. PRECIO ESPECÍFICO: CRISTAL BLANCO / COMÚN
    if (msg.includes("blanco") || msg.includes("cristal comun") || msg.includes("cristal común") || msg.includes("cristal simple") || msg.includes("mas economico") || msg.includes("más económico")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "El cristal blanco estándar tiene un costo de $1.300 (solo cristal, armazones aparte desde $2.490).",
          "¿Querés consultar presupuesto con tu receta o coordinar chequeo gratis?"
        ),
        patch
      };
    }

    // 16. ENVÍOS AL INTERIOR
    if (msg.includes("artigas") || msg.includes("salto") || msg.includes("rivera") || msg.includes("maldonado") || msg.includes("rocha") || msg.includes("tacuarembo") || msg.includes("tacuarembó") || msg.includes("colonia") || msg.includes("minas") || msg.includes("durazno") || msg.includes("florida") || msg.includes("san jose") || msg.includes("san josé") || msg.includes("mercedes") || msg.includes("treinta y tres") || msg.includes("rio negro") || msg.includes("soriano") || msg.includes("cerro largo") || msg.includes("interior") || msg.includes("envio") || msg.includes("envíos") || msg.includes("despacho")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "¡Hacemos envíos a todo el país! Podés enviarnos la foto de tu receta por acá, te mostramos opciones de armazones por foto/video y te enviamos tus lentes prontos por agencia."
        ),
        patch
      };
    }

    // 17. CONVENIOS
    if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico") || msg.includes("católico") || msg.includes("evangélico")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y clubes deportivos. ¿A qué convenio pertenecés así te paso el descuento exacto?"
        ),
        patch
      };
    }

    // 18. CUOTAS / TARJETAS
    if (msg.includes("cuota") || msg.includes("cuotas") || msg.includes("tarjeta") || msg.includes("pago") || msg.includes("credito") || msg.includes("crédito") || msg.includes("debito") || msg.includes("débito") || msg.includes("financiar")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo, débito y efectivo. 💳",
          "¿Querés consultar presupuesto o coordinar chequeo gratis?"
        ),
        patch
      };
    }

    // 19. HORARIOS / DÍAS / APERTURA / PROBARSE EN EL LOCAL
    if (msg.includes("horario") || msg.includes("horarios") || msg.includes("abren") || msg.includes("abierto") || msg.includes("que hora") || msg.includes("qué hora") || msg.includes("hasta que hora") || msg.includes("hasta qué hora") || msg.includes("probarme") || msg.includes("probar") || msg.includes("pasar por el local") || msg.includes("ir al local") || msg.includes("pasar por ahi") || msg.includes("pasar por ahí")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Estamos en Av. Millán 4494. Atendemos de Lunes a Viernes de 09:00 a 19:00 hs y Sábados de 09:00 a 14:00 hs. Podés pasar a probarte los armazones que gustes en cualquier momento.",
          "¿Precisás receta o querés coordinar chequeo gratis?"
        ),
        patch
      };
    }

    // 20. ARMAZONES
    if (msg.includes("armazon") || msg.includes("armazón") || msg.includes("armazones") || msg.includes("marco") || msg.includes("marcos") || msg.includes("incuyen") || msg.includes("incluyen")) {
      patch.funnel = 'PRESUPUESTADO';
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Contamos con variedad de armazones desde $2.490 (los cristales van aparte según la receta).",
          "¿Buscás armazones de hombre, dama, niños o querés probarte en el local?"
        ),
        patch
      };
    }

    // 21. PRECIOS GENERALES
    if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cuánto sale") || msg.includes("cuánto me saldría") || msg.includes("cristal") || msg.includes("precios") || msg.includes("cotiz")) {
      patch.funnel = 'PRESUPUESTADO';
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "El precio depende del cristal que necesites: tenemos cristales desde $1.300 (Blanco), $2.200 (Antirreflejo) y $3.200 (Blueblocker). Los armazones van aparte desde $2.490.",
          "¿Tenés tu receta a mano para darte el precio exacto?"
        ),
        patch
      };
    }

    // 22. AGRADECIMIENTOS
    if (msg.includes("gracias") || msg.includes("dale ok") || msg.includes("buenisimo") || msg.includes("buenísimo") || msg.includes("impecable") || msg.includes("dale barbaro") || msg.includes("dale bárbaro")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Por nada! 😊 Quedamos a las órdenes por cualquier consulta. ¡Que tengas un excelente día!"),
        patch
      };
    }

    // 23. DESPEDIDAS SECUNDARIAS
    if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Muchas gracias a ti! 👍 Saludos y buena jornada."),
        patch
      };
    }

    // 24. UBICACIÓN
    if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Estamos en Av. Millán 4494 (Montevideo). Atendemos Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs.",
          "¿Tenés receta o preferís un chequeo gratis?"
        ),
        patch
      };
    }

    // 25. LENTES DE SOL
    if (msg.includes("lentes de sol") || msg.includes("lente de sol") || msg.includes("gafas de sol") || msg.includes("polarizado") || msg.includes("polarizados") || (msg.includes("sol") && (msg.includes("lente") || msg.includes("gafa")))) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas como Oahu, Bric à Brac, GX7). 😎 ¿Buscás algún modelo en particular o querés probarte en el local?"),
        patch
      };
    }

    // 26. FALLBACK GENERAL CON LOG EXPLÍCITO DE CONSULTA SIN REGLA
    console.log(`[DEBUG] Sin regla para: "${userMessage}" - usando fallback.`);
    patch.saludo_enviado = true;

    if (yaSaludado) {
      return {
        action: 'REPLY_TEXT',
        reply: "Con gusto te asesoramos. Podés enviarnos la foto de tu receta o contarme qué cristal o armazón buscás para darte la info exacta.",
        patch
      };
    } else {
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: "¡Hola! 😊 En Óptica Círculo Visión (Av. Millán 4494) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?",
        patch
      };
    }
  }
};