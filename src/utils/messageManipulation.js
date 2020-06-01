const fetch = require("node-fetch")
const badWords = require("bad-words")

const createDOMPurify = require('dompurify');

const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;

const DOMPurify = createDOMPurify(window);

// initialize the filter that will remove bad words, in the future, users should be able to customize this filter for their channel
const Filter = new badWords({
    placeHolder: "⭐"
})

const urlRegex = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.\S*)?/gm
const customEmojiRegex = /<(:[\w]+:)([\d]+)>/gm
const channelMentionRegex = /<#(\d+)>/gm
const mentionRegex = /<@([\W\S])([\d]+)>/gm
const HTMLStripRegex = /<[^:>]*>/gm


// get emotes from bttv and ffz by pinging the api's and saving the regexs
// TODO: allow for channel specific custom emotes
// currently the bttvEmotes and ffzEmotes variables are global, in the future they will be local to the message handler
// this will allow for channel specific emotes from these custom emote providers
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



// unused, currently
const replaceMentions = async msg => {
    const guild = msg.guild
    const { members, roles } = guild
    const mentions = [...msg.content.matchAll(mentionRegex)].map(match => ({ prefix: match[1], id: match[2] }))
    for (const { prefix, id } of mentions) {
        if (prefix === "!") {
            const username = (await members.fetch(id)).user.username
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@" + username)
        } else if (prefix === "&") {
            const name = (await roles.fetch(id)).name
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@" + name)
        }
    }
    return msg
}


// unused, currently
const replaceChannelMentions = async msg => {
    const guild = msg.guild
    const { channels } = guild
    const mentions = [...msg.content.matchAll(channelMentionRegex)].map(match => match[1])
    for (const id of mentions) {
        const name = (await channels.resolve(id)).name
        msg.content = msg.content.replace(new RegExp(`<#${id}>`, "g"), "#" + name)
    }
    return msg
}

const checkForClash = message => {
    const urlCheck = [...message.matchAll(urlRegex)][0]
    const hasUrl = urlCheck != undefined
    if (!hasUrl) return
    const fullUrl = urlCheck[0]
    const codingGameMatch = [...fullUrl.matchAll(/codingame.com\/clashofcode\/clash/g)][0]
    if (codingGameMatch == undefined) return
    return fullUrl
}

const formatMessage = (message, platform, { HTMLClean, censor } = {}) => {
    let dirty = message.slice()
    if (HTMLClean) dirty = DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    }).replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    if (censor) dirty = Filter.clean(dirty)
    if (platform === "twitch") {
        dirty = dirty.replace(bttvRegex, name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}">`)
        dirty = dirty.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote">`)
    } else if (platform === "discord") {
        dirty = dirty.replace(customEmojiRegex, `<img class="emote" src="https://cdn.discordapp.com/emojis/$2.png?v=1">`)
    }
    return dirty
}

const replaceTwitchEmotes = (message, emotes) => {
    let messageWithEmotes = '';
    const emoteIds = Object.keys(emotes);
    const emoteStart = emoteIds.reduce((starts, id) => {
        emotes[id].forEach((startEnd) => {
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
    return messageWithEmotes
}

module.exports = {
    replaceMentions,
    replaceChannelMentions,
    checkForClash,
    formatMessage,
    replaceTwitchEmotes,
    urlRegex,
    customEmojiRegex,
    channelMentionRegex,
    mentionRegex,
    HTMLStripRegex
}