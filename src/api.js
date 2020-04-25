const express = require("express")

const fs = require("fs")
const path = require("path")

// const configFile = require("../config.json")
const configPath = path.join(__dirname, "..", "config.json")


const PORT = process.env.PORT || 3100

const app = express()

app.use(express.json())

app.get("/getall", (req, res) => {
    res.json(require("../config.json"))
})

app.post("/addChannel", (req, res) => {
    const configFile = JSON.parse(fs.readFileSync(configPath))
    const {guildId} = req.body
    configFile.channels[guildId] = {
        twitch: req.body.twitchChannel,
        livechatId: req.body.liveChatID
    }
    fs.writeFileSync(configPath, JSON.stringify(configFile))
    res.json("success")
})

app.get("/makecoffee", (req, res) => {
    res.status(418).json({error: "418", message: "I am a teapot"})
})

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

module.exports = app