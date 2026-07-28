import { StateMachine } from './state-machine.js';
import { db } from './database.js';

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
  { name: '12. Polite Closing 1', input: 'Dale ok Gracias 🥰', expectedAction: 'REPLY_TEXT', expectWords: ['Por nada'], forbidWords: ['¡Hola!', 'test visual'] },
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
  { name: '23. Staff Outbound State', input: 'Mensaje de Staff', isStaff: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' },
  { name: '24. Staff Voice Note State', input: 'Audio de Staff', isStaff: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' },
  { name: '25. Human Intervention Active', input: 'Cualquier mensaje', isHumanActive: true, expectedAction: 'IGNORE_HUMAN_ACTIVE' }
];

async function runTestSuite() {
  console.log("=================================================");
  console.log("🧪 INICIANDO SUITE DE 25 PRUEBAS DE CALIDAD");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const testContactId = `QA_TEST_CONTACT_${i + 1}`;
    
    // Limpiar estado para el test
    db.updateContact(testContactId, { estado_funnel: 'NUEVO_LEAD', ia_pausada: false });

    if (tc.isHumanActive) {
      db.setIAPaused(testContactId, true);
    }

    if (tc.isStaff) {
      db.setIAPaused(testContactId, true);
    }

    const result = StateMachine.processMessage(testContactId, tc.input);

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

  console.log("\n=================================================");
  console.log(`📊 RESULTADO FINAL DE CALIDAD: ${passed}/25 PRUEBAS APROBADAS (${((passed/25)*100).toFixed(0)}%)`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
