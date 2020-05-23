const fetch = require("node-fetch")

class TwitchApi {
    constructor({clientId, authorizationKey}){
        this.clientId = clientId
        this.authorizationKey = authorizationKey
    }

    async fetch(url, headers={}){
        const response = await fetch(url, {
            headers: {
                "Client-ID": this.clientId,
                "Authorization": `Bearer ${this.authorizationKey}`,
                ...headers
            }
        })
        return response.json()
    }

    async getUserInfo(username){
        if(this.clientId == undefined || this.authorizationKey == undefined){
            throw new Error("Missing either your clientId or Authorization Key")
        }
        const apiURL = `https://api.twitch.tv/helix/users?login=${username}`
        const response = await this.fetch(apiURL)
        return response.data[0]
    }

    async getBadgesByUsername(username){
        const userInfo = await this.getUserInfo(username)
        const userId = userInfo.id
        return this.getBadgesById(userId)
    }

    async getBadgesById(userId){
        const customBadgeURL = `https://badges.twitch.tv/v1/badges/channels/${userId}/display`
        const response = await this.fetch(customBadgeURL)
        return response.badge_sets
    }

    async getGlobalBadges() {
        const globalBadgeResponse = await this.fetch("https://badges.twitch.tv/v1/badges/global/display")
        return globalBadgeResponse.badge_sets
    }
}

module.exports = TwitchApi