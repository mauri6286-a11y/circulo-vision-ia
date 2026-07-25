import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const dir = 'c:\\Users\\Mauricio Nuñez\\Desktop\\AGENTE DE IA\\OPTICA CIRCULO VISION\\ghl-integration';
const files = fs.readdirSync(dir);
const docxFile = files.find(f => f.endsWith('.docx'));

console.log("Archivo docx encontrado:", docxFile);

if (docxFile) {
  // Copy to simple temp name
  const sourcePath = path.join(dir, docxFile);
  const targetPath = path.join(dir, 'doc_temp.zip');
  fs.copyFileSync(sourcePath, targetPath);

  // Unzip using tar or Expand-Archive in powershell
  try {
    execSync(`tar -xf "${targetPath}" -C "${dir}" word/document.xml`, { encoding: 'utf8' });
    const xmlContent = fs.readFileSync(path.join(dir, 'word', 'document.xml'), 'utf8');
    const text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log("\n=== TEXTO COMPLETO EXTRAÍDO ===");
    console.log(text);
  } catch (e) {
    console.error("Error al descomprimir con tar:", e.message);
  } finally {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  }
}
