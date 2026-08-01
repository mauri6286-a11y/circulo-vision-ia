import { getConfig } from './config-loader.js';

export function validarMensajeSaliente(messageText, config = null) {
  const cfg = config || getConfig();
  if (!messageText || typeof messageText !== 'string') {
    return { ok: true, reason: null };
  }

  // 1. EXTRAER PRECIOS OFICIALES PERMITIDOS
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

  // Parsear precios en el texto saliente ($X.XXX, $XXXX)
  const priceMatches = messageText.match(/\$\s*[\d.]+/g) || [];

  for (const match of priceMatches) {
    const numericValue = parseInt(match.replace(/[^\d]/g, ''), 10);
    if (!isNaN(numericValue) && !allowedPrices.has(numericValue)) {
      console.error(`[GUARDRAIL] precio no autorizado detectado: ${match} (${numericValue})`);
      return {
        ok: false,
        reason: `Precio no autorizado detectado: ${match}`,
        blockedValue: match
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
    // 100% de test visual gratis es válido
    if (pctVal === 100) continue;

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