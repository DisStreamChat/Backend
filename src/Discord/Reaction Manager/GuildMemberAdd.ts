import setup from "./setup";
import { addRole, removeRole } from "./misc";
import admin from "firebase-admin";
import { log } from "../../utils/functions/logging";

export default async (member, DiscordClient) => {
	let { rolesToGive, DMuser } = await setup({ message: { guild: member.guild, id: "member-join" } }, member, true);
	const roleGuildRef = await admin.firestore().collection("roleManagement").doc(member.guild.id).get();
	const roleData = roleGuildRef.data();
	rolesToGive = [...(rolesToGive || []), ...(roleData?.join?.roles || [])];
	if (!rolesToGive) return;
	for (const roleToGive of rolesToGive) {
		try{
			await addRole({ member, role: roleToGive.id || roleToGive, DMuser, DiscordClient });
		}catch(err){
			log(err.message, {error: true})
		}
	}
};
