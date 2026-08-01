import { clasificarIntencion } from './intencion-classifier.js';
import { StateMachine } from './state-machine.js';

const casos = [
  { label: "Caso 1A: Sin Receta ('la receta la perdí')", msg: "la receta la perdí" },
  { label: "Caso 1B: Sin Receta ('la dejé en casa')", msg: "la dejé en casa" },
  { label: "Caso 2: Convenio STIQ Quimica ('soy del sindicato de la química')", msg: "soy del sindicato de la química" },
  { label: "Caso 3: Fotocromáticos Handoff ('tienen fotocromáticos cuánto')", msg: "tienen fotocromáticos cuánto" },
  { label: "Caso 4: Precio Antirreflejo ('cuánto un antirreflejo')", msg: "cuánto un antirreflejo" }
];

console.log("=================================================");
console.log("🎯 DEMOSTRACIÓN FASE 2: CAPA DE INTENCIÓN GEMINI + RESPUESTAS DETERMINISTAS");
console.log("=================================================\n");

for (const c of casos) {
  console.log(`📌 ${c.label}`);
  console.log(`   Mensaje Cliente: "${c.msg}"`);
  
  const intentJson = await clasificarIntencion({ mensaje: c.msg, historial: [] });
  console.log("   JSON Clasificador:", JSON.stringify(intentJson, null, 2));

  const res = await StateMachine.processMessage(`demo-${Date.now()}`, c.msg, {}, { intentJson });
  console.log("   Acción Motor:", res.action);
  console.log("   Respuesta Bot:", `"${res.reply}"`);
  console.log("-------------------------------------------------\n");
}