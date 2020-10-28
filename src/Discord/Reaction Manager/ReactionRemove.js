import setup from "./setup";
import { addRole, removeRole } from "./misc";

module.exports = async (reaction, user, DiscordClient) => {
	console.log("role removed");
	const { roleToGive, type, DMuser, role, member } = await setup(reaction, user);
	if (!roleToGive) return;

	switch (type) {
		case "REMOVE_ON_REMOVE":
		case "TOGGLE":
			if (member.roles.cache.has(role)) {
				await removeRole({ role: roleToGive, member, DMuser, DiscordClient });
			}
			break;
		case "ADD_ON_REMOVE":
			if (!member.roles.cache.has(role)) {
				await addRole({ role: roleToGive, member, DMuser, DiscordClient });
			}
			break;
	}
};
