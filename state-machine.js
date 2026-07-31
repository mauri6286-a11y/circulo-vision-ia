export const StateMachine = {
  processMessage(contactId, userMessage, currentState = {}) {
    const msg = userMessage ? userMessage.toLowerCase().trim() : "";
    const yaSaludado = Boolean(currentState.saludo_enviado);
    const yaPreguntoReceta = Boolean(currentState.preguntado_receta_chequeo);

    // 1. SI IA YA ESTÁ EN TRASPASO O PAUSADA
    if (currentState.funnel === 'TRASPASO_HUMANO' || currentState.ia_pausada) {
      return { action: 'IGNORE_HUMAN_ACTIVE', patch: {} };
    }

    // PASO 6 — MENSAJES SIN TEXTO / ADJUNTOS / COMPROBANTES / PDF
    if (!msg || msg === "[adjunto]" || msg.includes(".pdf") || msg.includes("comprobante") || msg.includes("recibo") || msg.includes("transferencia") || msg.includes("pago realizado")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: "¡Recibido! En un momento revisamos tu comprobante/adjunto y te confirmamos. [SOLICITA_HUMANO]",
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    const patch = {};

    const buildReply = (baseText, recetaChequeoQuestion = "") => {
      let text = baseText;

      // Si ya se saludó, remover expresiones de saludo inicial
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

      // Si AÚN NO se le preguntó por la receta/chequeo gratis, agregar una sola vez
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
        reply: "Con gusto te ayudamos. Le paso tu mensaje a Nico para que conversen directamente sobre la propuesta. Aguardame un segundito. [SOLICITA_HUMANO]",
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 3. PROBLEMAS DE ADAPTACIÓN / AJUSTE / LENTES QUE SE CAEN -> TRASPASO A HUMANO
    if (msg.includes("caen") || msg.includes("caen al piso") || msg.includes("se me caen") || msg.includes("ajuste") || msg.includes("patilla") || msg.includes("patillas") || msg.includes("adaptacion") || msg.includes("adaptación") || msg.includes("aflojo") || msg.includes("aflojó") || msg.includes("me aprieta") || msg.includes("me molesta") || msg.includes("veo borroso") || msg.includes("no veo bien")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: "Con gusto te ayudamos. Le paso tu consulta a Nico en el local para que revise la adaptación y el ajuste de tus lentes. Podés pasar por Av. Millán 4494 en cualquier momento para acomodártelos sin costo. Aguardame un segundito. [SOLICITA_HUMANO]",
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 4. RETIRO / ESTADO DE LENTES DE TALLER -> TRASPASO A HUMANO
    if (msg.includes("llegaron") || msg.includes("listos") || msg.includes("prontos") || msg.includes("retirar") || msg.includes("mi pedido") || msg.includes("mis lentes") || msg.includes("taller") || msg.includes("buscar mi pedido")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: "Con gusto te confirmamos. Le paso tu consulta a Nico y al equipo para que revisen el estado exacto de tu pedido y te avisen. Aguardame un segundito. [SOLICITA_HUMANO]",
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 5. AGENDAMIENTO / TURNOS / RESERVAS -> TRASPASO A HUMANO
    if (msg.includes("agendar") || msg.includes("agendarme") || msg.includes("agendame") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("cita") || msg.includes("reserva") || msg.includes("reservar") || msg.includes("reservás") || msg.includes("reservas")) {
      return {
        action: 'HANDOFF_HUMAN',
        reply: "¡Con gusto! Le paso tu solicitud a Nico en el local para que verifique la agenda física y te confirme el turno. Aguardame un segundito por favor. [SOLICITA_HUMANO]",
        patch: { funnel: 'TRASPASO_HUMANO' }
      };
    }

    // 6. FOTOCROMÁTICOS / TRANSITIONS
    if (msg.includes("fotocrom") || msg.includes("transition") || msg.includes("fotosensibl")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Contamos con cristales fotocromáticos (se oscurecen con el sol) desde $3.500 en opción estándar y $4.500 con filtro de luz azul (Blueblocker).",
          "¿Tenés receta a mano o querés coordinar un chequeo gratis?"
        ),
        patch
      };
    }

    // 7. ENVÍOS AL INTERIOR / CLIENTES DE OTROS DEPARTAMENTOS
    if (msg.includes("artigas") || msg.includes("salto") || msg.includes("rivera") || msg.includes("maldonado") || msg.includes("rocha") || msg.includes("tacuarembo") || msg.includes("tacuarembó") || msg.includes("colonia") || msg.includes("minas") || msg.includes("durazno") || msg.includes("florida") || msg.includes("san jose") || msg.includes("san josé") || msg.includes("mercedes") || msg.includes("treinta y tres") || msg.includes("rio negro") || msg.includes("soriano") || msg.includes("cerro largo") || msg.includes("interior") || msg.includes("envio") || msg.includes("envíos") || msg.includes("despacho")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "¡Hacemos envíos a todo el país! Podés enviarnos la foto de tu receta por acá, te mostramos opciones de armazones por foto/video y te enviamos tus lentes prontos por agencia."
        ),
        patch
      };
    }

    // 8. BIFOCALES
    if (msg.includes("bifocal") || msg.includes("bifocales")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Contamos con cristales bifocales desde $2.500 (cristal solo, armazones desde $1.200).",
          "¿Tenés foto de tu receta a mano o querés coordinar un chequeo gratis?"
        ),
        patch
      };
    }

    // 9. VARILUX / MULTIFOCALES DIGITALES
    if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor") || msg.includes("multifocal")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Los multifocales Varilux son de excelente gama digital. El precio depende de tu receta.",
          "¿Tenés la foto a mano o querés asesorarte en el local de Av. Millán 4494?"
        ),
        patch
      };
    }

    // 10. CONVENIOS
    if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico") || msg.includes("católico") || msg.includes("evangélico")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y clubes deportivos. ¿A qué convenio pertenecés así te paso el descuento exacto?"
        ),
        patch
      };
    }

    // 11. CUOTAS / TARJETAS
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

    // 12. ARMAZONES
    if (msg.includes("armazon") || msg.includes("armazón") || msg.includes("armazones") || msg.includes("marco") || msg.includes("marcos") || msg.includes("incuyen") || msg.includes("incluyen")) {
      patch.funnel = 'PRESUPUESTADO';
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Los precios indicados son por los cristales. En el local tenemos armazones desde $1.200 para armar el combo completo.",
          "¿Tenés receta a mano o precisás un chequeo gratis?"
        ),
        patch
      };
    }

    // 13. SOLICITUD DE PRECIOS O COTIZACIONES
    if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cuánto sale") || msg.includes("cuánto me saldría") || msg.includes("cristal") || msg.includes("precios") || msg.includes("cotiz")) {
      patch.funnel = 'PRESUPUESTADO';
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Tenemos cristales desde $1.300 (Blanco), $2.200 (Antireflejo), $3.200 (Blueblocker) y armazones desde $1.200 para armar el lente completo.",
          "¿Tenés la receta a mano para cotizarte exacto?"
        ),
        patch
      };
    }

    // 14. TENGO RECETA
    if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("lentes de receta") || msg.includes("lentes de reseta")) {
      patch.funnel = 'ESPERANDO_FOTO_RECETA';
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Bárbaro! Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos, o si preferís coordinamos un chequeo gratis. ¿Qué te queda mejor?"),
        patch
      };
    }

    // 15. RESPUESTAS CORTAS NEGATIVAS
    if (msg.includes("aun no") || msg.includes("aún no") || msg.includes("todavia no") || msg.includes("todavía no") || msg.includes("no tengo") || msg.includes("no la tengo") || msg.includes("no tengo receta")) {
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Sin problema. ¿Te gustaría coordinar un chequeo visual 100% GRATIS en nuestro local de Av. Millán 4494 para hacer la receta?"),
        patch
      };
    }

    // 16. AGRADECIMIENTOS
    if (msg.includes("gracias") || msg.includes("dale ok") || msg.includes("buenisimo") || msg.includes("buenísimo") || msg.includes("impecable") || msg.includes("dale barbaro") || msg.includes("dale bárbaro")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Por nada! 😊 Quedamos a las órdenes por cualquier consulta. ¡Que tengas un excelente día!"),
        patch
      };
    }

    // 17. DESPEDIDAS SECUNDARIAS
    if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("¡Muchas gracias a ti! 👍 Saludos y buena jornada."),
        patch
      };
    }

    // 18. ENTRADA POR ANUNCIOS / PROMOS
    if (msg.includes("source url") || msg.includes("headline") || msg.includes("fb.me") || msg.includes("instagram.com/p/") || (msg.includes("promo") && !msg.includes("precio"))) {
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Veo que nos escribes por nuestra promo activa. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS.", "¿Ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?"),
        patch
      };
    }

    // 19. UBICACIÓN
    if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply(
          "Estamos en **Av. Millán 4494** (Montevideo). Atendemos Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs.",
          "¿Tenés receta o preferís un chequeo gratis?"
        ),
        patch
      };
    }

    // 20. LENTES DE SOL
    if (msg.includes("lentes de sol") || msg.includes("lente de sol") || msg.includes("gafas de sol") || msg.includes("polarizado") || msg.includes("polarizados") || (msg.includes("sol") && (msg.includes("lente") || msg.includes("gafa")))) {
      return {
        action: 'REPLY_TEXT',
        reply: buildReply("Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas como Oahu, Bric à Brac, GX7). 😎 ¿Buscás algún modelo en particular o querés probarte en el local?"),
        patch
      };
    }

    // 21. FALLBACK GENERAL
    if (yaSaludado) {
      patch.saludo_enviado = true;
      return {
        action: 'REPLY_TEXT',
        reply: "Entendido. Contame en qué te podemos ayudar o qué consulta tenés sobre tus lentes y te asesoro con gusto.",
        patch
      };
    } else {
      patch.saludo_enviado = true;
      patch.preguntado_receta_chequeo = true;
      return {
        action: 'REPLY_TEXT',
        reply: "¡Hola! 😊 En Óptica Círculo Visión (Av. Millán 4494) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?",
        patch
      };
    }
  }
};