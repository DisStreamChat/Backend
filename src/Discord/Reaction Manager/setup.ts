import { firestore } from "firebase-admin";
import { resolveUser } from "../../utils/functions";

export default async (reaction, user, onJoin = false) => {
	const message = reaction.message;
	const guild = message.guild;
	const guildRef = firestore().collection("roleManagement").doc(guild.id);
	const legacyGuildRef = firestore().collection("reactions").doc(guild.id);
	const legacyGuildDB = await legacyGuildRef.get();
	const legacyGuildData = legacyGuildDB.data();
	for(const message of Object.entries(legacyGuildData || {})){
		const [key, value] = message
		value.reactions = value.actions
	}
	const guildDB = await guildRef.get();
	const guildData = {...legacyGuildData, ...(guildDB.data() || {})};
	const reactionMessages ={...legacyGuildData, ...(guildDB.data()?.messages || {})}
	if (!guildData) {
		try {
			guildRef.update({});
		} catch (err) {
			guildRef.set({}, { merge: true });
		}
		return {};
	}
	const reactionRoleMessage = reactionMessages[message.id];
	if (!reactionRoleMessage) return {};
	let action;
	if (onJoin) {
		action = reactionRoleMessage.reactions["user-join"];
	} else {
		action = reactionRoleMessage.reactions[reaction?.emoji?.id || reaction?.emoji?.name];
		if (!action) action = reactionRoleMessage.reactions["catch-all"];
	}
	if (!action) return {};
	const roles = action.roles ?? action.role
	let rolesToGiveId = Array.isArray(roles) ? roles : [roles];
	const rolesToGive = await Promise.all(rolesToGiveId.map(roleToGive => guild.roles.fetch(roleToGive.id ?? roleToGive)));
	let member = await reaction.message.guild.members.resolve(user);
	if (!member) {
		member = reaction.message.guild.members.cache.get(user.id);
	}
	if (!member) {
		member = await resolveUser(reaction.message, user.id || user.username);
	}
	return { rolesToGive, member, ...action };
};

/*
action = {
    role: role id that is handled by this action,
    type: REMOVE_ON_REMOVE | REMOVE_ON_ADD | ADD_ON_REMOVE | ADD_ON_ADD | TOGGLE: what should we do with the users roles based on what they did with reaction
    DMuser: whether or not to DM the user when they react and have a role change
}
*/
