import { sleep } from "../../utils/functions";
import { logUpdate } from "./utils";
import setupLogging from "./utils/setupLogging";

const colorString = (color, hash = true) => (hash ? "#" : "") + color.toString(16).padStart(6, "0");

export default async (oldRole, newRole, client) => {
	await sleep(2000);
	const guild = oldRole.guild;

	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	if (deleteAction.action !== "ROLE_UPDATE") return;

	let executor = deleteAction.executor;

	const [channelIds, active] = await setupLogging(guild, "roleUpdate", client);
	if (!active || !channelIds) return;

	const embed = (
		await logUpdate(oldRole, newRole, {
			title: `:pencil: Role updated: ${newRole.name}`,
			footer: `Role ID: ${newRole.id}`,
			ignoredDifferences: ["permissions"], // TODO: handle permission changes
			valueMap: {
				color: value => {
					return !value
						? `[#000000](https://www.color-hex.com/color/000000)`
						: `[${colorString(value)}](https://www.color-hex.com/color/${colorString(value, false)})`;
				},
			},
		})
	).setAuthor(executor.tag, executor.avatarURL());

	for (const channelId of channelIds) {
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
