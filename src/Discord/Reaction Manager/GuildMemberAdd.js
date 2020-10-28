import setup from "./setup";
import { addRole, removeRole } from "./misc";

module.exports = async (member, DiscordClient) => {
	// console.log(member)
	const { rolesToGive, DMuser } = await setup({ message: { guild: member.guild, id: "member-join" } }, member, true);
	if (!rolesToGive) return;
	for (const roleToGive of rolesToGive) {
		await addRole({ member, role: roleToGive, DMuser, DiscordClient });
	}
};
