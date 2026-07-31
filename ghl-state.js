/**
 * ============================================================
 * GHL-STATE — Estado persistente en GoHighLevel Custom Fields
 * Óptica Círculo Visión / VENTOS
 * ============================================================
 */

'use strict';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

const FIELD_DEFS = {
  saludo_enviado: {
    name: 'IA - Saludo Enviado',
    fieldKey: 'contact.ia__saludo_enviado',
    type: 'boolean',
  },
  preguntado_receta_chequeo: {
    name: 'IA - Pregunta Receta Hecha',
    fieldKey: 'contact.ia__pregunta_receta_hecha',
    type: 'boolean',
  },
  funnel: {
    name: 'IA - Funnel Estado',
    fieldKey: 'contact.ia__funnel_estado',
    type: 'text',
  },
  ultima_interaccion: {
    name: 'IA - Ultima Interaccion',
    fieldKey: 'contact.ia__ultima_interaccion',
    type: 'text',
  },
};

const FUNNEL_VALIDO = new Set([
  'NUEVO_LEAD',
  'PRESUPUESTADO',
  'ESPERANDO_FOTO_RECETA',
  'TRASPASO_HUMANO',
]);

const DEFAULT_STATE = {
  saludo_enviado: false,
  preguntado_receta_chequeo: false,
  funnel: 'NUEVO_LEAD',
  ultima_interaccion: null,
};

class GHLState {
  constructor(opts = {}) {
    if (!opts.apiToken) throw new Error('GHLState: falta apiToken');
    if (!opts.locationId) throw new Error('GHLState: falta locationId');

    this.apiToken = opts.apiToken;
    this.locationId = opts.locationId;
    this.fetchHistory = opts.fetchHistory || null;
    this.fetch = opts.fetchImpl || globalThis.fetch;
    this.log = opts.logger || ((n, m, d) => console.log(`[GHLState][${n}] ${m}`, d || ''));
    this.cacheTtlMs = opts.cacheTtlMs || 0;

    if (!this.fetch) throw new Error('GHLState: no hay fetch disponible. Pasá fetchImpl.');

    this.fieldIds = {};
    this._cache = new Map();
    this._ready = false;
  }

  _headers(extra = {}) {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };
  }

  async init() {
    const url = `${GHL_API_BASE}/locations/${this.locationId}/customFields`;
    const res = await this.fetch(url, { headers: this._headers() });
    if (!res.ok) {
      const body = await safeText(res);
      console.error(`[GHLState] init ERROR status ${res.status}:`, body);
      throw new Error(`GHLState.init: fallo al listar custom fields (${res.status}): ${body}`);
    }
    const data = await res.json();
    const lista = data.customFields || data.customField || data.fields || [];

    for (const [clave, def] of Object.entries(FIELD_DEFS)) {
      const match = lista.find(
        (f) =>
          (f.fieldKey && f.fieldKey === def.fieldKey) ||
          (f.name && f.name.trim().toLowerCase() === def.name.toLowerCase())
      );
      if (match) {
        this.fieldIds[clave] = match.id;
      } else {
        console.warn(`[GHLState] No encontré el custom field "${def.name}" (fieldKey ${def.fieldKey}).`);
      }
    }

    this._ready = true;
    console.log('[GHLState] init OK. Campos resueltos:', JSON.stringify(this.fieldIds));
    return this.fieldIds;
  }

  _ensureReady() {
    if (!this._ready) {
      throw new Error('GHLState: llamá await store.init() antes de usar getState/setState.');
    }
  }

  async getState(contactId) {
    this._ensureReady();
    if (!contactId) throw new Error('getState: contactId vacío');

    if (this.cacheTtlMs > 0) {
      const c = this._cache.get(contactId);
      if (c && Date.now() - c.at < this.cacheTtlMs) return { ...c.state };
    }

    const url = `${GHL_API_BASE}/contacts/${contactId}`;
    const res = await this.fetch(url, { headers: this._headers() });
    if (!res.ok) {
      const body = await safeText(res);
      console.error(`[GHLState] getState ERROR status ${res.status} para contacto ${contactId}:`, body);
      return { ...DEFAULT_STATE };
    }
    const data = await res.json();
    const contact = data.contact || data;
    const cfArray = contact.customFields || contact.customField || [];

    const state = { ...DEFAULT_STATE };
    for (const [clave, id] of Object.entries(this.fieldIds)) {
      const cf = cfArray.find((x) => x.id === id || x.fieldId === id);
      if (!cf) continue;
      const raw = cf.value != null ? cf.value : cf.fieldValue;
      if (raw == null || raw === '') continue;
      state[clave] = this._parseValue(clave, raw);
    }

    if (this.cacheTtlMs > 0) this._cache.set(contactId, { state: { ...state }, at: Date.now() });
    return state;
  }

  async setState(contactId, patch = {}) {
    this._ensureReady();
    if (!contactId) throw new Error('setState: contactId vacío');

    if (patch.funnel && !FUNNEL_VALIDO.has(patch.funnel)) {
      console.warn(`[GHLState] Funnel inválido "${patch.funnel}", se ignora`, { contactId });
      delete patch.funnel;
    }

    if (patch.ultima_interaccion === undefined) {
      patch.ultima_interaccion = new Date().toISOString();
    }

    const customFields = [];
    for (const [clave, valor] of Object.entries(patch)) {
      const id = this.fieldIds[clave];
      if (!id) {
        console.warn(`[GHLState] No hay campo GHL para "${clave}", se omite`, { contactId });
        continue;
      }
      customFields.push({ id, value: this._serializeValue(clave, valor) });
    }

    if (customFields.length === 0) {
      console.warn('[GHLState] setState: nada para escribir', { contactId, patch });
      return { ok: false, reason: 'sin_campos' };
    }

    const url = `${GHL_API_BASE}/contacts/${contactId}`;
    try {
      const res = await this.fetch(url, {
        method: 'PUT',
        headers: this._headers(),
        body: JSON.stringify({ customFields }),
      });

      if (!res.ok) {
        const body = await safeText(res);
        console.error(`[GHLState] setState ERROR status ${res.status} para contacto ${contactId}:`, body);
        throw new Error(`setState fallo (${res.status}): ${body}`);
      }

      if (this.cacheTtlMs > 0) {
        const prev = this._cache.get(contactId);
        const base = prev ? prev.state : { ...DEFAULT_STATE };
        this._cache.set(contactId, { state: { ...base, ...patch }, at: Date.now() });
      }

      console.log(`[GHLState] setState OK para contacto ${contactId}:`, JSON.stringify(patch));
      return { ok: true };
    } catch (err) {
      console.error(`[GHLState] setState EXCEPTION para contacto ${contactId}:`, err.message);
      throw err;
    }
  }

  invalidate(contactId) {
    this._cache.delete(contactId);
  }

  async getHistory(contactId, limit = 20) {
    if (!this.fetchHistory) {
      return [];
    }
    return this.fetchHistory(contactId, limit);
  }

  _parseValue(clave, raw) {
    const def = FIELD_DEFS[clave];
    if (def && def.type === 'boolean') {
      const s = String(raw).trim().toLowerCase();
      return s === 'true' || s === 'si' || s === 'sí' || s === '1' || s === 'yes';
    }
    return raw;
  }

  _serializeValue(clave, valor) {
    const def = FIELD_DEFS[clave];
    if (def && def.type === 'boolean') {
      return valor ? 'true' : 'false';
    }
    return valor == null ? '' : String(valor);
  }
}

async function safeText(res) {
  try { return await res.text(); } catch { return '<sin cuerpo>'; }
}

export { GHLState, FIELD_DEFS, FUNNEL_VALIDO, DEFAULT_STATE };