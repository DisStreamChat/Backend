import { firestore } from "firebase-admin";
import fetch from "node-fetch";

import { Duration, setDurationInterval } from "../duration.util";
import { TwitchApiClient as Api } from "../initClients";
import { log } from "./logging";

export async function getBttvEmotes(channelName) {
	const bttvEmotes = {};
	let bttvRegex;
	const bttvResponse = await fetch("https://api.betterttv.net/3/cached/emotes/global");
	let emotes = await bttvResponse.json();
	const channelInfo = await Api.getUserInfo(channelName);
	const bttvChannelResponse = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelInfo.id}`);
	const { channelEmotes, sharedEmotes } = await bttvChannelResponse.json();
	if (channelEmotes) {
		emotes = emotes.concat(channelEmotes);
	}
	if (sharedEmotes) {
		emotes = emotes.concat(sharedEmotes);
	}
	let regexStr = "";
	emotes.forEach(({ code, id }, i) => {
		bttvEmotes[code] = id;
		regexStr += code.replace(/\(/, "\\(").replace(/\)/, "\\)") + (i === emotes.length - 1 ? "" : "|");
	});
	bttvRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");

	return { bttvEmotes, bttvRegex };
}

export async function getFfzEmotes(channelName) {
	const ffzEmotes = {};
	let ffzRegex;

	const ffzResponse = await fetch("https://api.frankerfacez.com/v1/set/global");
	// replace with your channel url
	const ffzChannelResponse = await fetch(`https://api.frankerfacez.com/v1/room/${channelName}`);
	const { sets } = await ffzResponse.json();
	const { room, sets: channelSets } = await ffzChannelResponse.json();
	let regexStr = "";
	const appendEmotes = ({ name, urls }, i, emotes) => {
		ffzEmotes[name] = `https:${Object.values(urls).pop()}`;
		regexStr += name + (i === emotes.length - 1 ? "" : "|");
	};
	sets[3].emoticons.forEach(appendEmotes);
	if (channelSets && room) {
		const setnum = room.set;
		channelSets[setnum].emoticons.forEach(appendEmotes);
	}
	ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");
	return { ffzEmotes, ffzRegex };
}

export const subscribeToFollowers = async (channelID, leaseSeconds = 864000) => {
	leaseSeconds = Math.min(864000, Math.max(0, leaseSeconds));
	const body = {
		"hub.callback": "https://api.disstreamchat.com/webhooks/twitch?type=follow&new=true",
		"hub.mode": "subscribe",
		"hub.topic": `https://api.twitch.tv/helix/users/follows?first=1&to_id=${channelID}`,
		"hub.lease_seconds": leaseSeconds,
		"hub.secret": process.env.WEBHOOK_SECRET,
	};
	try {
		const response = await Api.fetch("https://api.twitch.tv/helix/webhooks/hub", {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		});
		if (!response.ok) {
			log(await response.json());
		}
	} catch (err) {
		log(err.message);
	}

	return leaseSeconds;
};

export const unsubscribeFromFollowers = async (channelID, leaseSeconds = 864000) => {
	leaseSeconds = Math.min(864000, Math.max(0, leaseSeconds));
	const body = {
		"hub.callback": "https://api.disstreamchat.com/webhooks/twitch?type=follow",
		"hub.mode": "unsubscribe",
		"hub.topic": `https://api.twitch.tv/helix/users/follows?first=1&to_id=${channelID}`,
		"hub.lease_seconds": leaseSeconds,
		"hub.secret": process.env.WEBHOOK_SECRET,
	};
	try {
		await Api.fetch("https://api.twitch.tv/helix/webhooks/hub", {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (err) {
		log(err.message);
	}

	return leaseSeconds;
};

export const initWebhooks = async () => {
	let allConnections = [];

	firestore()
		.collection("webhookConnections")
		.onSnapshot(async snapshot => {
			const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
			allConnections = docs.filter(doc => (doc as any).channelId != undefined);
		});

	const sevenDays = Duration.fromDays(7);
	const tenDays = Duration.fromDays(10);

	await new Promise(resolve => setTimeout(resolve, 1000));
	try {
		const lastConnection: number = (await firestore().collection("webhookConnections").get()).docs
			.find(doc => doc.id === "lastConnection")
			.data().value;

		const now = new Date().getTime();
		const nextConnectionTime = lastConnection + sevenDays.toMilliseconds();
		const timeUntilNextConnection = Math.max(nextConnectionTime - now, 0);
		const updateConnections = () => {
			const value = new Date().getTime();
			allConnections.forEach(async data => {
				const id = data.channelId;
				await unsubscribeFromFollowers(id, tenDays.toMilliseconds());
				await subscribeToFollowers(id, tenDays.toMilliseconds());
			});
			firestore().collection("webhookConnections").doc("lastConnection").update({
				value,
			});
		};
		setTimeout(() => {
			updateConnections();
			setDurationInterval(updateConnections, tenDays);
		}, timeUntilNextConnection);
	} catch (err) {
		log(err);
	}
};
