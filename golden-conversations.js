import { StateMachine } from './state-machine.js';
import { GHLState } from './ghl-state.js';
import { validarMensajeSaliente } from './guardrails.js';

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
console.log("🏆 INICIANDO SUITE DE CONVERSACIONES DORADAS (FASE 4)");
console.log("=================================================\n");

// --- CONVERSACIÓN 1: SIN RECETA INSISTENTE (MULTI-TURNO) ---
console.log("💬 CONVERSACIÓN 1: Sin Receta Insistente (4 Turnos)");
let state1 = {};
const turn1_1 = await StateMachine.processMessage('gold-1', 'cuánto un antirreflejo', state1);
Object.assign(state1, turn1_1.patch);
assert(turn1_1.reply.includes("$2.200") && state1.saludo_enviado === true, '   Turno 1: Precio antirreflejo + saludo');

const turn1_2 = await StateMachine.processMessage('gold-1', 'es para cerca', state1);
Object.assign(state1, turn1_2.patch);
assert(!turn1_2.reply.startsWith("¡Hola!") && state1.saludo_enviado === true, '   Turno 2: No re-saluda');

const turn1_3 = await StateMachine.processMessage('gold-1', 'no tengo receta', state1);
Object.assign(state1, turn1_3.patch);
assert(state1.funnel === 'CHEQUEO_REQUERIDO' && state1.preguntado_receta_chequeo === true, '   Turno 3: Transición a CHEQUEO_REQUERIDO');

const turn1_4 = await StateMachine.processMessage('gold-1', 'ya te dije que no tengo', state1);
Object.assign(state1, turn1_4.patch);
assert(turn1_4.reply.includes("disculpá la insistencia") && !turn1_4.reply.includes("¡Hola!"), '   Turno 4: No repite idéntico y empatiza');

// --- CONVERSACIÓN 2: VARIANTES SIN RECETA ---
console.log("\n💬 CONVERSACIÓN 2: Variantes Expresivas de 'Sin Receta'");
const var1 = await StateMachine.processMessage('gold-2a', 'la perdí');
assert(var1.patch.funnel === 'CHEQUEO_REQUERIDO', '   Variante A ("la perdí"): tiene_receta = false');

const var2 = await StateMachine.processMessage('gold-2b', 'la dejé en casa');
assert(var2.patch.funnel === 'CHEQUEO_REQUERIDO', '   Variante B ("la dejé en casa"): tiene_receta = false');

const var3 = await StateMachine.processMessage('gold-2c', 'no la traje');
assert(var3.patch.funnel === 'CHEQUEO_REQUERIDO', '   Variante C ("no la traje"): tiene_receta = false');

// --- CONVERSACIÓN 3: NO INVENTAR (DERIVACIÓN A HUMANO) ---
console.log("\n💬 CONVERSACIÓN 3: No Inventar (Traspaso Riguroso a Nico)");
const dev1 = await StateMachine.processMessage('gold-3a', 'tienen fotocromáticos cuánto');
assert(dev1.action === 'HANDOFF_HUMAN' && dev1.patch.funnel === 'TRASPASO_HUMANO', '   Derivación Fotocromáticos sin inventar precio');

const dev2 = await StateMachine.processMessage('gold-3b', 'tengo convenio con ANTEL');
assert(dev2.action === 'HANDOFF_HUMAN' && dev2.patch.funnel === 'TRASPASO_HUMANO', '   Derivación Convenio ANTEL sin inventar descuento');

// --- CONVERSACIÓN 4: MEMORIA TRAS REINICIO ---
console.log("\n💬 CONVERSACIÓN 4: Memoria de Estado Tras Reinicio (GHLState)");
const token = process.env.GHL_PRIVATE_TOKEN || 'pit-6bd30d4f-88de-466f-9c9d-68d4650dc9a6';
const locId = process.env.GHL_LOCATION_ID || 'XccKbn9Mfm2Rp0LZhhgC';
const realContactId = 'Lf0WMSNLJQhqZMdpyFUc';

const store1 = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store1.init();

await store1.setState(realContactId, { saludo_enviado: true, funnel: 'PRESUPUESTADO' });

// Reinicio simulado de la app / memoria instanciando nuevo store
const store2 = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store2.init();
const recoveredState = await store2.getState(realContactId);

const turn4_2 = await StateMachine.processMessage(realContactId, 'cuanto el blueblocker', recoveredState);
assert(!turn4_2.reply.includes("¡Hola!") && recoveredState.saludo_enviado === true, '   Memoria recuperada: Bot no re-saluda tras reiniciar');

// --- CONVERSACIÓN 5: NO PISAR A HUMANO (STAFF ACTIVO) ---
console.log("\n💬 CONVERSACIÓN 5: No Pisar a Humano (Staff Activo)");
const turn5 = await StateMachine.processMessage('gold-5', 'hola me responden?', { funnel: 'TRASPASO_HUMANO', ia_pausada: true });
assert(turn5.action === 'IGNORE_HUMAN_ACTIVE', '   Mensaje ignorado en silencio mientras Staff opera');

// --- CONVERSACIÓN 6: LIBERACIÓN DE TAG Y REINTEGRO IA ---
console.log("\n💬 CONVERSACIÓN 6: Liberación 24hs y Reintegro de IA");
const state6 = { funnel: 'REACTIVADO', saludo_enviado: true };
const turn6 = await StateMachine.processMessage('gold-6', 'hola quiero consultar precios', state6);
assert(!turn6.reply.includes("¡Hola! 😊 En Óptica") && turn6.action === 'REPLY_TEXT', '   IA retoma conversación sin re-saludar');

// --- CONVERSACIÓN 7: MÚLTIPLES INTENCIONES COMPUESTAS ---
console.log("\n💬 CONVERSACIÓN 7: Múltiples Intenciones Compuestas (3 Consultas)");
const turn7 = await StateMachine.processMessage('gold-7', 'cuánto un bifocal, hacen cuotas y dónde están');
assert(turn7.reply.includes("$5.490") && turn7.reply.includes("12 cuotas") && turn7.reply.includes("Av. Millán 4494"), '   Responde las 3 intenciones (Precio + Cuotas + Horarios)');

// --- CONVERSACIÓN 8: GUARDRAIL ANTI-INVENCIÓN BLOQUEO ---
console.log("\n💬 CONVERSACIÓN 8: Guardrail Anti-Invención de Precios");
const checkGuardrail = validarMensajeSaliente("El precio especial del cristal es $9.999.");
assert(checkGuardrail.ok === false && checkGuardrail.reason.includes("Precio no autorizado"), '   Guardrail atrapa precio no autorizado $9.999');

console.log("\n=================================================");
console.log(`🏆 RESULTADO FINAL DE CONVERSACIONES DORADAS: ${passed}/${total} PRUEBAS APROBADAS (${Math.round(passed/total*100)}%)`);
console.log("=================================================\n");

process.exit(0);