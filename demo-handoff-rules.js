import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE NUEVAS REGLAS DE DERIVACIÓN Y TRANSFERENCIAS");
console.log("=================================================\n");

// Test 1: Multifocales / Progresivos
console.log('📌 PRUEBA 1: Multifocales / Progresivos');
const res1 = await StateMachine.processMessage('c-multi', 'cuánto me salen unos cristales multifocales progresivos?');
console.log('   Acción:', res1.action);
console.log('   Respuesta:', `"${res1.reply}"`);
console.log('   Funnel resultante:', res1.patch.funnel);

// Test 2: Datos bancarios / Transferencia
console.log('\n📌 PRUEBA 2: Pedido de datos de transferencia / cuenta bancaria');
const res2 = await StateMachine.processMessage('c-bank', 'dónde deposito o me pasás los datos para transferir?');
console.log('   Acción:', res2.action);
console.log('   Respuesta:', `"${res2.reply}"`);
console.log('   Funnel resultante:', res2.patch.funnel);

console.log("\n=================================================");