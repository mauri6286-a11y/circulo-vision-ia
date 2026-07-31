import { StateMachine } from './state-machine.js';
import { GHLState } from './ghl-state.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.GHL_PRIVATE_TOKEN;
const locId = process.env.GHL_LOCATION_ID;

const testCases = [
  { name: '1. Ad Promo Entry', input: 'Headline: Promo! Source URL: fb.me ¡Hola! Quiero más información.', expectedAction: 'REPLY_TEXT', forbidWords: ['$1.300', '$2.200', '$3.200', '$5.200'] },
  { name: '2. Prescription Query', input: 'Hola necesito lentes de reseta', expectedAction: 'REPLY_TEXT', expectWords: ['receta'] },
  { name: '3. Frames Typo Query', input: 'Incuyen armazón ?', expectedAction: 'REPLY_TEXT', expectWords: ['armazones desde $1.200', 'cristales'] },
  { name: '4. Frames General Query', input: 'Los armazones están incluidos en el precio?', expectedAction: 'REPLY_TEXT', expectWords: ['armazones desde $1.200'] },
  { name: '5. Explicit Prices Query', input: 'Cuánto me saldrían los cristales antireflejo?', expectedAction: 'REPLY_TEXT', expectWords: ['$1.300', '$2.200', 'armazones'] },
  { name: '6. Lens Pickup Query 1', input: 'Ya llegaron los lentes? Xq si es asi pásanos hoy en la tarde', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '7. Lens Pickup Query 2', input: 'Están listos mis lentes para retirar?', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '8. Lens Pickup Query 3', input: 'Cuándo puedo pasar a buscar mi pedido del taller?', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '9. Booking Request 1', input: 'Hola quisiera agendarme para un test visual el miércoles de tarde', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '10. Booking Request 2', input: 'Quiero un turno para hacerme la prueba de vista gratis', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '11. Booking Request 3', input: 'Me reservás hora para mañana a las 15:30?', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]'] },
  { name: '12. Polite Closing 1', input: 'Dale ok Gracias 😊', expectedAction: 'REPLY_TEXT', expectWords: ['Por nada'], forbidWords: ['¡Hola!', 'test visual'] },
  { name: '13. Polite Closing 2', input: 'Impecable muchas gracias', expectedAction: 'REPLY_TEXT', expectWords: ['Por nada'], forbidWords: ['¡Hola!'] },
  { name: '14. Polite Closing 3', input: 'Dale bárbaro saludos', expectedAction: 'REPLY_TEXT', expectWords: ['Por nada'], forbidWords: ['¡Hola!'] },
  { name: '15. Location Query 1', input: 'En Montevideo?', expectedAction: 'REPLY_TEXT', expectWords: ['Av. Millán 4494'] },
  { name: '16. Location Query 2', input: 'Dónde están ubicados?', expectedAction: 'REPLY_TEXT', expectWords: ['Av. Millán 4494'] },
  { name: '17. Sunglasses Query 1', input: 'Tienen lentes de sol polarizados?', expectedAction: 'REPLY_TEXT', expectWords: ['UV400', 'polarizados'], forbidWords: ['receta'] },
  { name: '18. Sunglasses Query 2', input: 'Gafas de sol Oahu qué modelos hay?', expectedAction: 'REPLY_TEXT', expectWords: ['UV400'], forbidWords: ['receta'] },
  { name: '19. Bifocals Query', input: 'Cuánto salen los cristales bifocales?', expectedAction: 'REPLY_TEXT', expectWords: ['bifocales desde $2.500'] },
  { name: '20. Varilux Multifocals', input: 'Tienen cristales Varilux Physio?', expectedAction: 'REPLY_TEXT', expectWords: ['Varilux'] },
  { name: '21. Convenios Query', input: 'Tienen convenio con Caja Bancaria o BPS?', expectedAction: 'REPLY_TEXT', expectWords: ['Caja Bancaria', 'BPS'] },
  { name: '22. Cuotas Query', input: 'Aceptan tarjeta en cuotas?', expectedAction: 'REPLY_TEXT', expectWords: ['12 cuotas'] },
  { name: '23. Staff Outbound State', input: 'Mensaje de Staff', isHumanActive: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' },
  { name: '24. Staff Voice Note State', input: 'Audio de Staff', isHumanActive: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' },
  { name: '25. Human Intervention Active', input: 'Cualquier mensaje', isHumanActive: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' },
  { name: '26. Adaptation Query (Se me caen)', input: 'Si mejor pero se me caen', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]', 'Nico'] },
  { name: '27. Fit Query (Caen al piso)', input: 'Si me agachó caen al piso', expectedAction: 'HANDOFF_HUMAN', expectWords: ['[SOLICITA_HUMANO]', 'Nico'] }
];

async function runTestSuite() {
  console.log("=================================================");
  console.log("🧪 INICIANDO SUITE DE PRUEBAS COMPLETA CON GHL-STATE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const testContactId = `QA_TEST_CONTACT_${i + 1}`;

    const mockState = {
      saludo_enviado: false,
      preguntado_receta_chequeo: false,
      funnel: tc.isHumanActive ? 'TRASPASO_HUMANO' : 'NUEVO_LEAD',
      ia_pausada: Boolean(tc.isHumanActive)
    };

    const result = StateMachine.processMessage(testContactId, tc.input, mockState);

    let testPass = true;
    let failReason = "";

    if (result.action !== tc.expectedAction) {
      testPass = false;
      failReason += `Acción esperada '${tc.expectedAction}', pero se obtuvo '${result.action}'. `;
    }

    if (tc.expectWords && result.reply) {
      for (const word of tc.expectWords) {
        if (!result.reply.toLowerCase().includes(word.toLowerCase())) {
          testPass = false;
          failReason += `Falta la palabra esperada '${word}'. `;
        }
      }
    }

    if (tc.forbidWords && result.reply) {
      for (const word of tc.forbidWords) {
        if (result.reply.toLowerCase().includes(word.toLowerCase())) {
          testPass = false;
          failReason += `Contiene la palabra prohibida '${word}'. `;
        }
      }
    }

    if (testPass) {
      console.log(`✅ [PASÓ] ${tc.name}`);
      passed++;
    } else {
      console.error(`❌ [FALLÓ] ${tc.name} -> Razones: ${failReason}`);
      failed++;
    }
  }

  // PASO 8 — PRUEBAS DE PERSISTENCIA EN GHL CUSTOM FIELDS (GHLState)
  console.log("\n=================================================");
  console.log("🧪 PASO 8: PRUEBAS DE GHL-STATE Y APAGADO EFÍMERO (5 PRUEBAS)");
  console.log("=================================================\n");

  const store1 = new GHLState({ apiToken: token, locationId: locId });
  await store1.init();

  const realTestContact = 'Lf0WMSNLJQhqZMdpyFUc'; // Contacto real de prueba en GHL

  // Test 1: Leer estado inicial
  const stInitial = await store1.getState(realTestContact);
  if (typeof stInitial.saludo_enviado === 'boolean' && stInitial.funnel) {
    console.log("✅ [PASÓ] GHLState 1. Contacto devuelve estado estructurado con defaults.");
    passed++;
  } else {
    console.error("❌ [FALLÓ] GHLState 1.");
    failed++;
  }

  // Test 2: Simular reinicio de servidor (Instancia nueva de GHLState)
  await store1.setState(realTestContact, { saludo_enviado: true, funnel: 'PRESUPUESTADO' });
  const store2 = new GHLState({ apiToken: token, locationId: locId }); // Instancia fresca (simula reinicio Render)
  await store2.init();
  const stAfterRestart = await store2.getState(realTestContact);

  if (stAfterRestart.saludo_enviado === true && stAfterRestart.funnel === 'PRESUPUESTADO') {
    console.log("✅ [PASÓ] GHLState 2. Apagado/Reinicio simulado: saludo_enviado y funnel PERSISTEN en GHL Custom Fields.");
    passed++;
  } else {
    console.error("❌ [FALLÓ] GHLState 2.");
    failed++;
  }

  // Test 3: Merge parcial
  await store2.setState(realTestContact, { preguntado_receta_chequeo: true });
  const stMerged = await store2.getState(realTestContact);
  if (stMerged.saludo_enviado === true && stMerged.preguntado_receta_chequeo === true && stMerged.funnel === 'PRESUPUESTADO') {
    console.log("✅ [PASÓ] GHLState 3. Merge parcial: setear preguntado_receta no pisa saludo ni funnel.");
    passed++;
  } else {
    console.error("❌ [FALLÓ] GHLState 3.");
    failed++;
  }

  // Test 4: Mensaje PDF / adjunto sin texto -> Traspaso a Humano
  const resPdf = StateMachine.processMessage(realTestContact, "comprobante.pdf", { saludo_enviado: true });
  if (resPdf.action === 'HANDOFF_HUMAN' && resPdf.patch?.funnel === 'TRASPASO_HUMANO') {
    console.log("✅ [PASÓ] GHLState 4. Mensaje PDF/comprobante sin texto: marca traspaso a humano sin plantilla.");
    passed++;
  } else {
    console.error("❌ [FALLÓ] GHLState 4.");
    failed++;
  }

  // Test 5: Manejo de error si token es inválido
  const storeInvalid = new GHLState({ apiToken: "INVALID_TOKEN", locationId: locId });
  try {
    await storeInvalid.init();
    await storeInvalid.setState(realTestContact, { saludo_enviado: true });
    console.error("❌ [FALLÓ] GHLState 5: Debería haber fallado con token inválido.");
    failed++;
  } catch (e) {
    if (e.message.includes("401") || e.message.includes("setState fallo") || e.message.includes("init")) {
      console.log("✅ [PASÓ] GHLState 5. Token inválido: arroja error claro de autenticación.");
      passed++;
    } else {
      console.error("❌ [FALLÓ] GHLState 5:", e.message);
      failed++;
    }
  }

  const totalTests = testCases.length + 5;
  console.log("\n=================================================");
  console.log(`📊 RESULTADO FINAL DE CALIDAD: ${passed}/${totalTests} PRUEBAS APROBADAS (${((passed/totalTests)*100).toFixed(0)}%)`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();