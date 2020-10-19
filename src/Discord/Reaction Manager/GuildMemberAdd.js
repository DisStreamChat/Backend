import setup from "./setup";
import { addRole, removeRole } from "./misc";

module.exports = async (member, DiscordClient) => {
    // console.log(member)
	const { roleToGive, DMuser } = await setup({ message: { guild: member.guild, id: "member-join" } }, member, true);
	if (!roleToGive) return;
	await addRole({ member, role: roleToGive, DMuser, DiscordClient });
};
