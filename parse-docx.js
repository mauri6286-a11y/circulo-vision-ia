import fs from 'fs';
import { execSync } from 'child_process';

// Use PowerShell to read the text inside document.xml cleanly
const psScript = `
$filePath = 'c:\\Users\\Mauricio Nuñez\\Desktop\\AGENTE DE IA\\OPTICA CIRCULO VISION\\ghl-integration\\📝 Cuestionario de Relevamiento Comercial — Óptica Círculo Visión.docx'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$xml -replace '<[^>]+>', ' ' -replace '\\s+', ' '
`;

fs.writeFileSync('temp.ps1', psScript, 'utf8');

try {
  const output = execSync('powershell -ExecutionPolicy Bypass -File temp.ps1', { encoding: 'utf8' });
  console.log("=== CONTENIDO EXTRAÍDO DEL DOCUMENTO ===");
  console.log(output);
} catch (e) {
  console.error("Error leyendo docx:", e.message);
} finally {
  if (fs.existsSync('temp.ps1')) fs.unlinkSync('temp.ps1');
}
