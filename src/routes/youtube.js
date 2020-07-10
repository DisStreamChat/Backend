const express = require("express");
const router = express.Router();
const sha1 = require("sha1");
const fetch = require("node-fetch");
const TwitchApi = require("twitch-lib");
const admin = require("firebase-admin");
const DiscordOauth2 = require("discord-oauth2");
const Discord = require("discord.js");
const { getUserInfo } = require("../utils/DiscordClasses");
const { DiscordClient } = require("../utils/initClients");
const { firestore } = require("firebase-admin");
const { getAllEvents, listenMessages } = require("./youtubeMessages");

router.get("/events", async (req, res, next) => {
	try {
		const events = await getAllEvents();
		return res.json(events);
	} catch (error) {
		return next(error);
	}
});

let listening = false;
async function listenChat(channelId) {
    if(!channelId){
        return {
            listening: false
        }
    }
	if (listening) {
		return {
			listening: true,
		};
	}
	const liveEvent = (await getAllEvents(channelId)).find(event => event.liveStreamingDetails.concurrentViewers);
	if (liveEvent) {
		listening = true;
		const {
			snippet: { liveChatId },
		} = liveEvent;
		const listener = listenMessages(liveChatId);
		listener.on("messages", async newMessages => {
			newMessages = newMessages.sort((a, b) => a.publishedAt - b.publishedAt);
			io.emit("messages", newMessages);
		});
		listener.on("event-end", data => {
			io.emit("event-end", data);
			listening = false;
		});
		return {
			listening: true,
		};
	}
	return {
		listening: false,
	};
}

router.get("/listen", async (req, res) => {
	const result = await listenChat(req.query.id);
	return res.json(result);
});

export default router