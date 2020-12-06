const resolveUser = (msg, username) => {
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
	if (memberCache.find(member => member.id === username)) {
		return memberCache.find(member => member.id === username);
	}
	return null;
};

const resolveRole = (msg, role) => {
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

const getRoleIds = user => user.roles.cache.array().map(role => role.id);

module.exports = {
	getRoleIds,
	resolveRole,
	resolveUser,
};
