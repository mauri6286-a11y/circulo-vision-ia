import { validarMensajeSaliente } from './guardrails.js';

console.log("=================================================");
console.log("🔍 REPRODUCCIÓN EXACTA DEL BUG DE GUARDRAIL EN PRODUCCIÓN");
console.log("=================================================\n");

const testStringDot = "El cristal con antirreflejo cuesta $2.200 (solo cristal, armazones desde $2.490).";
const testStringSpace = "El cristal con antirreflejo cuesta $2\u00A0200 (solo cristal, armazones desde $2\u00A0490).";
const testStringComma = "El cristal con antirreflejo cuesta $2,200 (solo cristal, armazones desde $2,490).";

console.log("1. Probando string con punto de miles (ASCII dot):");
console.log("   Texto:", JSON.stringify(testStringDot));
console.log("   Resultado Guardrail:", validarMensajeSaliente(testStringDot));

console.log("\n2. Probando string con espacio de miles ICU/Linux (Non-breaking space U+00A0):");
console.log("   Texto:", JSON.stringify(testStringSpace));
console.log("   Resultado Guardrail:", validarMensajeSaliente(testStringSpace));

console.log("\n3. Probando string con coma de miles:");
console.log("   Texto:", JSON.stringify(testStringComma));
console.log("   Resultado Guardrail:", validarMensajeSaliente(testStringComma));
