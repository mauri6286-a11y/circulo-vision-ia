import { validarMensajeSaliente } from './guardrails.js';

const testStrings = [
  "$2.200",
  "$2.490",
  "$1.300",
  "$8.490",
  "$2.200 (solo cristal, armazones desde $2.490)",
  "El cristal con antirreflejo cuesta $2.200 (solo cristal, armazones desde $2.490)."
];

console.log("=== PRUEBA DIRECTA DE PARSER DE PRECIOS ===");

for (const text of testStrings) {
  console.log(`\nTexto de prueba: "${text}"`);
  
  // Extraer todos los tokens que empiezan con $
  const matches = text.match(/\$\s*[\d,.]+/g) || [];
  console.log(`Tokens de precio encontrados:`, matches);

  for (const match of matches) {
    // 1. Quitar signo $ y espacios
    let clean = match.replace(/\$/g, '').trim();
    
    // 2. Si el número tiene puntos como separador de miles (ej: 2.200 -> 2200)
    // Se eliminan los puntos
    let numericStr = clean.replace(/\./g, '');
    let numericValue = parseInt(numericStr, 10);

    console.log(`  - Match original: "${match}" -> Limpio sin puntos: "${numericStr}" -> Entero parseado: ${numericValue}`);
  }

  const result = validarMensajeSaliente(text);
  console.log(`Resultado Guardrail:`, result);
}
