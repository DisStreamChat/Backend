import { getXp } from "./levelingFunctions";
import svg2img from "svg2img";
import { Guild, GuildMember } from "discord.js";

const bufferifySVG = (svg: string, opts?: any): Promise<Buffer> => {
	return new Promise((res, rej) =>
		svg2img(svg, opts, (error, buffer) => {
			res(buffer);
		})
	);
};

export const generateRankCard = async (userData, user, buffer = true) => {
	const primaryColor = userData.primaryColor || "#c31503";
	const backgroundColor1 = "#1f2525a0";
	const backgroundColor2 = `#090b0b${(userData.backgroundOpacity ?? 255).toString(16)}`;
	const xpBarBackground = "#484b4e";
	const backgroundImage = userData.backgroundImage;

	// calculate all required values
	const xpToNextLevel = getXp(userData.level + 1);
	const xpForCurrentLevel = getXp(userData.level);
	const xpLevelDif = Math.abs(xpToNextLevel - xpForCurrentLevel);
	const xpProgress = Math.abs(userData.xp - xpForCurrentLevel);
	const percentDone = xpProgress / xpLevelDif;
	const displayXp = xpProgress > 1000 ? `${(xpProgress / 1000).toFixed(2)}k` : Math.floor(xpProgress);
	const displayXpToGo = xpLevelDif > 1000 ? `${(xpLevelDif / 1000).toFixed(2)}k` : xpLevelDif;

	const profileUrl = user.user.displayAvatarURL({ format: "png" });

	const statuses = {
		online: "https://cdn.discordapp.com/emojis/726982918064570400.png?v=1",
		idle: "https://cdn.discordapp.com/emojis/726982942181818450.png?v=1",
		dnd: "https://cdn.discordapp.com/emojis/726982954580181063.png?v=1",
		offline: "https://cdn.discordapp.com/emojis/702707414927015966.png?v=1",
	};

	const svgString = `
	<svg
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			width="700px"
			height="250px"
		>
			<defs>
				<pattern id="bgImage" patternUnits="userSpaceOnUse" width="700" height="250">
					<image href="${backgroundImage}" x="0" y="0" width="700" height="250" />
				</pattern>
				<style>
					@import(https://api.disstreamchat.com/fonts);
				</style>
				</defs>
			<rect
				id="rect"
				width="100%"
				height="100%"
				rx="125px"
				ry="125px"
				style="fill: ${backgroundImage ? "url(#bgImage)" : backgroundColor1}"
			></rect>

			<rect
				y="5%"
				x="2%"
				rx="120"
				ry="120"
				width="96%"
				height="90%"
				style="fill: ${backgroundColor2}; opacity: ${userData?.backgroundOpacity}"
			></rect>

			<circle r="90" cx="125" cy="125" style="fill: black"></circle>
			<clipPath id="clipCircle">
				<circle r="90" cx="125" cy="125"></circle>
			</clipPath>
			<image
				x="35"
				y="35"
				width="180"
				height="180"
				clip-path="url(#clipCircle)"
				href="${profileUrl}"
			></image>

			<image x="155" y="155" width="60" height="60" xlink:href="${statuses["online"]}"></image>

			<text
				x="230"
				y="155"
				font-family="Poppins"
				font-size="24"
				style="strokeWidth: 0.2px"
			>
				<tspan fill="white">
					RANK
					<tspan font-size="28">${userData.rank}</tspan>
				</tspan>
				   
				<tspan fill="white">
					${" "}LEVEL
					<tspan font-size="28">${userData.level + 1}</tspan>
				</tspan>
			</text>

			<text x="230" y="110" font-size="28" fill="white">
				${user.user.username}
				<tspan style="fill: #7F8384" font-size="16">
					${user.user.tag.slice(-5)}
				</tspan>
			</text>

			<rect
				x="230"
				y="120"
				rx="2"
				ry="2"
				width="420"
				height="6"
				style="fill: ${primaryColor}"
			></rect>

			<text
				x="650"
				y="155"
				font-family="Poppins"
				font-size="16"
				fill="white"
				text-anchor="end"
			>
				${displayXp}
				<tspan style="fill: #7F8384"> / ${displayXpToGo} XP</tspan>
			</text>

			<rect
				x="229"
				y="169"
				rx="15"
				ry="15"
				width="421"
				height="32"
				style=" fill: black "
			></rect>
			<rect
				x="230"
				y="170"
				rx="15"
				ry="15"
				width="420"
				height="30"
				style="fill: ${xpBarBackground} "
			></rect>
			${
				percentDone
					? `<rect
				x="230"
				y="170"
				rx="15"
				ry="15"
				width="${420 * percentDone}"
				height="30"
				style="fill: ${primaryColor}"
			></rect>`
					: ""
			}
		</svg>
	`;

	if (!buffer) return svgString;
	const svgBuffer = await bufferifySVG(svgString);
	return svgBuffer;
};

interface CustomizationDataModel {
	backgroundImage?: string;
	backgroundColor?: string;
	borderColor?: string;
	bottomTextColor?: string;
}

export const generateWelcomeCard = async (guild: Guild, member: GuildMember, customizationData: CustomizationDataModel) => {
	const backgroundColor = customizationData.backgroundColor || "#4b7bec";
	const avatarBackground = customizationData.borderColor || "#20bf6b"
	const svgString = `
	<svg
		version="1.1"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		width="700px"
		height="400px"
	>
	<defs>
				<pattern id="bgImage" patternUnits="userSpaceOnUse" width="700" height="400">
						<image href="${customizationData.backgroundImage}" x="0" y="0" width="700" height="400" />
				</pattern>
				<style>
					@import(https://api.disstreamchat.com/fonts);
				</style>
				</defs>
	<rect
			id="rect"
			width="100%"
			height="100%"
			rx="25px"
			ry="25px"
			style="fill: ${backgroundColor}"
		></rect>
	<rect
			id="rect"
			width="100%"
			height="100%"
			rx="25px"
			ry="25px"
			style="fill: ${customizationData.backgroundImage ? "url(#bgImage)" : backgroundColor}"
		>
		</rect>
		<circle r="90" cx="50%" cy="35%" style="fill: ${avatarBackground}"></circle>
		<clipPath id="clipCircle">
				<circle r="83" cx="50%" cy="35%"></circle>
		</clipPath>
		<image
			x="260"
			y="50"
			width="180"
			height="180"
			clip-path="url(#clipCircle)"
			href="${member.user.displayAvatarURL({ format: "png" })}"
		></image>
		<text
				dominant-baseline="middle" text-anchor="middle"		
				x="50%"
				y="272"
				font-family="sans-serif"
				font-size="48"
				font-weight="800"
				text-align="center"
			>
				<tspan fill="white">
					WELCOME
				</tspan>
			</text>
		<text
				dominant-baseline="middle" text-anchor="middle"		
				x="50%"
				y="315"
				font-family="sans-serif"
				font-size="48"
				font-weight="800"
				text-align="center"
			>
				<tspan fill="white">
					${member.user.tag.toUpperCase()}
				</tspan>
			</text>
		<text
				dominant-baseline="middle" text-anchor="middle"		
				x="50%"
				y="355"
				font-family="sans-serif"
				font-size="24"
				font-weight="800"
				text-align="center"
			>
				<tspan fill="white">
					YOU ARE OUR ${guild.members.cache.size}TH MEMBER!
				</tspan>
			</text>
</svg>
	`;

	const svgBuffer = await bufferifySVG(svgString);
	return svgBuffer;
};

export default {
	generateRankCard,
	generateWelcomeCard,
};
