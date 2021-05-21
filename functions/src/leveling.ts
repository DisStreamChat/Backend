import {firestore} from "firebase-admin";
import * as functions from "firebase-functions";

const aggregateRank = functions.firestore.document("Leveling/{guildId}/users/{userId}").onUpdate(async (change, context) => {
	const {guildId, userId} = context.params

	const guildRef = firestore().collection("Leveling").doc(guildId).collection("users")
	const user = (
		await firestore().collection("Streamers").where("discordId", "==", userId).get()
	).docs.reduce((acc, cur) => ({...cur.data(), ...acc}), {}) as any

	const docRef = guildRef.doc(userId)

	const sorted = (
		await guildRef.orderBy("xp", "desc").get()
	).docs.map(doc => ({ id: doc.id, ...doc.data() }));

	let rank = sorted.findIndex(entry => entry.id === userId) + 1;
	if (rank === 0) rank = sorted.length + 1;

	docRef.update({rank, backgroundOpacity: user.backgroundOpacity, primaryColor: user.primaryColor, backgroundImage: user.backgroundImage})
})

export const leveling = {aggregateRank};
