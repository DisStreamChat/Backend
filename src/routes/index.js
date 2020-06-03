const express = require("express")
const router = express.Router()
const sha1 = require('sha1');
const fetch = require("node-fetch")
const TwitchApi = require('twitch-lib')
const admin = require('firebase-admin');
const DiscordOauth2 = require("discord-oauth2");
const { getUserInfo} = require("../utils/DiscordClasses")

// get the serviceAccount details from the base64 string stored in environment variables
const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"))

// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})


// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
    clientId: process.env.TWITCH_CLIENT_ID,
    authorizationToken: process.env.TWITCH_ACCESS_TOKEN
})
const oauth = new DiscordOauth2();

router.use("/oauth/twitch", express.static("public"))

router.get('/', (req, res) => {
    res.json({
        message: '📺 DisTwitchChat API 📺',
    });
});

router.get("/makecoffee", (req, res) => {
    res.status(418).json({
        status: 418,
        message: "I'm a Teapot ☕"
    })
})

router.get("/invite", (req, res) => {
    res.redirect("https://discord.com/api/oauth2/authorize?client_id=702929032601403482&permissions=8&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin&scope=bot")
})

router.get("/discord", (req, res, next) => {
    res.redirect("https://discord.gg/sFpMKVX")
})

router.get("/app", (req, res) => {
    res.redirect("https://www.distwitchchat.com/distwitchchat.exe")
})

router.get("/discord/token/refresh", async (req, res, next) => {
    try{
        const token = req.query.token
        const tokenData = await oauth.tokenRequest({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            refreshToken: token,
            scope: "identify guilds",
            grantType: "refresh_token",

            redirectUri: process.env.REDIRECT_URI + "/login",
        })
        res.json(await getUserInfo(tokenData))
    }catch(err){
        next(err)
    }
    
})

router.get("/discord/token", async (req, res, next) => {
    try{
        const code = req.query.code
        if(!code){
            return res.status(400).json({
                status: 400,
                message: "Missing Auth Token"
            })
        }
        const tokenData = await oauth.tokenRequest({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,

            code: code,
            scope: "identify guilds",
            grantType: "authorization_code",

            redirectUri: process.env.REDIRECT_URI+"/login",
        })
        
        res.json(await getUserInfo(tokenData))
    }catch(err){
        next(err)
    }
})


router.get("/token", async (req, res, next) => {
    try {
        const code = req.query.code
        const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_APP_CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${process.env.REDIRECT_URI}`
        const response = await fetch(apiURL, {
            method: "POST"
        })
        const json = await response.json()
        const validationResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
            headers: {
                Authorization: `OAuth ${json.access_token}`
            }
        })
        const validationJson = await validationResponse.json()
        if (!validationResponse.ok) {
            res.status(validationJson.status)
            err = new Error(validationJson.message)
            next(err)
        } else {
            const { login, user_id } = validationJson
            const ModChannels = await Api.getUserModerationChannels(login)

            const uid = sha1(user_id)
            const token = await admin.auth().createCustomToken(uid)
            const userInfo = await Api.getUserInfo(login)
            res.json({
                token,
                displayName: userInfo.display_name,
                profilePicture: userInfo.profile_image_url,
                ModChannels
            })
        }
    } catch (err) {
        next(err)
    }
})

router.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: "Page Not Found"
    })
})

module.exports = router