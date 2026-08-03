import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🧪 PRUEBA DE AVISO DE VISITA Y DEDUPLICACIÓN DE RESPUESTAS");
console.log("=================================================\n");

// Caso 1: "hola voy para el local"
console.log('📌 PRUEBA 1: "hola voy para el local"');
const res1 = await StateMachine.processMessage('c-v1', 'hola voy para el local');
console.log('   Respuesta:', `"${res1.reply}"`);

// Caso 2: "mi señora quiere hacerse lentes"
console.log('\n📌 PRUEBA 2: "mi señora quiere hacerse lentes"');
const res2 = await StateMachine.processMessage('c-v2', 'mi señora quiere hacerse lentes');
console.log('   Respuesta:', `"${res2.reply}"`);

// Caso 3: "ya soy cliente y llevo a alguien"
console.log('\n📌 PRUEBA 3: "ya soy cliente y llevo a alguien"');
const res3 = await StateMachine.processMessage('c-v3', 'ya soy cliente y llevo a alguien');
console.log('   Respuesta:', `"${res3.reply}"`);

// Caso 4: Diálogo real consecutivo de Roberto
console.log('\n📌 PRUEBA 4: Caso Real de Roberto (2 Mensajes Consecutivos)');
let stateRoberto = {};
const resR1 = await StateMachine.processMessage('c-roberto', 'Hola estamos yendo para ahí soy Roberto voy con mi esposa', stateRoberto);
Object.assign(stateRoberto, resR1.patch);
console.log('   Turno 1 Respuesta:', `"${resR1.reply}"`);

const resR2 = await StateMachine.processMessage('c-roberto', 'Yo me hice los lentes ahí, ahora voy con mi esposa para ahí se va a hacer los lentes', stateRoberto);
Object.assign(stateRoberto, resR2.patch);
console.log('   Turno 2 Respuesta:', `"${resR2.reply}"`);
console.log('   ¿Son iguales Turno 1 y Turno 2?:', resR1.reply === resR2.reply);

console.log("\n=================================================");