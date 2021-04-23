import setup from "./setup";
import { addRole, removeRole } from "./misc";
import admin from "firebase-admin";

export default async (member, DiscordClient) => {
	let { rolesToGive, DMuser } = await setup({ message: { guild: member.guild, id: "member-join" } }, member, true);
	const roleGuildRef = await admin.firestore().collection("roleManagement").doc(member.guild.id).get();
	const roleData = roleGuildRef.data();
	rolesToGive = [...(rolesToGive || []), ...(roleData?.join?.roles || [])];
	console.log({rolesToGive})
	if (!rolesToGive) return;
	for (const roleToGive of rolesToGive) {
		try{
			console.log(roleToGive.id)
			await addRole({ member, role: roleToGive.id || roleToGive, DMuser, DiscordClient });
		}catch(err){
			console.log(err.message)
		}
	}
};
