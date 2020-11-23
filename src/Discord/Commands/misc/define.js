const { MessageEmbed } = require("discord.js");
import fetch from "fetchio-js";

module.exports = {
	name: "define",
	aliases: [],
	id: "define",
	category: "misc",
	description: "Get the definition of a word from the unoffical google dictionary api",
	usage: ["(username | nickname | ping | id)"],
	execute: async (msg, args, bot) => {
		const word = args[0];
		const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
		const response = await fetch(apiUrl);
		if (response.code === 404) return msg.channel.send(`:x: Can not find a definition for **${word}**`);
		const definition = response["0"];
		const embed = new MessageEmbed()
			.setColor("11ee11")
			.setAuthor(bot.user.username)
			.setTitle(`Definition of ${word}`)
			.addField("Pronunciation", definition.phonetics.map(phon => phon.text).join("\n"))
			.addField(
				"Definitions",
				definition.meanings
					.map(meaning => `**${meaning.partOfSpeech}** \n - ${meaning.definitions.map(item => item.definition).join(",\n - ")}`)
					.join("\n\n")
			)
			.setFooter("powered by https://dictionaryapi.dev/")
			.setTimestamp(new Date());
		msg.channel.send(embed);
	},
};
