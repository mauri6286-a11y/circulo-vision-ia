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
console.log("🧪 INICIANDO SUITE DE PRUEBAS EXTENDIDA V1.1 (32 PRUEBAS) CON GHL-STATE");
console.log("=================================================\n");

// 1. ANUNCIOS / PROMOS
const r1 = await StateMachine.processMessage('c1', 'Hola me interesa la promo');
assert(r1.action === 'REPLY_TEXT' && r1.reply.includes("test visual 100% GRATIS"), '1. Ad Promo Entry');

// 2. RECETA
const r2 = await StateMachine.processMessage('c2', 'tengo la receta medica');
assert(r2.patch.funnel === 'ESPERANDO_FOTO_RECETA', '2. Prescription Query');

// 3. ARMAZONES (TYPO & OFICIAL $2.490)
const r3 = await StateMachine.processMessage('c3', 'Incuyen armazón ?');
assert(r3.reply.includes("$2.490"), '3. Frames Typo Query ($2.490)');

// 4. ARMAZONES GENERAL
const r4 = await StateMachine.processMessage('c4', 'que marcos tienen?');
assert(r4.reply.includes("$2.490"), '4. Frames General Query ($2.490)');

// 5. PRECIOS EXPLÍCITOS - ANTIRREFLEJO
const r5 = await StateMachine.processMessage('c5', 'cuanto sale el cristal con antirreflejo?');
assert(r5.reply.includes("$2.200"), '5. Explicit Prices Query - Antirreflejo ($2.200)');

// 6. FOTOCROMÁTICOS -> TRASPASO A HUMANO
const r6 = await StateMachine.processMessage('c6', 'cuanto salen los fotocromaticos?');
assert(r6.action === 'HANDOFF_HUMAN', '6. Fotocromáticos Handoff to Human');

// 7. BIFOCALES -> PRECIOS OFICIALES ($5.490)
const r7 = await StateMachine.processMessage('c7', 'precio de bifocales?');
assert(r7.reply.includes("$5.490"), '7. Bifocals Query ($5.490)');

// 8. VARILUX / MULTIFOCALES -> TRASPASO A HUMANO
const r8 = await StateMachine.processMessage('c8', 'cuanto salen los multifocales varilux?');
assert(r8.action === 'HANDOFF_HUMAN', '8. Varilux Handoff to Human');

// 9. COTIZACIÓN LENTE COMPLETO ARMADO -> TRASPASO A HUMANO
const r9 = await StateMachine.processMessage('c9', 'cuanto me sale el lente completo armado cristal mas armazon?');
assert(r9.action === 'HANDOFF_HUMAN', '9. Lente Completo Armado Handoff to Human');

// 10. HORARIOS Y UBICACIÓN
const r10 = await StateMachine.processMessage('c10', 'cuales son sus horarios y direccion?');
assert(r10.reply.includes("Av. Millán 4494") && r10.reply.includes("09:00 a 19:00"), '10. Location and Hours Query');

// 11. ADAPTACIÓN -> TRASPASO A HUMANO
const r11 = await StateMachine.processMessage('c11', 'los lentes se me caen al piso me los acomodas?');
assert(r11.action === 'HANDOFF_HUMAN', '11. Adaptation Handoff');

// 12. HUMANO ACTIVO
const r12 = await StateMachine.processMessage('c12', 'hola', { funnel: 'TRASPASO_HUMANO' });
assert(r12.action === 'IGNORE_HUMAN_ACTIVE', '12. Human Active Ignore');

// 13. CONVENIO CAJA BANCARIA (15% efectivo)
const r13 = await StateMachine.processMessage('c13', 'tienen convenio con caja bancaria?');
assert(r13.reply.includes("15% efectivo"), '13. Active Convenio Query (Caja Bancaria)');

// 14. CONVENIOS A CONSULTAR -> TRASPASO A HUMANO (Sayago / Fitlab)
const r14 = await StateMachine.processMessage('c14', 'tienen descuento con fitlab o sayago?');
assert(r14.action === 'HANDOFF_HUMAN', '14. Pending Convenio Handoff to Human');

// 15. TIEMPOS DE ENTREGA (3 días monofocales, 5 días multifocales)
const r15 = await StateMachine.processMessage('c15', 'cuanto demoran en entregar los lentes?');
assert(r15.reply.includes("3 días hábiles") && r15.reply.includes("5 días hábiles"), '15. Delivery Time Query');

// 16. GARANTÍAS DE ADAPTACIÓN (60 días)
const r16 = await StateMachine.processMessage('c16', 'los lentes tienen garantia?');
assert(r16.reply.includes("60 días"), '16. Adaptation Guarantee Query');

// 17. ENVÍOS A DOMICILIO Y TOMA DE MEDIDAS EN LOCAL
const r17 = await StateMachine.processMessage('c17', 'hacen envios al interior o a domicilio?');
assert(r17.reply.includes("envíos a domicilio") && r17.reply.includes("toma de medidas"), '17. Shipping and Local Measurements Query');

// 18. MEDIOS DE PAGO Y CUOTAS (12 cuotas sin recargo, Compra Ágil)
const r18 = await StateMachine.processMessage('c18', 'tienen cuotas sin recargo con tarjeta?');
assert(r18.reply.includes("12 cuotas sin recargo"), '18. Credit Card Installments Query');

// 19. TEST VISUAL 100% GRATIS
const r19 = await StateMachine.processMessage('c19', 'cuanto sale el examen de vista?');
assert(r19.reply.includes("100% gratis"), '19. Test Visual Zero Cost Query');

// 20. CONVENIO CÍRCULO CATÓLICO (15% efectivo)
const r20 = await StateMachine.processMessage('c20', 'descuento circulo catolico');
assert(r20.reply.includes("Círculo Católico") && r20.reply.includes("15% efectivo"), '20. Active Convenio Query (Círculo Católico)');

// 21. CONVENIO HOSPITAL EVANGÉLICO (15% efectivo)
const r21 = await StateMachine.processMessage('c21', 'descuento hospital evangelico');
assert(r21.reply.includes("Hospital Evangélico") && r21.reply.includes("15% efectivo"), '21. Active Convenio Query (Hospital Evangélico)');

// 22. CONVENIO STIQ SINDICATO QUÍMICA (20% efectivo)
const r22 = await StateMachine.processMessage('c22', 'descuento stiq sindicato');
assert(r22.reply.includes("20% efectivo"), '22. Active Convenio Query (STIQ)');

// 23. CONVENIO BPS (Subsidio BPS)
const r23 = await StateMachine.processMessage('c23', 'aceptan bps recetas con subsidio?');
assert(r23.reply.includes("Subsidio BPS"), '23. Active Convenio Query (BPS)');

// 24. PRECIO BLUEBLOCKER / LUZ AZUL ($3.200)
const r24 = await StateMachine.processMessage('c24', 'cuanto sale el blueblocker para computadoras?');
assert(r24.reply.includes("$3.200"), '24. Blueblocker Price Query ($3.200)');

// 25. PRECIO CRISTAL BLANCO ($1.300)
const r25 = await StateMachine.processMessage('c25', 'cuanto sale el cristal blanco comun?');
assert(r25.reply.includes("$1.300"), '25. Blanco Cristal Price Query ($1.300)');

// 26. LENTES DE SOL (UV400 / Polarizados)
const r26 = await StateMachine.processMessage('c26', 'tienen lentes de sol polarizados?');
assert(r26.reply.includes("UV400") && r26.reply.includes("polarizados"), '26. Sunglasses Query (UV400)');

// 27. AGRADECIMIENTOS
const r27 = await StateMachine.processMessage('c27', 'muchas gracias impecable!');
assert(r27.reply.includes("Quedamos a las órdenes"), '27. Gratitude Response');

// 28. DESPEDIDAS SECUNDARIAS
const r28 = await StateMachine.processMessage('c28', 'saludos que pases bien');
assert(r28.reply.includes("Muchas gracias a ti"), '28. Goodbye Response');

// 29. NO TENGO RECETA / REPITE YA TE DIJE
const r29 = await StateMachine.processMessage('c29', 'ya te dije que no tengo receta', { preguntado_receta_chequeo: true });
assert(r29.reply.includes("disculpá la insistencia") && r29.patch.funnel === 'CHEQUEO_REQUERIDO', '29. Negative Prescription Disambiguation');

// 30. GARANTÍA ESPECÍFICA DE PRODUCTO -> TRASPASO A HUMANO
const r30 = await StateMachine.processMessage('c30', 'que garantia especifica tiene este modelo?');
assert(r30.action === 'HANDOFF_HUMAN', '30. Specific Product Guarantee Handoff');

// --- PASO 8: GHLSTATE EN DISCO EFÍMERO ---
console.log("\n=================================================");
console.log("🧪 PRUEBAS DE PERSISTENCIA Y REGRESION");
console.log("=================================================\n");

const token = process.env.GHL_PRIVATE_TOKEN || 'pit-6bd30d4f-88de-466f-9c9d-68d4650dc9a6';
const locId = process.env.GHL_LOCATION_ID || 'XccKbn9Mfm2Rp0LZhhgC';

const store = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store.init();

const cState1 = await store.getState('Lf0WMSNLJQhqZMdpyFUc');
assert(typeof cState1.saludo_enviado === 'boolean', '31. GHLState 1. Estado estructurado');

await store.setState('Lf0WMSNLJQhqZMdpyFUc', { saludo_enviado: true, funnel: 'PRESUPUESTADO' });
const store2 = new GHLState({ apiToken: token, locationId: locId, cacheTtlMs: 0 });
await store2.init();
const cState2 = await store2.getState('Lf0WMSNLJQhqZMdpyFUc');
assert(cState2.saludo_enviado === true && cState2.funnel === 'PRESUPUESTADO', '32. GHLState 2. Persistencia tras reinicio');

console.log("\n=================================================");
console.log(`📊 RESULTADO FINAL DE CALIDAD: ${passed}/${total} PRUEBAS APROBADAS (${Math.round(passed/total*100)}%)`);
console.log("=================================================\n");

process.exit(0);