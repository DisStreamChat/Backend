import { Guild, GuildMember, Message } from "discord.js";

export const resolveUser = async (msg: Message, username: string, guild?: Guild) => {
	const usedGuild = msg ? msg.guild : guild
	if (!username?.length) return null;
	const memberCache = usedGuild.members.cache;
	if (/<@!?\d+>/g.test(username) && msg) {
		return memberCache.get(msg.mentions.users.first().id);
	}
	if (memberCache.has(username)) {
		return memberCache.get(username);
	}
	if (/(.*)#(\d{4})/g.test(username)) {
		return memberCache.find(member => member.user.tag === username);
	}
	if (memberCache.find(member => member.nickname === username)) {
		return memberCache.find(member => member.nickname === username);
	}
	if (memberCache.find(member => member.user.username === username)) {
		return memberCache.find(member => member.user.username === username);
	}
	const userFromId = await usedGuild.members.fetch(username);
	if (userFromId) {
		return userFromId;
	}
	return null;
};

export const resolveRole = (msg: Message, role: string, guild: Guild) => {
	const usedGuild = msg ? msg.guild : guild
	const roleCache = usedGuild.roles.cache;
	if (/<@&\d+>/g.test(role)) {
		return roleCache.get(msg.mentions.roles.first().id);
	}
	if (roleCache.has(role)) {
		return roleCache.get(role);
	}
	if (roleCache.find(r => r.name === role)) {
		return roleCache.find(r => r.name === role);
	}
	return null;
};

export const getRoleIds = (user: GuildMember) => user.roles.cache.array().map(role => role.id);
