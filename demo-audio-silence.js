import { store } from './ai-agent-server.js';
import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE SILENCIAMIENTO DE AUDIOS/ADJUNTOS EN TRASPASO_HUMANO");
console.log("=================================================\n");

// Caso 1: Contacto en TRASPASO_HUMANO envía nota de voz / audio
console.log("📌 PRUEBA 1: Contacto en TRASPASO_HUMANO envía nota de voz / audio");
const stateHuman = {
  funnel: 'TRASPASO_HUMANO',
  ia_pausada: true
};

const resAudio = await StateMachine.processMessage('c-audio-test', '', stateHuman, {
  hasAttachment: true
});

console.log("   Estado:", JSON.stringify(stateHuman));
console.log("   Acción de StateMachine:", resAudio.action);
console.log("   ¿Silenciado?:", resAudio.action === 'IGNORE_HUMAN_ACTIVE');

console.log("\n=================================================");
process.exit(0);