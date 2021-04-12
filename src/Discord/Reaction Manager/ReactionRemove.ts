import setup from "./setup";
import { addRole, removeRole } from "./misc";

export default async (reaction, user, DiscordClient) => {
	try {
		let { type, DMuser, role: roles, rolesToGive, member } = await setup(reaction, user);
		if (!Array.isArray(roles)) roles = [roles];
		for (const roleToGive of rolesToGive) {
			const role = roleToGive.id;
			switch (type) {
				case "REMOVE_ON_REMOVE":
				case "TOGGLE_REVERSED":
					if (!member.roles.cache.has(role)) {
						await addRole({ role: roleToGive, member, DMuser, DiscordClient });
					}
					break;
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
		}
	} catch (err) {}
};
