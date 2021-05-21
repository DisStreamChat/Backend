import { GuildMember } from "discord.js";

export const resolveUser = async (msg, username): Promise<GuildMember> => {
	if(!username?.length) return null
	const memberCache = msg.guild.members.cache;
	if (/<@!?\d+>/g.test(username)) {
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
	const userFromId = await msg.guild.members.fetch(username)
	if (userFromId) {
		return userFromId
	}
	return null;
};

export const resolveRole = (msg, role) => {
	const roleCache = msg.guild.roles.cache;
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

export const getRoleIds = user => user.roles.cache.array().map(role => role.id);