const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()
require("./api")
const fs = require("fs")
const path = require("path")
const fetch = require("node-fetch")

const AntiSpam = require('discord-anti-spam');
const antiSpam = new AntiSpam({
    warnThreshold: 3, // Amount of messages sent in a row that will cause a warning.
    kickThreshold: 7, // Amount of messages sent in a row that will cause a ban.
    banThreshold: 15, // Amount of messages sent in a row that will cause a ban.
    maxInterval: 2000, // Amount of time (in milliseconds) in which messages are considered spam.
    warnMessage: '{@user}, Please stop spamming.', // Message that will be sent in chat upon warning a user.
    kickMessage: '**{user_tag}** has been kicked for spamming.', // Message that will be sent in chat upon kicking a user.
    banMessage: '**{user_tag}** has been banned for spamming.', // Message that will be sent in chat upon banning a user.
    maxDuplicatesWarning: 2, // Amount of duplicate messages that trigger a warning.
    maxDuplicatesKick: 10, // Amount of duplicate messages that trigger a kick.
    maxDuplicatesBan: 12, // Amount of duplicate messages that trigger a ban.
    exemptPermissions: ['ADMINISTRATOR', "MANAGE SERVER"], // Bypass users with any of these permissions.
    ignoreBots: true, // Ignore bot messages.
    verbose: true, // Extended Logs from module.
    ignoredUsers: [], // Array of User IDs that get ignored.
});

const sockets = {}


const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })


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

// use client.join(channel)

// TODO add uptime command to twitch side of bot

Twitchclient.on('message', async (channel, tags, message, self) => {
    // Ignore echoed messages.
    if (self) return;
    
    const apiURL = "https://api.twitch.tv/helix/users?login"

    const response = await fetch(apiURL + "=" + tags.username, {
        headers: {
            "Client-ID": process.env.TWITCH_API_TOKEN
        }
    })

    
    const data = (await response.json()).data[0]
    if(tags.emotes){
        const names = []

        for( const [id, locations] of Object.entries(tags.emotes)){

            const first = locations.map(l => l.split("-"))[0].map(v => +v)

            const name = message.split("").splice(first[0], first[1]+1).join("")
                        
            names.push([name, id])

        }
        for(const [name, id] of names){

            message = message.replace(new RegExp(name, "g"), `![](https://static-cdn.jtvnw.net/emoticons/v1/${id}/2.0)`)
        }
        console.log(message);
        

        


        // later on in twitch code on recieve message:
        
        
    }
    message = message.replace(bttvRegex, (name) => `![${name}](https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote)`);
    message = message.replace(ffzRegex, (name) => `![](${ffzEmotes[name]}#emote)`);

    const msgObject = {
        displayName: tags.username,
        avatar: data.profile_image_url,
        body: message,
        platform: "twitch"
    }
    c = channel.slice(1)
    if (sockets.hasOwnProperty(c)) {
        [...sockets[c]].forEach(async s => await s.emit("chatmessage", msgObject))
    }
});

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: "Live Chat" } })
})

DiscordClient.login(process.env.BOT_TOKEN) 

const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm
const customEmojiRegex = /<(:[\w]+:)([\d]+)>/gm
const channelMentionRegex = /<#(\d+)>/gm
const mentionRegex = /<@([\W\S])([\d]+)>/gm

const replaceMentions = async msg => {
    const guild = msg.guild
    const {members, roles} = guild
    const mentions = [...msg.content.matchAll(mentionRegex)].map(match => ({prefix: match[1], id: match[2]}))
    for (const {prefix, id} of mentions){
        if(prefix === "!"){
            const username = (await members.fetch(id)).user.username
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@"+username)
        }else if(prefix === "&"){
            const name = (await roles.fetch(id)).name
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@"+name)
        }
    }
    return msg
}

const replaceChannelMentions = async msg => {
    const guild = msg.guild
    const { channels } = guild
    const mentions = [...msg.content.matchAll(channelMentionRegex)].map(match => match[1])
    for (const id of mentions){
        const name = (await channels.resolve(id)).name
        msg.content = msg.content.replace(new RegExp(`<#${id}>`, "g"), "#" + name)
    }
    return msg
}


DiscordClient.on("message", async msg => {
    if(msg.author.bot) return

    const senderName = msg.member.displayName
    try{
        // if(guildConfig === undefined){
        //     return await msg.channel.send("It apears your server has not yet been configured, if you have the `Manage server` permission you can configure it at `website` ")
        // }

        // msg = await replaceMentions(msg)
        // msg = await replaceChannelMentions(msg)

        const messageBody = msg.cleanContent.replace(customEmojiRegex, "$1")

        if (messageBody.length > 0){
            antiSpam.message(msg)

            const msgObject = {
                displayName: senderName,
                avatar: msg.author.displayAvatarURL(),
                body: messageBody,
                platform: "discord"
            }

            // await Twitchclient.say(guildConfig.twitch, `${messageBody}`);
            
            if(sockets.hasOwnProperty(msg.guild.id)){
                
                [...sockets[msg.guild.id]].forEach(async s => await s.emit("chatmessage", msgObject))
            }
        }
    }catch(err){
        console.log(err)
    }
})

const addSocket = (socket, id) => {
    if (sockets[id]) {
        sockets[id].add(socket);
    } else {
        sockets[id] = new Set([socket])
    }
}

io.on('connection', (socket) => {

    // TODO have socket receive message from frontend giving it the discord guildID, also convert sockets from a set to an object
    socket.on("addme", msg => {
        const {
            TwitchName,
            guildId
        } = msg
        socket.guildId = guildId
        socket.userInfo = msg
        addSocket(socket, guildId)
        addSocket(socket, TwitchName)
        
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

            
        }
    });
});


http.listen(3200, () => {
    console.log('listening on *:3200');
});