import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE 3 TURNOS CON AMBIGÜEDAD");
console.log("=================================================\n");

let state3 = {};
const res3_1 = await StateMachine.processMessage('c-amb-3', 'De nuevo el día del padre 🥰🥳💪?', state3);
Object.assign(state3, res3_1.patch);
console.log('Turno 1 Respuesta:', `"${res3_1.reply}"`);

const res3_2 = await StateMachine.processMessage('c-amb-3', 'jajaja si tal cual', state3);
Object.assign(state3, res3_2.patch);
console.log('\nTurno 2 Respuesta:', `"${res3_2.reply}"`);

const res3_3 = await StateMachine.processMessage('c-amb-3', 'bueno dale', state3);
Object.assign(state3, res3_3.patch);
console.log('\nTurno 3 (Handoff por reincidencia):');
console.log('   Acción:', res3_3.action);
console.log('   Respuesta:', `"${res3_3.reply}"`);
console.log('   Funnel Resultante:', state3.funnel);