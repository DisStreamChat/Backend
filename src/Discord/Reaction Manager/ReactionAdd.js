import setup from "./setup";
import { addRole, removeRole } from "./misc";
// please work
module.exports = async (reaction, user, DiscordClient) => {
    const { roleToGive, type, role, DMuser } = await setup(reaction, user);
    console.log(DMuser)
	if (!roleToGive) return;
	const member = await reaction.message.guild.members.resolve(user);
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
