// import { CallableContext } from "firebase-functions/lib/providers/https";


// const followChannel = async (user, channel, method) => {
// 	const userInfo = await Api.getUserInfo(user);
// 	const channelInfo = await Api.getUserInfo(channel);
// 	const firebaseId = sha1(userInfo.id);
// 	try {
// 		const userFirebaseData = (await firestore().collection("Streamers").doc(firebaseId).collection("twitch").doc("data").get()).data();
// 		const refreshData = await Api.fetch(
// 			`https://api.disstreamchat.com/twitch/token/refresh?token=${userFirebaseData.refresh_token}&key=${process.env.DSC_API_KEY}`
// 		);
// 		const userApi = new TwitchApi({
// 			clientId: process.env.TWITCH_CLIENT_ID,
// 			authorizationKey: refreshData.access_token,
// 			kraken: true,
// 		});
// 		await fetch(`https://api.twitch.tv/kraken/users/${userInfo.id}/follows/channels/${channelInfo.id}`, {
// 			method,
// 			headers: {
// 				Accept: "application/vnd.twitchtv.v5+json",

// 				Authorization: `OAuth ${refreshData.access_token}`,
// 			},
// 			body: "",
// 		});
// 	} catch (err) {
// 		log(err.message);
// 		throw err;
// 	}
// };

// interface FollowData {
// 	userId: string,
// 	channelId: string,
// 	action: "follow" | "unfollow"
// }

// export const FollowFunction = (data: FollowData, context: CallableContext) => {

// }