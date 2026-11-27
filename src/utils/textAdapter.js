/**
 * Adapter: bikin command gaya slash bisa dipakai lewat pesan biasa (tanpa slash).
 * Command yang sudah ada cukup `execute(interaction)` — di sini kita tiru bentuk interaction.
 */
'use strict';

function normalize(payload) {
  if (!payload || typeof payload !== 'object') return { content: String(payload ?? '') };
  const out = { ...payload };
  delete out.ephemeral;
  delete out.fetchReply;
  return out;
}

async function resolveUser(raw, message) {
  if (!raw) return null;
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) {
    const id = mention[1];
    return message.client.users.cache.get(id) || (await message.client.users.fetch(id).catch(() => null));
  }
  if (/^\d{15,25}$/.test(raw)) {
    return message.client.users.cache.get(raw) || (await message.client.users.fetch(raw).catch(() => null));
  }
  if (message.guild) {
    const found = await message.guild.members.fetch({ query: raw, limit: 1 }).catch(() => null);
    const first = found?.first?.();
    if (first) return first.user;
  }
  return null;
}

/**
 * @param {object} command modul command ({ data, execute })
 * @param {string[]} args
 * @param {import('discord.js').Message} message
 */
async function createAdapter(command, args, message, nameOverride) {
  const raw = command.data;
  const arr = Array.isArray(raw) ? raw : [raw];
  const builder = arr.find(b => b?.name === nameOverride) || arr[0];
  const json = builder?.toJSON ? builder.toJSON() : null;
  const defs = json?.options || [];
  const values = new Map();

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    let raw = args[i];
    if (raw === undefined || raw === '') continue;

    if (def.type === 3) {
      if (i === defs.length - 1) raw = args.slice(i).join(' ');
      values.set(def.name, raw);
    } else if (def.type === 4) {
      const n = parseInt(String(raw).replace(/[^\d-]/g, ''), 10);
      if (!Number.isNaN(n)) values.set(def.name, n);
    } else if (def.type === 6) {
      const user = await resolveUser(raw, message);
      if (user) values.set(def.name, user);
    } else if (def.type === 7) {
      const id = String(raw).replace(/[<#>]/g, '');
      const channel = message.guild?.channels.cache.get(id) || message.mentions.channels.first();
      if (channel) values.set(def.name, channel);
    } else {
      values.set(def.name, raw);
    }
  }

  const adapter = {
    isChatInputCommand: () => true,
    commandName: nameOverride || json?.name || command.name,
    user: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    client: message.client,
    createdTimestamp: message.createdTimestamp,
    __message: message,
    options: {
      getString: name => (values.has(name) ? String(values.get(name)) : null),
      getInteger: name => (values.has(name) ? Number(values.get(name)) : null),
      getNumber: name => (values.has(name) ? Number(values.get(name)) : null),
      getBoolean: name => (values.has(name) ? Boolean(values.get(name)) : null),
      getUser: name => values.get(name) || null,
      getMember: name => values.get(name) || null,
      getChannel: name => values.get(name) || null,
      getSubcommand: () => args[0] || null,
      data: defs.map(d => ({ name: d.name, type: d.type, value: values.get(d.name) })),
    },
  };

  adapter.reply = async payload => {
    adapter.replied = true;
    const sent = await message.reply(normalize(payload));
    adapter.__reply = sent;
    return sent;
  };
  adapter.deferReply = async () => {
    adapter.deferred = true;
    await message.channel.sendTyping().catch(() => {});
  };
  adapter.editReply = async payload => {
    if (adapter.__reply) return adapter.__reply.edit(normalize(payload));
    const sent = await message.reply(normalize(payload));
    adapter.__reply = sent;
    return sent;
  };
  adapter.followUp = async payload => {
    const sent = await message.reply(normalize(payload));
    adapter.__reply = adapter.__reply || sent;
    return sent;
  };
  adapter.deleteReply = async () => adapter.__reply?.delete().catch(() => {});

  return adapter;
}

module.exports = { createAdapter };
