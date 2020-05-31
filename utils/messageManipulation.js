const urlRegex = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.\S*)?/gm
const customEmojiRegex = /<(:[\w]+:)([\d]+)>/gm
const channelMentionRegex = /<#(\d+)>/gm
const mentionRegex = /<@([\W\S])([\d]+)>/gm
const HTMLStripRegex = /<[^:>]*>/gm

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
    if (HTMLClean) message = message.replace(HTMLStripRegex, "")
    if (censor) message = Filter.clean(message)
    if (platform === "twitch") {
        message = message.replace(bttvRegex, name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}">`)
        message = message.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote">`)
    } else if (platform === "discord") {
        message = message.replace(customEmojiRegex, `<img class="emote" src="https://cdn.discordapp.com/emojis/$2.png?v=1">`)
    }
    return message
}

module.exports = {
    replaceMentions,
    replaceChannelMentions,
    checkForClash,
    formatMessage,
    urlRegex,
    customEmojiRegex,
    channelMentionRegex,
    mentionRegex,
    HTMLStripRegex
}