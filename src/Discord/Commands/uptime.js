module.exports = {
    name: 'uptime',
    aliases: ['up'],
    description: 'Get the bots uptime',
    execute: (message, args, client) => {
        message.channel.send(client.uptime)
    }
}