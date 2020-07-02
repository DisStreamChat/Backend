const TwitchApi = require("twitch-lib");
const sha1 = require("sha1");
const uuidv1 = require("uuidv1")

// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { formatMessage } = require("./utils/messageManipulation");
const admin = require("firebase-admin");
const ranks = require("./ranks.json");

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationToken: process.env.TWITCH_ACCESS_TOKEN,
});

const DisTwitchChatProfile = "https://media.discordapp.net/attachments/710157323456348210/710185505391902810/discotwitch_.png?width=100&height=100";

const getBadges = async (channelName, tags) => {
	// get custom badges from twitch api
    
	const badges = {};
	if (tags.badges) {
        const channelBadgeJSON = await Api.getBadgesByUsername(channelName);
        const globalBadges = await Api.getGlobalBadges();

        // TODO: improve by doing channel badges first

        // get all global badges
		for (let [key, value] of Object.entries(tags.badges)) {
			if (key === "subscriber") value = 0; // global subscriber badges only have two keys 0 and 1. 0 is for any subscriber above 1 month

			let badgeInfo = globalBadges[key].versions[value];
			if (badgeInfo) {
				const badgeImage = badgeInfo[`image_url_1x`];
				const badgeTitle = badgeInfo["title"];
				badges[key] = { image: badgeImage, title: badgeTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("subscriber") && tags.badges.subscriber != undefined) {
			const customSubBadges = channelBadgeJSON.subscriber.versions;
			const subLevel = tags.badges.subscriber;
			if (customSubBadges.hasOwnProperty(subLevel)) {
				const subBadge = customSubBadges[subLevel][`image_url_1x`];
				const subTitle = customSubBadges[subLevel]["title"];
				badges["subscriber"] = { image: subBadge, title: subTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("bits") && tags.badges.bits != undefined) {
			const customCheerBadges = channelBadgeJSON.bits.versions;
			const cheerLevel = tags.badges.bits;
			if (customCheerBadges.hasOwnProperty(cheerLevel)) {
				const cheerBadge = customCheerBadges[cheerLevel][`image_url_1x`];
				const customCheerTitle = customCheerBadges[cheerLevel]["title"];
				badges["bits"] = { image: cheerBadge, title: customCheerTitle };
			}
		}
	}
	return badges;
};

module.exports = (TwitchClient, sockets, app) => {
	TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		// don't waste time with all the next stuff if there isn't a socket connection to that channel
		if (!sockets.hasOwnProperty(channelName)) return;

		// send a message to all connected sockets for this channel to delete that message
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("deletemessage", tags["target-msg-id"]));
	});

	TwitchClient.on("ban", ( channel, username, reason, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("purgeuser", username));
	});

	TwitchClient.on("timeout", ( channel, username, reason, duration, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("purgeuser", username));
	});

	//Bans and Timeouts can be treated the same on the app side, only need to purge the user.

	TwitchClient.on("raided", ( channel, username, viewers ) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;
		const raider = {
			who: username,
			viewers: viewers, 
		};
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("raid", raider));
	});

	TwitchClient.on("message", async (channel, tags, message, self) => {
        if(!["chat", "action"].includes(tags["message-type"])) return
		// Ignore echoed messages and commands.
		// TODO: allow users to add in custom command prefixes
		if (self || message.startsWith("!") || message.startsWith("?")) return;

		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		// don't waste time with all the next stuff if there isn't a socket connection to that channel
		if (!sockets.hasOwnProperty(channelName)) return;

		// get all possible versions of the message with all variations of the message filters
		// const plainMessage = await formatMessage(message, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, channelName });
		// const censoredMessage = await formatMessage(message, "twitch", tags, { censor: true });
		// const HTMLCensoredMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, censor: true });

		// get all badges for the user that sent the messages put them in an object
		const badges = await getBadges(channelName, tags);

        // TODO: improve
		// append a badge if there is a developer
		if (ranks.twitch.developers.includes(tags['user-id'])) {
			badges["developer"] = {
				image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
				title: "DisStreamchat Staff",
			};
		}

		// the messageId is currently only used for higlighted messages
		let messageId = tags["msg-id"] || "";

		// ping the twitch api for user data, currently only used for profile picture
		const userData = await Api.getUserInfo(tags.username);

		// this is all the data that gets sent to the frontend
		const messageObject = {
			displayName: tags["display-name"],
			avatar: userData.profile_image_url, // long term TODO: look into caching profile picture
			body: HTMLCleanMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: messageId,
			uuid: tags.id, // TODO: remove
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: tags.color,
			messageType: tags["message-type"],
		};

		if (messageObject.body.length <= 0) return;

		// send the message object to all sockets connected to this channel
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject));
	});

	TwitchClient.on("cheer", async (channel, tags, message, self) => {
        const channelName = channel.slice(1).toLowerCase();
        // TODO: improve Regex
        // TODO: improve by splitting by spaces
        const cheerMoteRegex = /([0-9]*[a-zA-Z]*)([0-9]*)/g

        if (!sockets.hasOwnProperty(channelName)) return;
        
		const badges = {}

        const cheerMotes = (await Api.fetch("https://api.twitch.tv/helix/bits/cheermotes")).data

        
        const cheerMatches = [...message.matchAll(cheerMoteRegex)]
        const cheerMoteMatches = cheerMatches.map(match => ({bits: +match[2], ...cheerMotes.find(cheer => cheer.prefix === match[1])}))
        
        const cheerMoteMatchTiers = cheerMoteMatches.map(cheerMote => {
            const tiers = cheerMote.tiers
            const bits = cheerMote.bits
            if(!tiers || !bits) return
            const cheeredTier = tiers.reduce((acc, tier) => tier["min_bits"] <= bits ? tier : acc)
            return {
                prefix: cheerMote.prefix,
                id: cheerMote.prefix+bits,
                tier: cheeredTier,
                image: cheeredTier.images.dark.animated["4"],
                bits
            }
        }).filter(c => !!c)
        
		let messageId = tags["msg-id"] || "";
		let bits = tags.bits;
        
		// const plainMessage = await formatMessage(message, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, channelName });
		// const censoredMessage = await formatMessage(message, "twitch", tags, { censor: true });
		// const HTMLCensoredMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, censor: true });
        
        HTMLCleanMessage = HTMLCleanMessage.replace(cheerMoteRegex, (match, prefix, number) => {
            const cheerMote = cheerMoteMatchTiers.find(cheer => cheer.id == match)
            if(!cheerMote) return match
            return `<img src="${cheerMote.image}" class="emote"> ${number}`
        })

        // TODO: make customizable
        const theMessage = `${tags["display-name"]} cheered ${bits} bit${bits > 1?"s":""}!\n${HTMLCleanMessage}` 

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: "cheer",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			bits, // << added this to the messageObject
		};

		const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject)); // << emitting 'twitchcheer' so you can handle this on the app since the messageObject is slightly different.
	});

	TwitchClient.on("anongiftpaidupgrade", async (channel, username, sender, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;

		const badges = {}

        const theMessage = `${username}, upgraded their subscription! (Originally from Anonymous)`

		// const plainMessage = await formatMessage(theMessage, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, {
			HTMLClean: true,
		});
		// const censoredMessage = await formatMessage(theMessage, "twitch", tags, {
		// 	censor: true,
		// });
		// const HTMLCensoredMessage = await formatMessage(theMessage, "twitch", tags, {
		// 	HTMLClean: true,
		// 	censor: true,
		// });

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchanonupgrade", messageObject)); // << emitting 'twitchanonupgrade' so you can handle this on the app since the messageObject is slightly different.
	});

	TwitchClient.on("giftpaidupgrade", async (channel, username, sender, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;

		const badges = {}

        const theMessage = `${username}, upgraded their subscription! (Originally from ${sender}).`

		// const plainMessage = await formatMessage(theMessage, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, {
			HTMLClean: true,
		});
		// const censoredMessage = await formatMessage(theMessage, "twitch", tags, {
		// 	censor: true,
		// });
		// const HTMLCensoredMessage = await formatMessage(theMessage, "twitch", tags, {
		// 	HTMLClean: true,
		// 	censor: true,
		// });

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject)); // << emitting 'twitchsubupgrade' so you can handle this on the app since the messageObject is slightly different.
	});

	let giftTimeout = null;
	let lastGifter = "";
	let lastGiftAmount = 0;
	let allRecipients = ``;

	TwitchClient.on("subgift", async (channel, username, streakMonths, recipient, methods, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;

		const badges = {};

		if (username == lastGifter) {
			clearTimeout(giftTimeout);
			lastGiftAmount++;
			allRecipients += `, @${recipient}`;
		} else {
			lastGifter = username;
			lastGiftAmount = 1;
			allRecipients = `@${recipient}`;
		}
		giftTimeout = setTimeout(async () => {
			// const plainMessage = await formatMessage(`${username} has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`, "twitch", tags);
			let HTMLCleanMessage = `${username} has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`


			const messageObject = {
				displayName: "DisStreamChat",
				avatar: DisTwitchChatProfile,
				body: HTMLCleanMessage,
				// HTMLCleanMessage,
				// censoredMessage,
				// HTMLCensoredMessage,
				platform: "twitch",
				messageId: "subgift",
				uuid: tags.id,
				id: tags.id,
				badges,
				sentAt: +tags["tmi-sent-ts"],
				userColor: "#ff0029",
			};

			const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject)); // << emitting 'twitchsubgift' so you can handle this on the app since the messageObject is slightly different.

			lastGiftAmount = 0;
			allRecipients = ``; 
		}, 1500);
	});

	TwitchClient.on("resub", async (channel, username, months, message, tags, methods) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;

		const badges = {};

		let theMessage = "";

		let cumulativeMonths = ~~tags["msg-param-cumulative-months"];
		if ((tags["msg-param-should-share-streak"] = true)) {
			theMessage = `Thanks for re-subscribing for ${cumulativeMonths} months @${username}.`;
		} else {
			theMessage = `Thanks for re-subscribing @${username}.`;
		}

		// const plainMessage = await formatMessage(theMessage, "twitch", tags);
		// let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, { HTMLClean: true });
		// const censoredMessage = await formatMessage(theMessage, "twitch", tags, { censor: true });
		// const HTMLCensoredMessage = await formatMessage(theMessage, "twitch", tags, { HTMLClean: true, censor: true });

		const messageObject = {
			displayName: "DisStreamChat",
            avatar: DisTwitchChatProfile,
			body: theMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject)); // << emitting 'twitchresub' so you can handle this on the app since the messageObject is slightly different.
	});

	TwitchClient.on("subscription", async (channel, username, { prime, plan, planName }, msg, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		if (!sockets.hasOwnProperty(channelName)) return;

		let messageId = tags["msg-id"] || "";

		const badges = {};

		let theMessage = `Thanks for subscribing @${username}!`; // TODO: You could take into account of prime, plan, planname etc above if you wanted to differ the method.

		// const plainMessage = await formatMessage(theMessage, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, { HTMLClean: true });
		// const censoredMessage = await formatMessage(theMessage, "twitch", tags, { censor: true });
		// const HTMLCensoredMessage = await formatMessage(theMessage, "twitch", tags, { HTMLClean: true, censor: true });

		const messageObject = {
			displayName: "DisStreamChat",
            avatar: DisTwitchChatProfile,
			body: theMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		if (messageObject.body.length <= 0) return;
		const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject)); // << emitting 'twitchsub' so you can handle this on the app since the messageObject is slightly different.
    });
    
    // TODO: move to separate file
    app.post("/webhooks/twitch", async (req, res, next) => {
        if (req.twitch_hub && req.twitch_hex == req.twitch_signature) {
            // it's good
            const data = req.body.data;
            if (data) {
                const body = data[0];
                const streamer = body.to_name.toLowerCase();
                const follower = body.from_name;
                const followerId = body.from_id
                const followedAt = body.followed_at;

                console.log(`${follower} followed ${streamer}`)
                
                // long term TODO: add follower count/goal overlay
                if (!sockets.hasOwnProperty(streamer)) return res.status(200).json("no socket connection")
                
                const streamerDatabaseId = sha1(body.to_id)

                const db = admin.firestore()
                const streamerRef = await db.collection("Streamers").doc(streamerDatabaseId).get()
                const streamerData = streamerRef.data()
                const previouslyNotified = streamerData.previouslyNotified || []

                if(new Set(previouslyNotified).has(followerId)) return res.status(200).json("already notified");

                previouslyNotified.push(followerId)
                await db.collection("Streamers").doc(streamerDatabaseId).update({
                    previouslyNotified
                })
                
                const badges = {};

                // TODO add custom message handler in seperate file
                const theMessage = `Thanks for following ${follower}!`;
    
                const messageObject = {
                    displayName: "DisStreamChat",
                    avatar: DisTwitchChatProfile,
                    body: theMessage,
                    platform: "twitch",
                    messageId: "follow",
                    uuid: uuidv1(),
                    id: uuidv1(),
                    badges,
                    sentAt: new Date(followedAt).getTime(),
                    userColor: "#ff0029",
                };
    
                const _ = [...sockets[streamer]].forEach(async s => await s.emit("chatmessage", messageObject));
            }
            res.json("success");
        } else {
            res.status("401").json("Looks like You aren't twitch");
            // it's bad
        }
    });

	//Notes : only on cheer did I pass the "message", if you wanted to, you can do the same for resub and subscription.
	//Also, I didn't pass the badges on the messageObject except for the cheer events, also I gave each one their own socket.emit's so you can stylize them different.
};
