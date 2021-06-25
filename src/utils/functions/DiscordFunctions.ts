import { Guild, GuildMember, Message } from "discord.js";
import { firestore } from "firebase-admin";

export const resolveUser = async (msg: Message, username: string) => {
	if (!username?.length) return null;
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
	const userFromId = await msg.guild.members.fetch(username);
	if (userFromId) {
		return userFromId;
	}
	return null;
};

export const resolveRole = (msg: Message, role: string) => {
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

export const getRoleIds = (user: GuildMember) => user.roles.cache.array().map(role => role.id);

export const isPremium = async (guild: Guild) => {
	return (await firestore().collection("premiumServers").doc(guild.id).get()).exists;
};
