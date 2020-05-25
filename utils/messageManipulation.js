const urlRegex = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.\S*)?/gm
const customEmojiRegex = /<(:[\w]+:)([\d]+)>/gm
const channelMentionRegex = /<#(\d+)>/gm
const mentionRegex = /<@([\W\S])([\d]+)>/gm
const HTMLStripRegex = /<[^:>]*>/gm


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

const checkForClash = (message) => {
    const urlCheck = [...message.matchAll(urlRegex)][0]
    const hasUrl = urlCheck != undefined
    if (!hasUrl) return
    const fullUrl = urlCheck[0]
    const codingGameMatch = [...fullUrl.matchAll(/codingame.com\/clashofcode\/clash/g)][0]
    if (codingGameMatch == undefined) return
    return fullUrl
}

module.exports = {
    replaceMentions,
    replaceChannelMentions,
    checkForClash,
    urlRegex,
    customEmojiRegex,
    channelMentionRegex,
    mentionRegex,
    HTMLStripRegex
}