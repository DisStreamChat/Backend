# DisStreamChat Backend
![license](https://img.shields.io/github/license/DisStreamChat/Backend) <a href="https://api.disstreamchat.com/discord">
        <img src="https://img.shields.io/discord/711238743213998091?logo=discord"
            alt="chat on Discord"></a>  
This is the backend for the DisStreamChat application, it contains the discord and twitch bots that allow integration between a discord `live chat` channel and twitch chat, this allow users without twitch accounts or who prefer discord to chat with the streamer without making the streamer look at two chats.

DisStreamChat is currently in early alpha, but you can add it at [disstreamchat.com](https://www.disstreamchat.com/#/)

# Contributions

Contributions and suggestions are welcome, if you have any suggestion go ahead and make an issue and if we like your suggestion we will add it to the todo list. You can also join the [discord](https://discord.disstreamchat.com) to give suggestion and get help, either with using it or contributing. If you want to contribute feel free to make a PR we will take a look at it as soon as we get a chance and we'll see if we can merge it.

# Installation

The DisStreamChat backend is built with babel so these steps will involve transpiling the code and running it
to Install a development version follow these steps
1. clone the repo with `git clone`
2. cd into the repo with `cd Backend`
3. run `npm i` to install dependencies
4. add a `.env` and add in the environment variables from `.env.sample`
5. run it with `npm run dev` or `npm start`
