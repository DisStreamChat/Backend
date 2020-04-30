const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()

const fs = require("fs")
const path = require("path")
const fetch = require("node-fetch")

const { replaceMentions, replaceChannelMentions, customEmojiRegex} = require("../utils/messageManipulation")

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
});
Twitchclient.connect()

// get emotes from bttv and ffz by pinging the api's and saving the regexs
const bttvEmotes = {};
let bttvRegex;
const ffzEmotes = {};
let ffzRegex;

async function getBttvEmotes() {
    const bttvResponse = await fetch('https://api.betterttv.net/2/emotes');
    let { emotes } = await bttvResponse.json();
    // replace with your channel url
    const bttvChannelResponse = await fetch('https://api.betterttv.net/2/channels/codinggarden');
    const { emotes: channelEmotes } = await bttvChannelResponse.json();
    emotes = emotes.concat(channelEmotes);
    let regexStr = '';
    emotes.forEach(({ code, id }, i) => {
        bttvEmotes[code] = id;
        regexStr += code.replace(/\(/, '\\(').replace(/\)/, '\\)') + (i === emotes.length - 1 ? '' : '|');
    });
    bttvRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, 'g');
    console.log(bttvEmotes);
    console.log(bttvRegex);
}

async function getFfzEmotes() {
    const ffzResponse = await fetch('https://api.frankerfacez.com/v1/set/global');
    // replace with your channel url
    const ffzChannelResponse = await fetch('https://api.frankerfacez.com/v1/room/codinggarden');
    const { sets } = await ffzResponse.json();
    const { sets: channelSets } = await ffzChannelResponse.json();
    let regexStr = '';
    const appendEmotes = ({ name, urls }, i, emotes) => {
        ffzEmotes[name] = `https:${Object.values(urls).pop()}`;
        regexStr += name + (i === emotes.length - 1 ? '' : '|');
    };
    sets[3].emoticons.forEach(appendEmotes);
    channelSets[609613].emoticons.forEach(appendEmotes);
    ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, 'g');
    console.log(ffzEmotes);
    console.log(ffzRegex);
}

getBttvEmotes();
getFfzEmotes();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Twitchclient.on('message', async (channel, tags, message, self) => {
    // Ignore echoed messages.
    if (self) return;
    
    // ping the twitch api for user data, currently only used for profile picture
    const apiURL = "https://api.twitch.tv/helix/users?login"
    const response = await fetch(apiURL + "=" + tags.username, {
        headers: {
            "Client-ID": process.env.TWITCH_API_TOKEN
        }
    })
    const data = (await response.json()).data[0]
    
    // replace the regular emotes with the images from twitch
    if(tags.emotes){
    const [lastIndex, result] = Object.entries(tags.emotes).reduce(
        ([lastIndex, result], [id, indices]) => {
            indices.map(index => {
                const [start, end] = index.split('-').map(Number);
                result += `${message.slice(lastIndex, start)}<img src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0" class="emote">`;
                lastIndex = end + 1;
            });
            
            return [lastIndex, result];
        },
        [0, ''],
        );
        message = result + message.slice(lastIndex)
    }
    
    // use the regexs created at start up to replace the bttv emotes and ffz emotes with their proper img tags
    message = message.replace(bttvRegex, (name) => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}">`);
    message = message.replace(ffzRegex, (name) => `<img src="${ffzEmotes[name]}#emote" class="emote">`);
    
    
    // this is all the data that gets sent to the frontend
    const msgObject = {
        displayName: tags.username,
        avatar: data.profile_image_url,
        body: message,
        platform: "twitch"
    }
    
    // remove the "#" form the begginning of the channel name
    c = channel.slice(1)
    
    // send the message object to all overlays and applications connected to this channel
    if (sockets.hasOwnProperty(c)) {
        [...sockets[c]].forEach(async s => await s.emit("chatmessage", msgObject))
    }
});
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD MESSAGE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
DiscordClient.on("message", async msg => {
    if(msg.author.bot) return
    
    const senderName = msg.member.displayName
    try{
        const messageBody = msg.cleanContent.replace(customEmojiRegex, `<img class="emote" src="https://cdn.discordapp.com/emojis/$2.png?v=1">`)
        
        if (messageBody.length > 0){
            const msgObject = {
                displayName: senderName,
                avatar: msg.author.displayAvatarURL(),
                body: messageBody,
                platform: "discord"
            }
            
            if(sockets.hasOwnProperty(msg.guild.id)){
                [...sockets[msg.guild.id]].forEach(async s => await s.emit("chatmessage", msgObject))
            }
        }
    }catch(err){
        console.log(err)
    }
})

// add a socket to a set at set id (key)
const addSocket = (socket, id) => {
    if (sockets[id]) {
        sockets[id].add(socket);
    } else {
        sockets[id] = new Set([socket])
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

io.on('connection', (socket) => {
    socket.on("addme", msg => {
        const {
            TwitchName,
            guildId
        } = msg
        socket.userInfo = msg
        addSocket(socket, guildId)
        addSocket(socket, TwitchName)
        // TODO use client.join(channel)
    })
    console.log('a user connected');
    socket.on("disconnect", () => {
        console.log('a user disconnected');
        try {
            const {
                TwitchName,
                guildId
            } = socket.userInfo
            
            sockets[guildId].remove(socket)
            sockets[TwitchName].remove(socket)
        }catch(e){
            // its possible that the socket doesn't have a guild id, 
        }
    });
});

http.listen(3200, () => {
    console.log('listening on *:3200');
});