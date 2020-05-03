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

const { checkForClash, customEmojiRegex} = require("../utils/messageManipulation")

const sockets = {}

// initialize the discord client
const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
DiscordClient.login(process.env.BOT_TOKEN) 

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: "Live Chat" } })
})

// initialize the twitch client
const Twitchclient = new tmi.Client({
    options: { debug: true },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: 'distwitchchat', 
        password: process.env.TWITH_OAUTH_TOKEN
    },
    channels: ["dav1dsnyder404"]
})
Twitchclient.connect()

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
    // console.log(bttvEmotes)
    // console.log(bttvRegex)
}

async function getFfzEmotes() {
    const ffzResponse = await fetch('https://api.frankerfacez.com/v1/set/global')
    // replace with your channel url
    const ffzChannelResponse = await fetch('https://api.frankerfacez.com/v1/room/codinggarden')
    const { sets } = await ffzResponse.json()
    const { sets: channelSets } = await ffzChannelResponse.json()
    let regexStr = ''
    const appendEmotes = ({ name, urls }, i, emotes) => {
        ffzEmotes[name] = `https:${Object.values(urls).pop()}`
        regexStr += name + (i === emotes.length - 1 ? '' : '|')
    }
    sets[3].emoticons.forEach(appendEmotes)
    channelSets[609613].emoticons.forEach(appendEmotes)
    ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, 'g')
    // console.log(ffzEmotes)
    // console.log(ffzRegex)
}

getBttvEmotes()
getFfzEmotes()


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Twitchclient.on('message', async (channel, tags, message, self) => {
    // Ignore echoed messages.
    if (self || message.startsWith("!") || message.startsWith("?")) return
        
    // replace the regular emotes with the images from twitch
    if(tags.emotes){
        const [lastIndex, result] = Object.entries(tags.emotes).reduce(
            ([lastIndex, result], [id, indices]) => {
                indices.map(index => {
                    const [start, end] = index.split('-').map(Number)
                    result += `${message.slice(lastIndex, start)}<img src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0" class="emote">`
                    lastIndex = end + 1
                })

                return [lastIndex, result]
            },
            [0, ''],
        )
        message = result + message.slice(lastIndex)
    }
    
    // use the regexs created at start up to replace the bttv emotes and ffz emotes with their proper img tags
    message = message.replace(bttvRegex, name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}">`)
    message = message.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote">`)
    
    // ping the twitch api for user data, currently only used for profile picture
    const apiURL = "https://api.twitch.tv/helix/users?login"
    const response = await fetch(`${apiURL}=${tags.username}`, {
        headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID,
            "Authorization": `Bearer ${process.env.TWITCH_API_TOKEN}`
        }
    })
    const json = await response.json()
    const data = json.data[0]
   

    let messageId = tags["msg-id"]
    if(messageId == undefined){
        messageId = ""
    }

    

    // remove the "#" form the begginning of the channel name
    const channelName = channel.slice(1)
    
    const clashUrl = checkForClash(message)
    
    if (clashUrl != undefined && sockets.hasOwnProperty(channelName)){
        const { guildId, liveChatId } = [...sockets[channelName]][0].userInfo
        // console.log("689872791331405900")
        
        const connectGuild = DiscordClient.guilds.resolve(guildId)
        const guildChannels = connectGuild.channels

        const liveChatChannel = guildChannels.resolve(liveChatId)

        liveChatChannel.send(clashUrl)
        


    }

    // this is all the data that gets sent to the frontend
    const messageObject = {
        displayName: tags["display-name"],
        avatar: data.profile_image_url,
        body: message,
        platform: "twitch",
        messageId: messageId,
        uuid: uuidv1()
    }
    
    
    // send the message object to all overlays and applications connected to this channel
    if (sockets.hasOwnProperty(channelName)) [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject))
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
            uuid: uuidv1()
        }
        
        if(sockets.hasOwnProperty(message.guild.id)) [...sockets[message.guild.id]].forEach(async s => await s.emit("chatmessage", messageObject))
    }catch(err){
        console.log(err)
    }
})


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add a socket to a set at set id (key)
const addSocket = (socket, id) => {
    if (sockets[id]) {
        sockets[id].add(socket)
    } else {
        sockets[id] = new Set([socket])
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
        // TODO use client.join(channel)
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

    })
})

http.listen(3200, () => {
    console.log('listening on *:3200')
})