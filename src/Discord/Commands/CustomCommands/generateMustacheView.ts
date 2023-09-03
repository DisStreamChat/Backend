import { isNumeric, random } from "../../../utils/functions";

export function generateMustacheView({ message, args = [] }) {
	const fullArgs = args.join(" ");
	const argObj = {
		urlencode: encodeURIComponent(fullArgs),
		toString: () => fullArgs,
	};
	const view = {
		random: () => (val: number) => {
			if (!val) val = 1;
			if (!isNumeric(val)) val = 1;
			return random(Number(val));
		},
		member: message.member,
		user: message.author,
		author: message.author,
		me: message.member,
		time: () => (val: string) => {
			const now = new Date();
			try {
				return now.toLocaleTimeString("en-US", { timeZone: val });
			} catch (err) {
				return "`Invalid Timezone`";
			}
		},
		msg: argObj,
		args: argObj,
	};
	//@ts-ignore
	view.time.value = () => new Date().toLocaleTimeString();
	for (let i = 0; i < args.length; i++) {
		view[`arg${i + 1}`] = {
			urlenclode: encodeURIComponent(args[i]),
			toString: () => args[i],
		};
	}
	return view;
}
