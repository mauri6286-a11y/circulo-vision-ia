import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE SILENCIAMIENTO POR TAG MANUAL");
console.log("=================================================\n");

const stateWithHumanTag = {
  funnel: 'NUEVO_LEAD',
  ia_pausada: true
};

const res = await StateMachine.processMessage('test-contact-123', 'hola cuánto cuesta el cristal?', stateWithHumanTag);

console.log("Estado:", JSON.stringify(stateWithHumanTag));
console.log("Acción resultante:", res.action);
console.log("¿Respuesta enviada?:", res.reply || "NINGUNA (Silenciado)");
console.log("=================================================");