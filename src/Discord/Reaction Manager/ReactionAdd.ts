import setup from "./setup";
import { addRole, removeRole } from "./misc";

export default async (reaction, user, DiscordClient) => {
	try {
		let { member, type, roles, DMuser, rolesToGive } = await setup(reaction, user);
		if (!Array.isArray(roles)) roles = [roles];
		for (const roleToGive of rolesToGive) {
			const role = roleToGive.id ?? roleToGive;
			switch (type) {
				case "REMOVE_ON_ADD":
					if (member.roles.cache.has(role)) {
						await removeRole({ role, member, DMuser, DiscordClient });
					}
					break;
				case "TOGGLE_REVERSED":
					if (member.roles.cache.has(role)) {
						await removeRole({ role, member, DMuser, DiscordClient });
					}
					break;
				case "ADD_ON_ADD":
				case "TOGGLE":
					if (!member.roles.cache.has(role)) {
						await addRole({ role, member, DMuser, DiscordClient });
					}
					break;
			}
		}
	} catch (err) {}
};
