/**
 * Scope data: di server pakai ID server, di DM pakai 'dm'.
 * Jadi ekonomi tetap jalan walau bot dipakai lewat DM (saldo per orang).
 */
'use strict';

const scopeId = i => (i?.guild?.id ? i.guild.id : 'dm');
const isDM = i => !i?.guild;

module.exports = { scopeId, isDM };
