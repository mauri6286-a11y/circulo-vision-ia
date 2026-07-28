import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');

// Estructura por defecto
let memoryDb = {
  contactos: {},
  historial: {}
};

// Cargar base de datos al iniciar
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      memoryDb = JSON.parse(data);
      console.log(`💾 Base de Datos Local cargada exitosamente (${Object.keys(memoryDb.contactos).length} contactos registrados).`);
    } else {
      saveDatabase();
    }
  } catch (e) {
    console.error("Error cargando base de datos local:", e.message);
  }
}

// Guardar base de datos atómicamente
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (e) {
    console.error("Error guardando base de datos local:", e.message);
  }
}

loadDatabase();

export const db = {
  // Obtener o crear contacto
  getContact(contactId) {
    if (!memoryDb.contactos[contactId]) {
      memoryDb.contactos[contactId] = {
        contact_id: contactId,
        nombre: "",
        estado_funnel: "NUEVO_LEAD",
        ia_pausada: false,
        presupuesto_ofrecido: null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      saveDatabase();
    }
    return memoryDb.contactos[contactId];
  },

  // Actualizar estado del contacto
  updateContact(contactId, updates) {
    const contact = this.getContact(contactId);
    Object.assign(contact, updates, { fecha_actualizacion: new Date().toISOString() });
    saveDatabase();
    return contact;
  },

  // Pausar o reanudar IA para un contacto
  setIAPaused(contactId, isPaused) {
    return this.updateContact(contactId, { ia_pausada: isPaused });
  },

  // Agregar mensaje al historial del contacto
  addMessage(contactId, emisor, mensaje) {
    if (!memoryDb.historial[contactId]) {
      memoryDb.historial[contactId] = [];
    }
    memoryDb.historial[contactId].push({
      emisor, // 'cliente', 'ia', 'staff'
      mensaje,
      fecha: new Date().toISOString()
    });

    // Mantener máximo los últimos 20 mensajes por contacto
    if (memoryDb.historial[contactId].length > 20) {
      memoryDb.historial[contactId] = memoryDb.historial[contactId].slice(-20);
    }

    saveDatabase();
  },

  // Obtener historial reciente ordenado para la IA
  getHistory(contactId) {
    return memoryDb.historial[contactId] || [];
  }
};
