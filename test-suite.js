import { StateMachine } from './state-machine.js';
import { GHLState } from './ghl-state.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✅ [PASÓ] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FALLÓ] ${message}`);
  }
}

console.log("=================================================");
console.log("🧪 INICIANDO SUITE DE PRUEBAS COMPLETA CON GHL-STATE");
console.log("=================================================\n");

// 1. ANUNCIOS / PROMOS
const r1 = StateMachine.processMessage('c1', 'Hola me interesa la promo');
assert(r1.action === 'REPLY_TEXT' && r1.reply.includes("test visual 100% GRATIS"), '1. Ad Promo Entry');

// 2. RECETA
const r2 = StateMachine.processMessage('c2', 'tengo la receta medica');
assert(r2.patch.funnel === 'ESPERANDO_FOTO_RECETA', '2. Prescription Query');

// 3. ARMAZONES (TYPO & OFICIAL $2.490)
const r3 = StateMachine.processMessage('c3', 'Incuyen armazón ?');
assert(r3.reply.includes("$2.490"), '3. Frames Typo Query ($2.490)');

// 4. ARMAZONES GENERAL
const r4 = StateMachine.processMessage('c4', 'que marcos tienen?');
assert(r4.reply.includes("$2.490"), '4. Frames General Query ($2.490)');

// 5. PRECIOS EXPLÍCITOS
const r5 = StateMachine.processMessage('c5', 'cuanto sale el cristal con antirreflejo?');
assert(r5.reply.includes("$2.200"), '5. Explicit Prices Query ($2.200)');

// 6. FOTOCROMÁTICOS -> TRASPASO A HUMANO (REGLA DE ORO)
const r6 = StateMachine.processMessage('c6', 'cuanto salen los fotocromaticos?');
assert(r6.action === 'HANDOFF_HUMAN', '6. Fotocromáticos Handoff to Human');

// 7. BIFOCALES -> PRECIOS OFICIALES ($5.490)
const r7 = StateMachine.processMessage('c7', 'precio de bifocales?');
assert(r7.reply.includes("$5.490"), '7. Bifocals Query ($5.490)');

// 8. VARILUX / MULTIFOCALES -> TRASPASO A HUMANO (REGLA DE ORO)
const r8 = StateMachine.processMessage('c8', 'cuanto salen los multifocales varilux?');
assert(r8.action === 'HANDOFF_HUMAN', '8. Varilux Handoff to Human');

// 9. COTIZACIÓN LENTE COMPLETO ARMADO -> TRASPASO A HUMANO (REGLA DE ORO)
const r9 = StateMachine.processMessage('c9', 'cuanto me sale el lente completo armado cristal mas armazon?');
assert(r9.action === 'HANDOFF_HUMAN', '9. Lente Completo Armado Handoff to Human');

// 10. HORARIOS Y UBICACIÓN
const r10 = StateMachine.processMessage('c10', 'cuales son sus horarios y direccion?');
assert(r10.reply.includes("Av. Millán 4494") && r10.reply.includes("09:00 a 19:00"), '10. Location and Hours Query');

// 11. ADAPTACIÓN -> TRASPASO A HUMANO
const r11 = StateMachine.processMessage('c11', 'los lentes se me caen al piso me los acomodas?');
assert(r11.action === 'HANDOFF_HUMAN', '11. Adaptation Handoff');

// 12. HUMANO ACTIVO
const r12 = StateMachine.processMessage('c12', 'hola', { funnel: 'TRASPASO_HUMANO' });
assert(r12.action === 'IGNORE_HUMAN_ACTIVE', '12. Human Active Ignore');

// --- PASO 8: GHLSTATE EN DISCO EFÍMERO ---
console.log("\n=================================================");
console.log("🧪 PRUEBAS DE PERSISTENCIA Y REGRESION");
console.log("=================================================\n");

const token = process.env.GHL_PRIVATE_TOKEN || 'pit-6bd30d4f-88de-466f-9c9d-68d4650dc9a6';
const locId = process.env.GHL_LOCATION_ID || 'XccKbn9Mfm2Rp0LZhhgC';

const store = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store.init();

const cState1 = await store.getState('Lf0WMSNLJQhqZMdpyFUc');
assert(typeof cState1.saludo_enviado === 'boolean', 'GHLState 1. Estado estructurado');

await store.setState('Lf0WMSNLJQhqZMdpyFUc', { saludo_enviado: true, funnel: 'PRESUPUESTADO' });
const store2 = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store2.init();
const cState2 = await store2.getState('Lf0WMSNLJQhqZMdpyFUc');
assert(cState2.saludo_enviado === true && cState2.funnel === 'PRESUPUESTADO', 'GHLState 2. Persistencia tras reinicio');

console.log("\n=================================================");
console.log(`📊 RESULTADO FINAL DE CALIDAD: ${passed}/${total} PRUEBAS APROBADAS (${Math.round(passed/total*100)}%)`);
console.log("=================================================\n");

process.exit(0);