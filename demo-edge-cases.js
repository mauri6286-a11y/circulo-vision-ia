import { clasificarIntencion } from './intencion-classifier.js';
import { StateMachine } from './state-machine.js';

const casosBorde = [
  {
    titulo: "1. Mensaje ambiguo ('hola necesito lentes')",
    mensaje: "hola necesito lentes",
    historial: []
  },
  {
    titulo: "2. Dos intenciones juntas ('cuánto un antirreflejo y hacen envíos?')",
    mensaje: "cuánto un antirreflejo y hacen envíos?",
    historial: []
  },
  {
    titulo: "3. Convenio NO listado en config ('tengo convenio con ANTEL')",
    mensaje: "tengo convenio con ANTEL",
    historial: []
  },
  {
    titulo: "4. Contexto multi-turno ('y cuánto sale el chequeo?' tras decir 'no tengo receta')",
    mensaje: "y cuánto sale el chequeo?",
    historial: [
      { direction: 'inbound', body: 'no tengo receta' },
      { direction: 'outbound', body: '¡Sin ningún problema! Como no tenés receta, lo resolvemos súper fácil con un chequeo visual 100% GRATIS...' }
    ]
  },
  {
    titulo: "5. Mensaje confuso / Typo ('kuanto sale el antirreflejo?')",
    mensaje: "kuanto sale el antirreflejo?",
    historial: []
  },
  {
    titulo: "6. Fuera de tema ('tenés wifi?' o 'aceptan mascotas?')",
    mensaje: "aceptan mascotas?",
    historial: []
  }
];

console.log("=================================================");
console.log("🧪 EVALUACIÓN DE CASOS BORDE (FASE 2 REDISEÑO)");
console.log("=================================================\n");

for (const c of casosBorde) {
  console.log(`📌 ${c.titulo}`);
  console.log(`   Mensaje Cliente: "${c.mensaje}"`);
  if (c.historial.length > 0) {
    console.log(`   Historial Previas:`, JSON.stringify(c.historial));
  }
  
  const intentJson = await clasificarIntencion({
    mensaje: c.mensaje,
    historial: c.historial
  });

  console.log("   JSON Clasificador Gemini Mode:", JSON.stringify(intentJson, null, 2));

  const stateResult = await StateMachine.processMessage(`edge-${Date.now()}`, c.mensaje, {}, {
    historial: c.historial,
    intentJson: intentJson
  });

  console.log("   Acción del Motor:", stateResult.action);
  console.log("   Respuesta del Bot:", `"${stateResult.reply}"`);
  console.log("-------------------------------------------------\n");
}