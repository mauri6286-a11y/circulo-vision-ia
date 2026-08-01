import { clasificarIntencion } from './intencion-classifier.js';
import { StateMachine } from './state-machine.js';

const casos = [
  {
    titulo: "Triple Intención: Precio Bifocal + Cuotas + Horarios/Ubicación",
    mensaje: "cuánto un bifocal, hacen cuotas y dónde están?"
  },
  {
    titulo: "Doble Intención: Precio Antirreflejo + Envíos",
    mensaje: "cuánto un antirreflejo y hacen envíos?"
  },
  {
    titulo: "Simple Intención: Precio Antirreflejo",
    mensaje: "cuánto un antirreflejo?"
  }
];

console.log("=================================================");
console.log("🚀 PRUEBA DE CLASIFICACIÓN MÚLTIPLE (ARRAY DE INTENCIONES)");
console.log("=================================================\n");

for (const c of casos) {
  console.log(`📌 ${c.titulo}`);
  console.log(`   Mensaje Cliente: "${c.mensaje}"`);
  
  const intentJson = await clasificarIntencion({ mensaje: c.mensaje, historial: [] });
  console.log("   JSON Clasificador Gemini Mode:", JSON.stringify(intentJson, null, 2));

  const stateResult = await StateMachine.processMessage(`multi-${Date.now()}`, c.mensaje, {}, { intentJson });
  console.log("   Acción del Motor:", stateResult.action);
  console.log("   Respuesta del Bot:", `"${stateResult.reply}"`);
  console.log("-------------------------------------------------\n");
}