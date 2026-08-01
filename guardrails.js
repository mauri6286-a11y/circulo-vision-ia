import { getConfig } from './config-loader.js';

export function validarMensajeSaliente(messageText, config = null) {
  const cfg = config || getConfig();
  if (!messageText || typeof messageText !== 'string') {
    return { ok: true, reason: null };
  }

  // 1. EXTRAER PRECIOS OFICIALES PERMITIDOS DESDE CONFIG
  const allowedPrices = new Set();

  const simples = cfg.datos_que_el_bot_informa?.cristales_simples?.items || {};
  Object.values(simples).forEach(item => {
    if (typeof item.precio === 'number') allowedPrices.add(item.precio);
  });

  const bifocales = cfg.datos_que_el_bot_informa?.bifocales?.items || {};
  Object.values(bifocales).forEach(item => {
    if (typeof item.precio === 'number') allowedPrices.add(item.precio);
  });

  const armPrecioDesde = cfg.datos_que_el_bot_informa?.armazones?.precio_desde;
  if (typeof armPrecioDesde === 'number') allowedPrices.add(armPrecioDesde);

  // Extraer todos los bloques que comiencen con $ y contengan dígitos y puntos
  const priceMatches = messageText.match(/\$\s*[\d.]+/g) || [];

  for (const rawMatch of priceMatches) {
    // Quitar $ y espacios
    let clean = rawMatch.replace(/\$\s*/, '').trim();

    // Quitar puntos al final de la frase (ej: "$2.200." -> "2.200")
    clean = clean.replace(/\.$/, '');

    // Eliminar los puntos internos de separadores de miles (ej: "2.200" -> "2200")
    let numericStr = clean.replace(/\./g, '');
    let numericValue = parseInt(numericStr, 10);

    if (!isNaN(numericValue) && !allowedPrices.has(numericValue)) {
      console.error(`[GUARDRAIL] precio no autorizado detectado: ${rawMatch} (${numericValue})`);
      return {
        ok: false,
        reason: `Precio no autorizado detectado: ${rawMatch} (interpretado como $${numericValue})`,
        blockedValue: rawMatch
      };
    }
  }

  // 2. VALIDAR PORCENTAJES DE DESCUENTO EN CONVENIOS
  const allowedDiscounts = new Set();
  const conveniosActivos = cfg.convenios?.activos || {};
  Object.values(conveniosActivos).forEach(item => {
    const descStr = item.descuento || "";
    const pctMatches = descStr.match(/(\d+)%/g) || [];
    pctMatches.forEach(m => {
      const pct = parseInt(m.replace('%', ''), 10);
      if (!isNaN(pct)) allowedDiscounts.add(pct);
    });
  });

  const textPctMatches = messageText.match(/(\d+)%/g) || [];
  for (const match of textPctMatches) {
    const pctVal = parseInt(match.replace('%', ''), 10);
    if (pctVal === 100) continue; // 100% test gratis es permitido

    if (!allowedDiscounts.has(pctVal)) {
      console.error(`[GUARDRAIL] descuento de convenio no autorizado detectado: ${match}`);
      return {
        ok: false,
        reason: `Descuento no autorizado detectado: ${match}`,
        blockedValue: match
      };
    }
  }

  // 3. VALIDAR DIRECCIÓN
  if (messageText.includes("Millán") || messageText.includes("Millan")) {
    if (!messageText.includes("4494")) {
      console.error(`[GUARDRAIL] dirección incorrecta detectada`);
      return {
        ok: false,
        reason: `Dirección no autorizada detectada`,
        blockedValue: messageText
      };
    }
  }

  return { ok: true, reason: null };
}