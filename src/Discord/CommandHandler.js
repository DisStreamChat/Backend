const path = require("path")
const fs = require("fs")
const {adminWare, modWare} = require("../utils/functions")
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

module.exports = async (message, client) => {
    if(!message.content.startsWith(prefix)) return
    const args = message.content.split(" ")
    const command = args.shift().slice(1)
    const commandObj = commands[command]
    if(!commandObj) return
    
    if(commandObj.adminOnly) await adminWare(message, args, client, commandObj.execute)
    else if(commandObj.permissions) await modWare(message, args, client, commandObj.permissions, commandObj.execute)
    else await commandObj.execute(message, args, client)
}