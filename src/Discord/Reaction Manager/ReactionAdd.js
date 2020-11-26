import setup from "./setup";
import { addRole, removeRole } from "./misc";

module.exports = async (reaction, user, DiscordClient) => {
	try {
		let { member, type, role: roles, DMuser, rolesToGive } = await setup(reaction, user);
		if (!Array.isArray(roles)) roles = [roles];
		for (const roleToGive of rolesToGive) {
			const role = roleToGive.id;
			switch (type) {
				case "REMOVE_ON_ADD":
					if (member.roles.cache.has(role)) {
						await removeRole({ role: roleToGive, member, DMuser, DiscordClient });
					}
					break;
				case "TOGGLE_REVERSED":
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
		}
	} catch (err) {}
};
