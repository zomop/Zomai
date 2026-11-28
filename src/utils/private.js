/**
 * Balasan privat: cuma orang yang manggil yang lihat.
 * - Slash command → ephemeral
 * - Chat biasa  → pesan bot + pesan pemicu dihapus otomatis beberapa detik kemudian
 */
'use strict';

const DEFAULT_MS = 60 * 1000;

function makePrivate(interaction, opts = {}) {
  const ms = opts.ms || DEFAULT_MS;
  const isText = Boolean(interaction.__message);
  const cleanup = [];
  let deferred = false;

  const body = payload => ({
    ...payload,
    allowedMentions: { parse: [], repliedUser: false, ...(payload?.allowedMentions || {}) },
  });

  const priv = {
    isText,
    get deferred() {
      return deferred;
    },

    /** Panggil kalau butuh waktu (fetch/HTTP) biar nggak kena "interaction failed". */
    async defer() {
      if (deferred) return;
      deferred = true;
      if (isText) await interaction.channel?.sendTyping?.().catch(() => {});
      else await interaction.deferReply({ ephemeral: true }).catch(() => {});
    },

    async reply(payload) {
      const payloadBody = body(payload);
      if (isText) {
        const sent = await interaction.reply(payloadBody).catch(() => null);
        if (sent) cleanup.push(sent);
        if (interaction.__message?.deletable) cleanup.push(interaction.__message);
        return sent;
      }
      const sent = deferred
        ? await interaction.editReply(payloadBody).catch(() => null)
        : await interaction.reply({ ...payloadBody, ephemeral: true }).catch(() => null);
      deferred = true;
      return sent;
    },

    async edit(payload) {
      if (isText) {
        const sent = await interaction.editReply(body(payload)).catch(() => null);
        if (sent) cleanup.push(sent);
        return sent;
      }
      return interaction.editReply(body(payload)).catch(() => null);
    },

    /** Hapus pesan bot + pesan pemicu setelah `delay` ms (biar channel tetap bersih). */
    autoCleanup(delay = ms) {
      if (!isText) return;
      setTimeout(() => {
        for (const m of cleanup) m?.delete?.().catch?.(() => {});
      }, delay).unref?.();
    },
  };

  return priv;
}

module.exports = { makePrivate };
