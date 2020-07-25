const path = require("path")
const fs = require("fs")
const commandPath = path.join(__dirname, "Commands")
const commandFiles = (fs.readdirSync(commandPath))
const commands = {}
commandFiles.forEach(command => {
    if(command.endsWith(".js")){
        const commandObj = require(path.join(commandPath, command))
        const _ = [commandObj.name, ...commandObj.aliases].map(name => {
            commands[name] = commandObj
        }) 
    }
})

const prefix = "!"

module.exports = (message, client) => {
    if(!message.startsWith(prefix)) return
    const args = message.split(" ")
    const command = args.shift().slice(1)
    const commandObj = commands[command]
    if(!commandObj) return
    commandObj.execute(message, args, client)
}