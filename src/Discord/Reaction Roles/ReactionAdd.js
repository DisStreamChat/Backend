const admin = require("firebase-admin");
import setup from "./setup";
module.exports = async (reaction, user) => {
	const {roleToGive} = await setup(reaction, user);
    if (!roleToGive) return;
    const member = await reaction.message.guild.members.resolve(user)
	await member.roles.add(roleToGive);
	// handle reaction and assign the correct role
};
