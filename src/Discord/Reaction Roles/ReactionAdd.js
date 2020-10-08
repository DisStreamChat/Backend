const admin = require("firebase-admin");
import setup from "./setup";
module.exports = async (reaction, user) => {
	const roleToGive = setup(reaction, user);
	if (!roleToGive) return;
	await member.roles.add(roleToGive);
	// handle reaction and assign the correct role
};
