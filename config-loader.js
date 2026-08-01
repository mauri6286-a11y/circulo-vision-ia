import fs from 'fs';
import path from 'path';

let currentConfig = null;

export function loadConfig() {
  const configFile = process.env.CLIENTE_CONFIG || 'config-optica-circulo-vision.json';
  const configPath = path.resolve(process.cwd(), configFile);
  let raw = fs.readFileSync(configPath, 'utf8');
  raw = raw.replace(/^\uFEFF/, '');
  currentConfig = JSON.parse(raw);
  return currentConfig;
}

export function getConfig() {
  if (!currentConfig) {
    return loadConfig();
  }
  return currentConfig;
}