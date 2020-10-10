const admin = require("firebase-admin");

module.exports = async (reaction, user, onJoin) => {
	const message = reaction.message;
	const guild = message.guild;
	const member = guild.members.resolve(user);
	const guildRef = admin.firestore().collection("reactionRoles").doc(guild.id);
	const guildDB = await guildRef.get();
	const guildData = guildDB.data();
	const reactionRoleMessage = guildData[message.id];
	if (!reactionRoleMessage) return {};
	let action;
	if (onJoin) {
		action = reactionRoleMessage.actions["user-join"];
	} else {
		action = reactionRoleMessage.actions[reaction.emoji.id];
		if (!action) action = reactionRoleMessage.actions["catch-all"];
	}
	if (!action) return {};
	const roleToGive = action.role;
	const roleToGive = await guild.roles.fetch(roleToGiveId);
	return { roleToGive, ...action };
};

/*
action = {
    role: role id that is handled by this action,
    type: REMOVE_ON_REMOVE | REMOVE_ON_ADD | ADD_ON_REMOVE | ADD_ON_ADD | TOGGLE: what should we do with the users roles based on what they did with reaction
    DMuser: whether or not to DM the user when they react and have a role change
}
*/
