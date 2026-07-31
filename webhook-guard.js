/**
 * ============================================================
 * WEBHOOK GUARD — Blindaje de webhooks para Agente IA Omnicanal
 * Óptica Círculo Visión / VENTOS
 * ============================================================
 */

'use strict';

const DEFAULTS = {
  debounceMs: 7000,           // ventana de ráfaga (6-8 seg recomendado)
  maxDebounceMs: 25000,       // tope: aunque sigan llegando mensajes, procesar
  dedupeTtlMs: 5 * 60 * 1000, // memoria de messageIds procesados (5 min)
  dedupeMax: 2000,            // tope de IDs en memoria
};

class WebhookGuard {
  constructor(opts = {}) {
    if (typeof opts.processBatch !== 'function') {
      throw new Error('WebhookGuard: falta processBatch(contactId, messages)');
    }
    if (typeof opts.sendReply !== 'function') {
      throw new Error('WebhookGuard: falta sendReply(contactId, texto)');
    }

    this.cfg = { ...DEFAULTS, ...opts };
    this.processBatch = opts.processBatch;
    this.sendReply = opts.sendReply;
    this.isHumanHandling = opts.isHumanHandling || (async () => false);
    this.log = opts.logger || defaultLogger;

    this.seenMessageIds = new Map();
    this.buffers = new Map();
    this.locks = new Map();

    this._cleanupInterval = setInterval(() => this._cleanupSeen(), 60 * 1000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();

    this.stats = {
      startedAt: Date.now(),
      received: 0,
      duplicatesDropped: 0,
      batchesProcessed: 0,
      repliesSent: 0,
      repliesDiscardedHuman: 0,
      errors: 0,
      lastError: null,
      lastActivityAt: null,
    };
  }

  ingest({ contactId, messageId, text, hasAttachment, raw }) {
    this.stats.received++;
    this.stats.lastActivityAt = Date.now();

    if (!contactId) {
      this.log('warn', 'Webhook sin contactId — descartado', { raw });
      return { accepted: false, reason: 'sin_contactId' };
    }

    if (messageId) {
      if (this.seenMessageIds.has(messageId)) {
        this.stats.duplicatesDropped++;
        this.log('info', `Duplicado descartado (messageId ya visto)`, { contactId, messageId });
        return { accepted: false, reason: 'duplicado' };
      }
      this.seenMessageIds.set(messageId, Date.now());
      if (this.seenMessageIds.size > this.cfg.dedupeMax) this._cleanupSeen(true);
    }

    let buf = this.buffers.get(contactId);
    if (!buf) {
      buf = { messages: [], timer: null, firstAt: Date.now() };
      this.buffers.set(contactId, buf);
    }

    buf.messages.push({ messageId, text: text || '', hasAttachment: Boolean(hasAttachment), raw, at: Date.now() });

    if (buf.timer) clearTimeout(buf.timer);

    const elapsed = Date.now() - buf.firstAt;
    const wait = Math.min(this.cfg.debounceMs, Math.max(0, this.cfg.maxDebounceMs - elapsed));

    buf.timer = setTimeout(() => this._flush(contactId), wait);

    this.log('info', `Mensaje encolado (${buf.messages.length} en ráfaga, flush en ${wait}ms)`, {
      contactId, messageId,
    });
    return { accepted: true, reason: 'encolado' };
  }

  async _flush(contactId) {
    const buf = this.buffers.get(contactId);
    if (!buf || buf.messages.length === 0) return;
    this.buffers.delete(contactId);

    const messages = buf.messages;

    await this._withLock(contactId, async () => {
      try {
        this.stats.batchesProcessed++;

        if (await this._safeHumanCheck(contactId)) {
          this.stats.repliesDiscardedHuman++;
          this.log('info', 'Contacto en atención humana — IA no responde', { contactId });
          return;
        }

        const respuesta = await this.processBatch(contactId, messages);

        if (!respuesta) {
          this.log('info', 'processBatch devolvió null — sin respuesta', { contactId });
          return;
        }

        if (await this._safeHumanCheck(contactId)) {
          this.stats.repliesDiscardedHuman++;
          this.log('info', 'Nico intervino durante la generación — respuesta descartada', { contactId });
          return;
        }

        await this.sendReply(contactId, respuesta);
        this.stats.repliesSent++;
        this.log('info', 'Respuesta enviada', { contactId, chars: respuesta.length });
      } catch (err) {
        this.stats.errors++;
        this.stats.lastError = { at: Date.now(), message: String(err && err.message || err) };
        this.log('error', 'Error procesando ráfaga', { contactId, error: String(err) });
      }
    });
  }

  async _withLock(contactId, fn) {
    while (this.locks.has(contactId)) {
      await this.locks.get(contactId);
    }
    let release;
    const lockPromise = new Promise((r) => { release = r; });
    this.locks.set(contactId, lockPromise);
    try {
      return await fn();
    } finally {
      this.locks.delete(contactId);
      release();
    }
  }

  async _safeHumanCheck(contactId) {
    try {
      return await this.isHumanHandling(contactId);
    } catch (err) {
      this.log('warn', 'Fallo al verificar tag atencion_humana — se asume IA activa', {
        contactId, error: String(err),
      });
      return false;
    }
  }

  _cleanupSeen(force = false) {
    const now = Date.now();
    for (const [id, ts] of this.seenMessageIds) {
      if (force || now - ts > this.cfg.dedupeTtlMs) this.seenMessageIds.delete(id);
      if (force && this.seenMessageIds.size <= this.cfg.dedupeMax / 2) break;
    }
  }

  healthSnapshot() {
    return {
      ok: true,
      uptimeSeconds: Math.round((Date.now() - this.stats.startedAt) / 1000),
      pendingBuffers: this.buffers.size,
      activeLocks: this.locks.size,
      dedupeCacheSize: this.seenMessageIds.size,
      ...this.stats,
    };
  }

  async shutdown() {
    clearInterval(this._cleanupInterval);
    const pending = [...this.buffers.keys()];
    for (const contactId of pending) {
      const buf = this.buffers.get(contactId);
      if (buf && buf.timer) clearTimeout(buf.timer);
      await this._flush(contactId);
    }
  }
}

function defaultLogger(nivel, msg, data) {
  const ts = new Date().toISOString();
  const extra = data ? ' ' + JSON.stringify(data) : '';
  console.log(`[${ts}] [${nivel.toUpperCase()}] ${msg}${extra}`);
}

export { WebhookGuard };