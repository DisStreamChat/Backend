import { firestore } from "firebase-admin";
import cache from "memory-cache";

import { io } from "../app";
import { GenericMessageType, MessageMap } from "../models/message.model";
import { log } from "./functions/logging";

interface SendMessageOptions {
	channel: string;
	platform: "channel" | "twitch";
}

const cacheInstance = new cache.Cache<string, MessageMap>();

const handleMessageTimeout = async (key: string, value: MessageMap) => {
	return;
	const db = firestore();
	const batch = db.batch();

	const channelRef = db.collection("messages").doc(key).collection("messages");

	const channel = await channelRef.get();

	const { docs } = channel;
	const docCount = docs.length;

	if (docCount >= 500) {
		for (const doc of docs) {
			await doc.ref.delete();
		}
	}

	for (const [id, message] of value.entries()) {
		const docRef = channelRef.doc(id);
		batch.set(docRef, message);
	}

	await batch.commit();
};

export const sendMessage = async (message: GenericMessageType, options: SendMessageOptions): Promise<void> => {
	try {
		io.in(`${options.platform}-${options.channel}`).emit("chatmessage", message);
		const messages: MessageMap = cacheInstance.get(options.channel) ?? new Map();
		messages.set(message.id, message);
		cacheInstance.put(options.channel, messages, 500, handleMessageTimeout);
	} catch (err) {
		log(`Error in sending message to app: ${err.message}`);
	}
};
