import setup from "./setup";
import { addRole, removeRole } from "./misc";

module.exports = async (reaction, user) => {
	const { roleToGive, type, DMuser, role } = await setup(reaction, user);
	if (!roleToGive) return;
	const member = await reaction.message.guild.members.resolve(user);
	switch (type) {
		case "REMOVE_ON_REMOVE":
		case "TOGGLE":
			if (member.roles.cache.has(role)) {
				await removeRole({ role: roleToGive, member, DMuser });
			}
			break;
		case "ADD_ON_REMOVE":
			if (!member.roles.cache.has(role)) {
				await addRole({ role: roleToGive, member, DMuser });
			}
			break;
	}
};
