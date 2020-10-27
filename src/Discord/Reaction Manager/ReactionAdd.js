import setup from "./setup";
import { addRole, removeRole } from "./misc";
import { resolveUser } from "../../utils/functions";

module.exports = async (reaction, user, DiscordClient) => {
	const { roleToGive, type, role, DMuser } = await setup(reaction, user);
	console.log(DMuser);
	if (!roleToGive) return;
	let member = await reaction.message.guild.members.resolve(user);
	if (!member) {
		member = reaction.message.guild.members.cache.get(user.id);
	}
	if (!member) {
		member = resolveUser(reaction.message, user.id || user.username);
	}
	switch (type) {
		case "REMOVE_ON_ADD":
			if (member.roles.cache.has(role)) {
				await removeRole({ role: roleToGive, member, DMuser, DiscordClient });
			}
			break;
		case "ADD_ON_ADD":
		case "TOGGLE":
			if (!member.roles.cache.has(role)) {
				await addRole({ role: roleToGive, member, DMuser, DiscordClient });
			}
			break;
	}
};
