import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE FALLBACK [DERIVA_POR_DUDA] A HUMANO");
console.log("=================================================\n");

// Caso 1: Mensaje ambiguo / no clasificable ("es que el otro día vi un programa en la tv")
console.log('📌 CASO 1: Mensaje ambiguo / no clasificable');
const res1 = await StateMachine.processMessage('c-duda-1', 'es que el otro día vi un programa en la tv');
console.log('   Acción:', res1.action);
console.log('   Respuesta:', `"${res1.reply}"`);
console.log('   Funnel Resultante:', res1.patch.funnel);

// Caso 2: Saludo inicial + Saludo repetido sin consulta
console.log('\n📌 CASO 2: Saludo inicial -> Saludo repetido sin consulta');
let state2 = {};
const res2_1 = await StateMachine.processMessage('c-duda-2', 'hola', state2);
Object.assign(state2, res2_1.patch);
console.log('   Turno 1 Respuesta:', `"${res2_1.reply}"`);

const res2_2 = await StateMachine.processMessage('c-duda-2', 'buenas qué tal', state2);
Object.assign(state2, res2_2.patch);
console.log('   Turno 2 (Reincidencia sin consulta):');
console.log('   Acción:', res2_2.action);
console.log('   Respuesta:', `"${res2_2.reply}"`);
console.log('   Funnel Resultante:', res2_2.patch.funnel);

// Caso 3: Agradecimiento
console.log('\n📌 CASO 3: Agradecimiento ("gracias impecable")');
const res3 = await StateMachine.processMessage('c-duda-3', 'gracias impecable');
console.log('   Acción:', res3.action);
console.log('   Respuesta:', `"${res3.reply}"`);

// Caso 4: Consulta clara
console.log('\n📌 CASO 4: Consulta comercial clara ("cuánto sale el antirreflejo")');
const res4 = await StateMachine.processMessage('c-duda-4', 'cuánto sale el antirreflejo');
console.log('   Acción:', res4.action);
console.log('   Respuesta:', `"${res4.reply}"`);

console.log("\n=================================================");