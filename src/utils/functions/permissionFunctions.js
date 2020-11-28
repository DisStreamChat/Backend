const adminIds = require("../../ranks.json");
const { Permissions } = require("discord.js");

const getHighestRole = roles => roles.reduce((acc, cur) => (acc.rawPosition > cur.rawPosition ? acc : cur));

const checkOverwrites = (overwrites, perms, admin) => {
	const Allows = new Permissions(overwrites.allow);
	const Deny = new Permissions(overwrites.deny);
	return { allow: Allows.any(perms, admin), deny: !Deny.any(perms, admin) };
};

const isAdmin = user => {
	const discordAdmins = adminIds.discord.developers;
	return discordAdmins.includes(user.id);
};

const adminWare = async (message, args, client, cb) => {
	const discordAdmins = adminIds.discord.developers;
	if (discordAdmins.includes(message.author.id)) {
		await cb(message, args, client);
	} else {
		await message.channel.send("❌ You don't have permission to use this command.");
	}
};

const hasPermission = async (member, perms, channel, admin) => {
	const guild = member.guild;
	// if(guild.ownerId === member.id) return true
	const hasGlobalPerms = ArrayAny(member.permissions.toArray(), perms);
	let hasPerm = hasGlobalPerms;
	if (channel) {
		const permissionOverwrites = channel?.permissionOverwrites;
		if (!permissionOverwrites) return hasPerm;
		const overWriteRoles = (await Promise.all(permissionOverwrites.keyArray().map(key => guild.roles.fetch(key)))).filter(
			role => role.name !== "@everyone"
		);
		const memberRoles = member.roles.cache.array();
		const memberOverWriteRoles = overWriteRoles.filter(role => memberRoles.find(r => role.id === r.id));
		const highestOverWriteRole = getHighestRole(memberOverWriteRoles);
		const roleOverWrites = permissionOverwrites.get(highestOverWriteRole.id);
		const { allow, deny } = checkOverwrites(roleOverWrites, perms, admin);
		return (hasPerm || allow) && hasPerm && deny;
	}
	return hasPerm;
};

const modWare = async (msg, args, client, permissions, cb, { twitch } = {}) => {
	if (await hasPermission(msg.member, permissions)) {
		await cb(msg, args, client);
	} else {
		await msg.channel.send(
			`❌ you don't have permission to use this command, use ${client?.prefix || ""}help to see available commands`
		);
	}
};

module.exports = {
	modWare,
	hasPermission,
	adminWare,
	isAdmin,
	getHighestRole,
	checkOverwrites,
};
