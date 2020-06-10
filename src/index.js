const express = require("express")
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
require("dotenv").config()
const cors = require('cors');
const bodyParser = require('body-parser')
const TwitchApi = require('twitch-lib')
const helemt = require("helmet")
const morgan = require("morgan")

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add the basic middleware to the express app
app.use(helemt())
// app.use(morgan("dev"))
app.use(cors())
app.use(bodyParser.json())

// add the routes stored in the 'routes' folder to the app
app.use("/", require("./routes/index"))

// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { checkForClash, formatMessage, replaceTwitchEmotes } = require("./utils/messageManipulation")

// get the initialized clients from another file
const {DiscordClient, TwitchClient} = require("./utils/initClients")

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
    clientId: process.env.TWITCH_CLIENT_ID,
    authorizationToken: process.env.TWITCH_ACCESS_TOKEN
})

// initialize the object that will store all sockets currently connected
const sockets = {}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
    // remove the "#" form the begginning of the channel name
    const channelName = channel.slice(1).toLowerCase()

    // don't waste time with all the next stuff if there isn't a socket connection to that channel
    if (!sockets.hasOwnProperty(channelName)) return

    // send a message to all connected sockets for this channel to delete that message
    const _ = [...sockets[channelName]].forEach(async s => await s.emit("deletemessage", tags["target-msg-id"]))
});

TwitchClient.on('message', async (channel, tags, message, self) => {
    // Ignore echoed messages and commands.
    // TODO: allow users to add in custom command prefixes
    if (self || message.startsWith("!") || message.startsWith("?")) return
        
    // remove the "#" form the begginning of the channel name
    const channelName = channel.slice(1).toLowerCase()

    // don't waste time with all the next stuff if there isn't a socket connection to that channel
    if (!sockets.hasOwnProperty(channelName)) return

    
    
    // get all possible versions of the message with all variations of the message filters
    const plainMessage = formatMessage(message, "twitch")
    let HTMLCleanMessage = formatMessage(message, "twitch", {HTMLClean: true})
    const censoredMessage = formatMessage(message, "twitch", {censor: true})
    const HTMLCensoredMessage = formatMessage(message, "twitch", {HTMLClean: true, censor: true})
    
    if (tags.emotes) {
        HTMLCleanMessage = replaceTwitchEmotes(HTMLCleanMessage, tags.emotes)
    }
    
    // get custom badges from twitch api
    const channelBadgeJSON = await Api.getBadgesByUsername(channelName) 
    
    // replace the emote text with the images from twitch
    // get all badges for the user that sent the messages put them in an object
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

    // the messageId is currently only used for higlighted messages
    let messageId = tags["msg-id"] || ""

    // check for a clash code of url and if there is try to send it to discord
    // TODO: make this an optional thing and false my default
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
        userColor: tags.color
    }

    if (messageObject.body.length <= 0) return
    
    // send the message object to all sockets connected to this channel
    const _ = [...sockets[channelName]].forEach(async s => await s.emit("chatmessage", messageObject))
})
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD MESSAGE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
DiscordClient.on("message", async message => {
    // if the message was sent by a bot it should be ignored
    if (message.author.bot) return
    if (!sockets.hasOwnProperty(message.guild.id)) return
    
    const { liveChatId } = [...sockets[message.guild.id]][0].userInfo
    

    // don't waste time with the rest of the stuff if there isn't a connection to this guild
    if(message.channel.id != liveChatId && !liveChatId.includes(message.channel.id)) return


    const senderName = message.member.displayName
    try{
        const CleanMessage = message.cleanContent
        const plainMessage = formatMessage(CleanMessage, "discord")
        const HTMLCleanMessage = formatMessage(CleanMessage, "discord", { HTMLClean: true })
        const censoredMessage = formatMessage(CleanMessage, "discord", { censor: true })
        const HTMLCensoredMessage = formatMessage(CleanMessage, "discord", { HTMLClean: true, censor: true })

        if (plainMessage.startsWith("!") || plainMessage.startsWith("?")) return
        
        const messageObject = {
            displayName: senderName,
            avatar: message.author.displayAvatarURL(),
            body: HTMLCleanMessage,
            HTMLCleanMessage,
            censoredMessage,
            HTMLCensoredMessage,
            platform: "discord",
            messageId: "",
            uuid: message.id,
            id: message.id,
            badges: {},
            sentAt: message.createdAt.getTime(),
            userColor: message.member.displayHexColor
        }

        if (messageObject.body.length <= 0) return

        const _ = [...sockets[message.guild.id]].forEach(async s => await s.emit("chatmessage", messageObject))
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
    
    console.log('a user connected')
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

    socket.on("updatedata", data => {
        socket.userInfo = data
    })

    socket.on("deletemsg - discord", async id => {
        const { guildId, liveChatId } = socket.userInfo

        const connectGuild = DiscordClient.guilds.resolve(guildId)
        const guildChannels = connectGuild.channels

        for(const id of liveChatId){
            try {
                const liveChatChannel = guildChannels.resolve(id)
                const messageManager = liveChatChannel.messages

                const messageToDelete = await messageManager.fetch(id)
            
                messageToDelete.delete()
            } catch (err) {
                console.log(err.message)
            }
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
        if(channelSockets instanceof Set && channelSockets.size <= 0) {
            // TwitchClient.part(TwitchName)
        }
    })
})

const port = process.env.PORT || 3200

server.listen(port, () => {
    console.log(`listening on port ${port}`)
})