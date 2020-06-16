const TwitchApi = require("twitch-lib");

// console.log(process.env)

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationToken: process.env.TWITCH_ACCESS_TOKEN,
});

console.log(Api)


// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { checkForClash, formatMessage, replaceTwitchEmotes } = require("./utils/messageManipulation");


const getBadges = async (channelName, tags) => {
	// get custom badges from twitch api
	const channelBadgeJSON = await Api.getBadgesByUsername(channelName);

	const badges = {};
	if (tags.badges) {
		const globalBadges = await Api.getGlobalBadges();
		for (let [key, value] of Object.entries(tags.badges)) {
			if (key === "subscriber") value = Math.min(+value, 1); // global subscriber badges only have two keys 0 and 1. 1 is for any subscriber above 1 month

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

module.exports = (TwitchClient, sockets) => {
    TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
        // remove the "#" form the begginning of the channel name
        const channelName = channel.slice(1).toLowerCase();
    
        // don't waste time with all the next stuff if there isn't a socket connection to that channel
        if (!sockets.hasOwnProperty(channelName)) return;
    
        // send a message to all connected sockets for this channel to delete that message
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("deletemessage", tags["target-msg-id"]));
    });
    
    TwitchClient.on("message", async (channel, tags, message, self) => {
        // Ignore echoed messages and commands.
        // TODO: allow users to add in custom command prefixes
        if (self || message.startsWith("!") || message.startsWith("?")) return;
    
        // remove the "#" form the begginning of the channel name
        const channelName = channel.slice(1).toLowerCase();
    
        // don't waste time with all the next stuff if there isn't a socket connection to that channel
        if (!sockets.hasOwnProperty(channelName)) return;
    
        // get all possible versions of the message with all variations of the message filters
        const plainMessage = formatMessage(message, "twitch", tags);
        let HTMLCleanMessage = formatMessage(message, "twitch", tags, { HTMLClean: true });
        const censoredMessage = formatMessage(message, "twitch", tags, { censor: true });
        const HTMLCensoredMessage = formatMessage(message, "twitch", tags, { HTMLClean: true, censor: true });
    
        // get all badges for the user that sent the messages put them in an object
        const badges = await getBadges(tags);
    
        // the messageId is currently only used for higlighted messages
        let messageId = tags["msg-id"] || "";
    
        // check for a clash code of url and if there is try to send it to discord
        // TODO: make this an optional thing and false my default
        // const clashUrl = checkForClash(message);
        // if (clashUrl != undefined && sockets.hasOwnProperty(channelName)) {
        // 	const { guildId, liveChatId } = [...sockets[channelName]][0].userInfo;
    
        // 	const connectGuild = DiscordClient.guilds.resolve(guildId);
        // 	const guildChannels = connectGuild.channels;
    
        // 	const liveChatChannel = guildChannels.resolve(liveChatId);
        // 	liveChatChannel.send(clashUrl);
        // }
    
        // ping the twitch api for user data, currently only used for profile picture
        const userData = await Api.getUserInfo(tags.username);
    
        // this is all the data that gets sent to the frontend
        const messageObject = {
            displayName: tags["display-name"],
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id, // TODO: remove
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
        };
    
        if (messageObject.body.length <= 0) return;
    
        // send the message object to all sockets connected to this channel
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject));
    });
    
    TwitchClient.on("cheer", async (channel, tags, message, self) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
    
        const badges = await getBadges(tags);
    
        let messageId = tags["msg-id"] || "";
        let bits = tags.bits;
    
        const userData = await Api.getUserInfo(tags.username);
    
        const plainMessage = formatMessage(message, "twitch", tags);
        let HTMLCleanMessage = formatMessage(message, "twitch", tags, { HTMLClean: true });
        const censoredMessage = formatMessage(message, "twitch", tags, { censor: true });
        const HTMLCensoredMessage = formatMessage(message, "twitch", tags, { HTMLClean: true, censor: true });
    
        const messageObject = {
            displayName: tags["display-name"],
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id,
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
            bits: bits, // << added this to the messageObject
        };
    
        if (messageObject.body.length <= 0) return;
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchcheer", messageObject)); // << emitting 'twitchcheer' so you can handle this on the app since the messageObject is slightly different.
    });
    
    TwitchClient.on("anongiftpaidupgrade", async (channel, username, sender, tags) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
    
        let messageId = tags["msg-id"] || "";
    
        const badges = await getBadges(tags);
    
        const userData = await Api.getUserInfo(username);
        
    
        const plainMessage = formatMessage(`${username}, upgraded their subscription! (Originally from an anonymous user.)`, "twitch", tags);
        let HTMLCleanMessage = formatMessage(`${username}, upgraded their subscription! (Originally from an anonymous user.)`, "twitch", tags, {
            HTMLClean: true,
        });
        const censoredMessage = formatMessage(`${username}, upgraded their subscription! (Originally from an anonymous user.)`, "twitch", tags, {
            censor: true,
        });
        const HTMLCensoredMessage = formatMessage(`${username}, upgraded their subscription! (Originally from an anonymous user.)`, "twitch", tags, {
            HTMLClean: true,
            censor: true,
        });
    
        const messageObject = {
            displayName: username,
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id,
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
        };
    
        if (messageObject.body.length <= 0) return;
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchanonupgrade", messageObject)); // << emitting 'twitchanonupgrade' so you can handle this on the app since the messageObject is slightly different.
    });
    
    TwitchClient.on("giftpaidupgrade", async (channel, username, sender, tags) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
    
        let messageId = tags["msg-id"] || "";
    
        const badges = await getBadges(tags);
    
        const userData = await Api.getUserInfo(username);
    
        const plainMessage = formatMessage(`${username}, upgraded their subscription! (Originally from ${sender}.)`, "twitch", tags);
        let HTMLCleanMessage = formatMessage(`${username}, upgraded their subscription! (Originally from ${sender}.)`, "twitch", tags, {
            HTMLClean: true,
        });
        const censoredMessage = formatMessage(`${username}, upgraded their subscription! (Originally from ${sender}.)`, "twitch", tags, { censor: true });
        const HTMLCensoredMessage = formatMessage(`${username}, upgraded their subscription! (Originally from ${sender}.)`, "twitch", tags, {
            HTMLClean: true,
            censor: true,
        });
    
        const messageObject = {
            displayName: username,
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id,
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
        };
    
        if (messageObject.body.length <= 0) return;
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchsubupgrade", messageObject)); // << emitting 'twitchsubupgrade' so you can handle this on the app since the messageObject is slightly different.
    });
    
    let giftTimeout = null;
    let lastGifter = "";
    let lastGiftAmount = 0;
    let allRecipients = ``;
    
    TwitchClient.on("subgift", async (channel, username, streakMonths, recipient, methods, tags) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
        let messageId = tags["msg-id"] || "";
        
        const badges = await getBadges(tags);
    
        const userData = await Api.getUserInfo(username);
    
        if (username == lastGifter) {
            clearTimeout(giftTimeout);
            lastGiftAmount++;
            allRecipients += `- @${recipient}`;
        } else {
            lastGifter = username;
            lastGiftAmount = 1;
            allRecipients = `@${recipient}`;
        }
        giftTimeout = setTimeout(() => {
            const plainMessage = formatMessage(`${username}, has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`, "twitch", tags);
            let HTMLCleanMessage = formatMessage(`${username}, has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`, "twitch", tags, {
                HTMLClean: true,
            });
            const censoredMessage = formatMessage(`${username}, has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`, "twitch", tags, {
                censor: true,
            });
            const HTMLCensoredMessage = formatMessage(`${username}, has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`, "twitch", tags, {
                HTMLClean: true,
                censor: true,
            });
    
            const messageObject = {
                displayName: username,
                avatar: userData.profile_image_url,
                body: HTMLCleanMessage,
                HTMLCleanMessage,
                censoredMessage,
                HTMLCensoredMessage,
                platform: "twitch",
                messageId: messageId,
                uuid: tags.id,
                id: tags.id,
                badges,
                sentAt: +tags["tmi-sent-ts"],
                userColor: tags.color,
            };
    
            if (messageObject.body.length <= 0) return;
            const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchsubgift", messageObject)); // << emitting 'twitchsubgift' so you can handle this on the app since the messageObject is slightly different.
    
            lastGiftAmount = 0;
            allRecipients = ``;
        }, 1500);
    });
    
    TwitchClient.on("resub", async (channel, username, months, message, tags, methods) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
    
        let messageId = tags["msg-id"] || "";
    
        const badges = await getBadges(tags);
    
        const userData = await Api.getUserInfo(username);
    
        let theMessage = "";
    
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
        if ((userstate["msg-param-should-share-streak"] = true)) {
            theMessage = `Thanks for re-subscribing for ${cumulativeMonths} months @${username}.`;
        } else {
            theMessage = `Thanks for re-subscribing @${username}.`;
        }
    
        const plainMessage = formatMessage(theMessage, "twitch", tags);
        let HTMLCleanMessage = formatMessage(theMessage, "twitch", tags, { HTMLClean: true });
        const censoredMessage = formatMessage(theMessage, "twitch", tags, { censor: true });
        const HTMLCensoredMessage = formatMessage(theMessage, "twitch", tags, { HTMLClean: true, censor: true });
    
        const messageObject = {
            displayName: username,
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id,
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
        };
    
        if (messageObject.body.length <= 0) return;
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchresub", messageObject)); // << emitting 'twitchresub' so you can handle this on the app since the messageObject is slightly different.
    });
    
    TwitchClient.on("subscription", async (channel, username, { prime, plan, planName }, msg, tags) => {
        const channelName = channel.slice(1).toLowerCase();
        if (!sockets.hasOwnProperty(channelName)) return;
    
        let messageId = tags["msg-id"] || "";
    
        const badges = await getBadges(tags);
    
        const userData = await Api.getUserInfo(username);
    
        let theMessage = `Thanks for subscribing @${username}!`; // You could take into account of prime, plan, planname etc above if you wanted to differ the method.
    
        const plainMessage = formatMessage(theMessage, "twitch", tags);
        let HTMLCleanMessage = formatMessage(theMessage, "twitch", tags, { HTMLClean: true });
        const censoredMessage = formatMessage(theMessage, "twitch", tags, { censor: true });
        const HTMLCensoredMessage = formatMessage(theMessage, "twitch", tags, { HTMLClean: true, censor: true });
    
        const messageObject = {
            displayName: username,
            avatar: userData.profile_image_url,
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "twitch",
            messageId: messageId,
            uuid: tags.id,
            id: tags.id,
            badges,
            sentAt: +tags["tmi-sent-ts"],
            userColor: tags.color,
        };
    
        if (messageObject.body.length <= 0) return;
        const _ = [...sockets[channelName]].forEach(async s => await s.emit("twitchsub", messageObject)); // << emitting 'twitchsub' so you can handle this on the app since the messageObject is slightly different.
    });
    
    //Notes : only on cheer did I pass the "message", if you wanted to, you can do the same for resub and subscription.
    //Also, I didn't pass the badges on the messageObject except for the cheer events, also I gave each one their own socket.emit's so you can stylize them different.
    
}