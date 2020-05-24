const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()
const uuidv1 = require('uuidv1')

const fs = require("fs")
const path = require("path")
const fetch = require("node-fetch")

const { checkForClash, customEmojiRegex } = require("../utils/messageManipulation")
const sockets = {}

const {DiscordClient, TwitchClient} = require("../utils/initClients")
const TwitchApi = require("../utils/twitchLib.js")
const Api = new TwitchApi({
    clientId: process.env.TWITCH_CLIENT_ID,
    authorizationKey: process.env.TWITCH_ACCESS_TOKEN
})

// get emotes from bttv and ffz by pinging the api's and saving the regexs
const bttvEmotes = {}
let bttvRegex
const ffzEmotes = {}
let ffzRegex

async function getBttvEmotes() {
    const bttvResponse = await fetch('https://api.betterttv.net/2/emotes')
    let { emotes } = await bttvResponse.json()
    // replace with your channel url
    const bttvChannelResponse = await fetch('https://api.betterttv.net/2/channels/codinggarden')
    const { emotes: channelEmotes } = await bttvChannelResponse.json()
    emotes = emotes.concat(channelEmotes)
    let regexStr = ''
    emotes.forEach(({ code, id }, i) => {
        bttvEmotes[code] = id
        regexStr += code.replace(/\(/, '\\(').replace(/\)/, '\\)') + (i === emotes.length - 1 ? '' : '|')
    })
    bttvRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, 'g')
}

async function getFfzEmotes() {
    const ffzResponse = await fetch('https://api.frankerfacez.com/v1/set/global')
    // replace with your channel url
    const ffzChannelResponse = await fetch('https://api.frankerfacez.com/v1/room/codinggarden')
    const { sets } = await ffzResponse.json()
    const { room, sets: channelSets } = await ffzChannelResponse.json()
    let regexStr = ''
    const appendEmotes = ({ name, urls }, i, emotes) => {
        ffzEmotes[name] = `https:${Object.values(urls).pop()}`
        regexStr += name + (i === emotes.length - 1 ? '' : '|')
    }
    sets[3].emoticons.forEach(appendEmotes)
    if (channelSets) {
        channelSets[609613].emoticons.forEach(appendEmotes)
    }
    ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, 'g')
}

getBttvEmotes()
getFfzEmotes()


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
    // remove the "#" form the begginning of the channel name
    const channelName = channel.slice(1).toLowerCase()

    // don't waste time with all the next stuff if there isn't a socket connection to that channel
    if (!sockets.hasOwnProperty(channelName)) return


    const _ = [...sockets[channelName]].forEach(async s => await s.emit("deletemessage", tags["target-msg-id"]))
});

TwitchClient.on('message', async (channel, tags, message, self) => {
    // Ignore echoed messages and commands.
    if (self || message.startsWith("!") || message.startsWith("?")) return
        
    // remove the "#" form the begginning of the channel name
    const channelName = channel.slice(1).toLowerCase()

    // don't waste time with all the next stuff if there isn't a socket connection to that channel
    if (!sockets.hasOwnProperty(channelName)) return

    // replace the emote text with the images from twitch
    if(tags.emotes){
        let messageWithEmotes = '';
        const emoteIds = Object.keys(tags.emotes);
        const emoteStart = emoteIds.reduce((starts, id) => {
            tags.emotes[id].forEach((startEnd) => {
                const [start, end] = startEnd.split('-');
                starts[start] = {
                    emoteUrl: `<img src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0" class="emote">`,
                    end,
                };
            });
            return starts;
        }, {});
        const parts = Array.from(message);
        for (let i = 0; i < parts.length; i++) {
            const char = parts[i];
            const emoteInfo = emoteStart[i];
            if (emoteInfo) {
                messageWithEmotes += emoteInfo.emoteUrl;
                i = emoteInfo.end;
            } else {
                messageWithEmotes += char;
            }
        }
        message = messageWithEmotes
    }
    
    // use the regexs created at start up to replace the bttv emotes and ffz emotes with their proper img tags
    message = message.replace(bttvRegex, name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}">`)
    message = message.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote">`)
    
    const channelBadgeJSON = await Api.getBadgesByUsername(channelName) 
    const badges = {}
    if(tags.badges) {
        const globalBadges = await Api.getGlobalBadges()
        for (let [key, value] of Object.entries(tags.badges)) {
            if(key === "subscriber") value = Math.min(+value, 1) // global subscriber badges only have two keys 0 and 1. 1 is for any subscriber above 1 month

            let badgeInfo = globalBadges[key].versions[value]
            if(badgeInfo){
                const badgeImage = badgeInfo[`image_url_1x`]
                const badgeTitle = badgeInfo["title"]
                badges[key] = { "image": badgeImage, "title": badgeTitle}
            }
        }

        if (channelBadgeJSON.hasOwnProperty("subscriber") && tags.badges.subscriber != undefined){
            const customSubBadges = channelBadgeJSON.subscriber.versions
            const subLevel = tags.badges.subscriber
            if(customSubBadges.hasOwnProperty(subLevel)){
                const subBadge = customSubBadges[subLevel][`image_url_1x`]
                const subTitle = customSubBadges[subLevel]["title"]
                badges["subscriber"] = { "image": subBadge, "title": subTitle }
            }
        }

        if (channelBadgeJSON.hasOwnProperty("bits") && tags.badges.bits != undefined){
            const customCheerBadges = channelBadgeJSON.bits.versions
            const cheerLevel = tags.badges.bits
            if(customCheerBadges.hasOwnProperty(cheerLevel)){
                const cheerBadge = customCheerBadges[cheerLevel][`image_url_1x`]
                const customCheerTitle = customCheerBadges[cheerLevel]["title"]
                badges["bits"] = {"image": cheerBadge, "title": customCheerTitle}
            }
        }
    }

    let messageId = tags["msg-id"] || ""

    const clashUrl = checkForClash(message)
    if (clashUrl != undefined && sockets.hasOwnProperty(channelName)){
        const { guildId, liveChatId } = [...sockets[channelName]][0].userInfo
        
        const connectGuild = DiscordClient.guilds.resolve(guildId)
        const guildChannels = connectGuild.channels

        const liveChatChannel = guildChannels.resolve(liveChatId)
        liveChatChannel.send(clashUrl)
    }
    // ping the twitch api for user data, currently only used for profile picture
    const userData = await Api.getUserInfo(tags.username)
    // this is all the data that gets sent to the frontend
    const messageObject = {
        displayName: tags["display-name"],
        avatar: userData.profile_image_url,
        body: message,
        platform: "twitch",
        messageId: messageId,
        uuid: tags.id,
        id: tags.id,
        badges,
        sentAt: +tags["tmi-sent-ts"]
    }
    
    // send the message object to all overlays and applications connected to this channel
    const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject))
})
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD MESSAGE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
DiscordClient.on("message", async message => {
    // if the message was sent by a bot it should be ignored
    if (message.author.bot) return
    
    const senderName = message.member.displayName
    try{
        const messageBody = message.cleanContent.replace(customEmojiRegex, `<img class="emote" src="https://cdn.discordapp.com/emojis/$2.png?v=1">`)
        
        if (messageBody.length <= 0 || messageBody.startsWith("!") || messageBody.startsWith("?")) return
        
        const messageObject = {
            displayName: senderName,
            avatar: message.author.displayAvatarURL(),
            body: messageBody,
            platform: "discord",
            messageId: "",
            uuid: message.id,
            id: message.id,
            badges: {},
            sentAt: message.createdAt.getTime()
        }
        
        if(sockets.hasOwnProperty(message.guild.id)) [...sockets[message.guild.id]].forEach(async s => await s.emit("chatmessage", messageObject))
    }catch(err){
        console.log(err.message)
    }
})

DiscordClient.on("messageDelete", message => {
    try{
        if (sockets.hasOwnProperty(message.guild.id)) [...sockets[message.guild.id]].forEach(async s => await s.emit("deletemessage", message.id))
    }catch(err){
        console.log(err.message)
    }

})

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add a socket to a set at set id (key)
const addSocket = (socket, id) => {
    if(id != undefined){
        id = id.toLowerCase()
        if (sockets[id]) {
            sockets[id].add(socket)
        } else {
            sockets[id] = new Set([socket])
        }
    }
}

io.on('connection', (socket) => {
    // the addme event is sent from the frontend on load with the data from the database
    socket.on("addme", message => {
        const {
            TwitchName,
            guildId
        } = message
        socket.userInfo = message
        

        addSocket(socket, guildId)
        addSocket(socket, TwitchName)
        TwitchClient.join(TwitchName)
        // TODO use client.join(channel)
    })

    socket.on("deletemsg - discord", async id => {
        const { guildId, liveChatId } = socket.userInfo

        const connectGuild = DiscordClient.guilds.resolve(guildId)
        const guildChannels = connectGuild.channels

        const liveChatChannel = guildChannels.resolve(liveChatId)
        const messageManager = liveChatChannel.messages

        const messageToDelete = await messageManager.fetch(id)
        try {
            messageToDelete.delete()
        } catch (err) {
            console.log(err.message)
        }
    })

    socket.on("deletemsg - twitch", async id => {
        const { TwitchName } = socket.userInfo
        try {
            TwitchClient.deletemessage(TwitchName, id);
        } catch (err) {
            console.log(err.message)
        }
    })
    

    console.log('a user connected')
    socket.on("disconnect", () => {
        console.log('a user disconnected')

        // it is possible that the socket doesn't have userinfo if it connected to an invalid user
        if(socket.userInfo == undefined) return

        // remove the socket from the object
        const {
            TwitchName,
            guildId
        } = socket.userInfo

        guildSockets = sockets[guildId]
        channelSockets = sockets[TwitchName]
        
        if (guildSockets instanceof Set) guildSockets.delete(socket)
        if (channelSockets instanceof Set) channelSockets.delete(socket)
        TwitchClient.part(TwitchName)
    })
})

http.listen(3200, () => {
    console.log('listening on *:3200')
})