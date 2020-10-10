const admin = require("firebase-admin");
import setup from "./setup";

module.exports = async (reaction, user) => {
	const { roleToGive, toggle } = await setup(reaction, user);
	if (!roleToGive) return;
	if (toggle) {
        const member = await reaction.message.guild.members.resolve(user)
		await member.roles.remove(roleToGive);
	}
};
