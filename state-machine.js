import { db } from './database.js';

export const StateMachine = {
  processMessage(contactId, userMessage) {
    const contact = db.getContact(contactId);
    const msg = userMessage ? userMessage.toLowerCase().trim() : "";

    // 1. SI IA YA ESTÁ PAUSADA O EN TRASPASO
    if (contact.ia_pausada || contact.estado_funnel === 'TRASPASO_HUMANO') {
      return { action: 'IGNORE_HUMAN_ACTIVE', contact };
    }

    // 2. RETIRO / ESTADO DE LENTES DE TALLER -> TRASPASO A HUMANO
    if (msg.includes("llegaron") || msg.includes("listos") || msg.includes("prontos") || msg.includes("retirar") || msg.includes("mi pedido") || msg.includes("mis lentes") || msg.includes("taller") || msg.includes("buscar mi pedido")) {
      db.updateContact(contactId, { estado_funnel: 'TRASPASO_HUMANO', ia_pausada: true });
      return {
        action: 'HANDOFF_HUMAN',
        reply: "Con gusto te confirmamos. Le paso tu consulta a Nico y al equipo para que revisen el estado exacto de tu pedido y te avisen. Aguardame un segundito. [SOLICITA_HUMANO]"
      };
    }

    // 3. AGENDAMIENTO / TURNOS / RESERVAS -> TRASPASO A HUMANO
    if (msg.includes("agendar") || msg.includes("agendarme") || msg.includes("agendame") || msg.includes("turno") || msg.includes("test") || msg.includes("examen") || msg.includes("revisio") || msg.includes("chequeo") || msg.includes("cita") || msg.includes("reserva") || msg.includes("reservar") || msg.includes("reservás") || msg.includes("reservas")) {
      db.updateContact(contactId, { estado_funnel: 'TRASPASO_HUMANO', ia_pausada: true });
      return {
        action: 'HANDOFF_HUMAN',
        reply: "¡Con gusto! Le paso tu solicitud a Nico en el local para que verifique la agenda física y te confirme el turno. Aguardame un segundito por favor. [SOLICITA_HUMANO]"
      };
    }

    // 4. BIFOCALES
    if (msg.includes("bifocal") || msg.includes("bifocales")) {
      return {
        action: 'REPLY_TEXT',
        reply: "Contamos con cristales bifocales desde $2.500 (cristal solo, armazones desde $1.200). ¿Tenés foto de tu receta a mano o querés coordinar un chequeo gratis?"
      };
    }

    // 5. VARILUX / MULTIFOCALES DIGITALES
    if (msg.includes("varilux") || msg.includes("physio") || msg.includes("comfort") || msg.includes("zeiss") || msg.includes("rodenstock") || msg.includes("essilor")) {
      return {
        action: 'REPLY_TEXT',
        reply: "Los multifocales Varilux son de excelente gama digital. El precio depende de tu receta. ¿Tenés la foto a mano o querés asesorarte en el local de Av. Millán 4494?"
      };
    }

    // 6. CONVENIOS
    if (msg.includes("convenio") || msg.includes("descuento") || msg.includes("caja bancaria") || msg.includes("bps") || msg.includes("stiq") || msg.includes("sindicato") || msg.includes("catolico") || msg.includes("evangelico")) {
      return {
        action: 'REPLY_TEXT',
        reply: "Trabajamos con Caja Bancaria (CJPB), STIQ, BPS, Círculo Católico, Evangélico y clubes deportivos. ¿A qué convenio pertenecés así te paso el descuento exacto?"
      };
    }

    // 7. CUOTAS / TARJETAS
    if (msg.includes("cuota") || msg.includes("cuotas") || msg.includes("tarjeta") || msg.includes("pago") || msg.includes("credito") || msg.includes("crédito") || msg.includes("debito") || msg.includes("débito") || msg.includes("financiar")) {
      return {
        action: 'REPLY_TEXT',
        reply: "Aceptamos todas las tarjetas de crédito hasta en 12 cuotas sin recargo, débito y efectivo. 💳 ¿Querés consultar presupuesto o coordinar chequeo gratis?"
      };
    }

    // 8. ARMAZONES
    if (msg.includes("armazon") || msg.includes("armazón") || msg.includes("armazones") || msg.includes("marco") || msg.includes("marcos") || msg.includes("incuyen") || msg.includes("incluyen")) {
      db.updateContact(contactId, { estado_funnel: 'PRESUPUESTADO' });
      return {
        action: 'REPLY_TEXT',
        reply: "Los precios indicados son por los cristales. En el local tenemos armazones desde $1.200 para armar el combo completo. ¿Tenés receta a mano o precisás un chequeo gratis?"
      };
    }

    // 9. SOLICITUD DE PRECIOS O COTIZACIONES
    if (msg.includes("precio") || msg.includes("cuanto sale") || msg.includes("cuanto me saldria") || msg.includes("cristal") || msg.includes("precios") || msg.includes("cotiz")) {
      db.updateContact(contactId, { estado_funnel: 'PRESUPUESTADO', presupuesto_ofrecido: "Cristales $1.300-$5.990 | Armazones $1.200+" });
      return {
        action: 'REPLY_TEXT',
        reply: "Tenemos cristales desde $1.300 (Blanco), $2.200 (Antireflejo), $3.200 (Blueblocker) y armazones desde $1.200 para armar el lente completo. ¿Tenés la receta a mano para cotizarte exacto?"
      };
    }

    // 10. TENGO RECETA
    if (msg.includes("tengo receta") || msg.includes("con receta") || msg.includes("tengo la receta") || msg.includes("lentes de receta") || msg.includes("lentes de reseta")) {
      db.updateContact(contactId, { estado_funnel: 'ESPERANDO_FOTO_RECETA' });
      return {
        action: 'REPLY_TEXT',
        reply: "¡Bárbaro! Podés mandarme una foto de tu receta por acá para cotizarte los cristales exactos, o si preferís coordinamos un chequeo gratis. ¿Qué te queda mejor?"
      };
    }

    // 11. AGRADECIMIENTOS
    if (msg.includes("gracias") || msg.includes("dale ok") || msg.includes("buenisimo") || msg.includes("buenísimo") || msg.includes("impecable") || msg.includes("dale barbaro") || msg.includes("dale bárbaro")) {
      return {
        action: 'REPLY_TEXT',
        reply: "¡Por nada! 😊 Quedamos a las órdenes por cualquier consulta. ¡Que tengas un excelente día!"
      };
    }

    // 12. DESPEDIDAS SECUNDARIAS
    if (msg.includes("igualmente") || msg.includes("saludos") || msg.includes("que pases bien")) {
      return {
        action: 'REPLY_TEXT',
        reply: "¡Muchas gracias a ti! 👋 ¡Saludos y buena jornada!"
      };
    }

    // 13. ENTRADA POR ANUNCIOS / PROMOS
    if (msg.includes("source url") || msg.includes("headline") || msg.includes("fb.me") || msg.includes("instagram.com/p/") || (msg.includes("promo") && !msg.includes("precio"))) {
      db.updateContact(contactId, { estado_funnel: 'PREGUNTADO_RECETA' });
      return {
        action: 'REPLY_TEXT',
        reply: "¡Hola! 😊 Veo que nos escribes por nuestra promo activa. En Óptica Círculo Visión (Av. Millán 4494) contamos con test visual 100% GRATIS. ¿Ya cuentas con tu receta médica o prefieres coordinar tu chequeo gratis en el local?"
      };
    }

    // 14. UBICACIÓN
    if (msg.includes("donde") || msg.includes("dónde") || msg.includes("ubicados") || msg.includes("ubicacion") || msg.includes("ubicación") || msg.includes("direccion") || msg.includes("dirección") || msg.includes("montevideo")) {
      return {
        action: 'REPLY_TEXT',
        reply: "Estamos en **Av. Millán 4494** (Montevideo). Atendemos Lunes a Viernes de 9 a 19 hs y Sábados de 9 a 14 hs. ¿Tenés receta o preferís un chequeo gratis?"
      };
    }

    // 15. LENTES DE SOL
    if (msg.includes("lentes de sol") || msg.includes("lente de sol") || msg.includes("gafas de sol") || msg.includes("polarizado") || msg.includes("polarizados") || (msg.includes("sol") && (msg.includes("lente") || msg.includes("gafa")))) {
      return {
        action: 'REPLY_TEXT',
        reply: "Tenemos colecciones de sol con filtro UV400 y polarizados (+50 marcas como Oahu, Bric à Brac, GX7). 🕶️ ¿Buscás algún modelo en particular o querés probarte en el local?"
      };
    }

    return {
      action: 'REPLY_TEXT',
      reply: "¡Hola! 😊 En Óptica Círculo Visión (Av. Millán 4494) hacemos test visual 100% GRATIS. ¿Ya tenés tu receta médica o querés coordinar el chequeo gratis en el local?"
    };
  }
};
