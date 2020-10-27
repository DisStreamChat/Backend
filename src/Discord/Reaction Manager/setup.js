const admin = require("firebase-admin");

module.exports = async (reaction, user, onJoin) => {
	console.log(reaction, user, onJoin)
	const message = reaction.message;
	const guild = message.guild;
	const guildRef = admin.firestore().collection("reactions").doc(guild.id);
	const guildDB = await guildRef.get();
	const guildData = guildDB.data();
	console.log(`guildData ${guildData}`)
	if (!guildData) {
		try {
			guildRef.update({});
		} catch (err) {
			guildRef.set({});
		}
		return {};
	}
	const reactionRoleMessage = guildData[message.id];
	if (!reactionRoleMessage) return {};
	let action;
	if (onJoin) {
		action = reactionRoleMessage.actions["user-join"];
	} else {
		action = reactionRoleMessage.actions[reaction?.emoji?.id || reaction?.emoji?.name];
		if (!action) action = reactionRoleMessage.actions["catch-all"];
	}
	if (!action) return {};
	const roleToGiveId = action.role;
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
