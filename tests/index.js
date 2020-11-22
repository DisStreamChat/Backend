const { checkDiscordInviteLink } = require("../src/utils/functions");

describe("check for discord invite link", () => {
	test("check redirect link", async () => {
		expect(await checkDiscordInviteLink("http://discord.disstreamchat.com")).toEqual(true);
	});

	test("check regular discord link", async () => {
		expect(await checkDiscordInviteLink("https://www.discord.com")).toEqual(false);
	});
	test("check discord vanity url", async () => {
		expect(await checkDiscordInviteLink("https://discord.gg/elf")).toEqual(true);
	});
});
