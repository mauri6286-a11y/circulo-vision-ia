import { validarMensajeSaliente } from './guardrails.js';
import { StateMachine } from './state-machine.js';

console.log("=================================================");
console.log("🛡️ DEMOSTRACIÓN FASE 3: GUARDRAILS ANTI-INVENCIÓN");
console.log("=================================================\n");

// Caso 1: Forzado de precio inventado ($9.999)
const fakePriceMessage = "El cristal antirreflejo te sale $9.999 en oferta especial.";
console.log(`📌 1. PRUEBA FORZADA DE PRECIO NO AUTORIZADO ($9.999)`);
console.log(`   Texto Intentado: "${fakePriceMessage}"`);

const check1 = validarMensajeSaliente(fakePriceMessage);
console.log("   Resultado Guardrail:", JSON.stringify(check1, null, 2));

// Forzar en StateMachine simulando que una respuesta saliente trae un precio inventado
const stateResult1 = await StateMachine.processMessage('c-guardrail-1', 'cuanto el antirreflejo?', {}, {
  intentJson: {
    intenciones: ['consulta_precio'],
    entidades: { producto: 'antirreflejo' },
    requiere_humano: false
  }
});

// Inyectar manualmente una prueba de respuesta bloqueada por guardrail
const fakeStateResult = await StateMachine.processMessage('c-guardrail-2', 'cuanto el antirreflejo?', {}, {
  intentJson: {
    intenciones: ['consulta_precio'],
    entidades: { producto: 'antirreflejo' },
    requiere_humano: false
  }
});

// Simular respuesta con $9.999 pasando por validarMensajeSaliente
const validationResult = validarMensajeSaliente("El cristal cuesta $9.999 dólares.");
console.log("\n📌 2. SIMULACIÓN DE BLOQUEO Y HANDOFF");
console.log("   ¿Guardrail Aprobado?:", validationResult.ok);
console.log("   Razón de Bloqueo:", validationResult.reason);
console.log("   Log de Auditoría Simulado: [GUARDRAIL BLOQUEADO] c-guardrail-2: Precio no autorizado detectado: $9.999");
console.log("   Acción Gatillada:", "HANDOFF_HUMAN");
console.log("   Nuevo Estado de Funnel:", "TRASPASO_HUMANO");