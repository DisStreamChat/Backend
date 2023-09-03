import { firestore } from "firebase-admin";

import { Duration, setDurationInterval, setDurationTimeout } from "../utils/duration.util";
import { log } from "../utils/functions/logging";
import { getBttvEmotes, getFfzEmotes } from "../utils/functions/TwitchFunctions";

interface EmoteSetData {
	shouldRefresh: boolean;
	emotes: Record<string, string>;
	regex: RegExp;
}

export const refreshDuration = Duration.fromMinutes(5);

class EmoteCacher {
	private _cache: {
		bttv: Map<string, EmoteSetData>;
		ffz: Map<string, EmoteSetData>;
	};

	constructor() {
		console.log("starting emote cacher");
		setDurationTimeout(() => {
			this.refreshEmotes().then(() => {
				setDurationInterval(this.refreshEmotes, refreshDuration);
			});
		}, Duration.fromSeconds(1));
	}

	async refreshEmotes() {
		if (process.env.BOT_DEV == "true") return;
		const streamersRef = await firestore().collection("Streamers").get();
		const streamers = streamersRef.docs.map(doc => doc.data());
		const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
		for (const name of twitchNames) {
			try {
				const cachedBTTVEmotes = this.bttv.get(name);
				const cachedFFZEmotes = this.ffz.get(name);
				if (!cachedBTTVEmotes || (cachedBTTVEmotes && cachedBTTVEmotes.shouldRefresh)) {
					log("refreshing bttv, " + name, { writeToConsole: true });
					this.bttv.set(name, { ...(await getBttvEmotes(name)), shouldRefresh: false });
				}
				if (!cachedFFZEmotes || (cachedFFZEmotes && cachedFFZEmotes.shouldRefresh)) {
					log("refreshing ffz, " + name, { writeToConsole: true });
					this.ffz.set(name, { ...(await getFfzEmotes(name)), shouldRefresh: false });
				}
			} catch (err) {
				log(err.message);
			}
		}
	}

	invalidate(set: "bttv" | "ffz", name: string) {
		this._cache[set].get(name).shouldRefresh = true;
		setDurationTimeout(() => {
			this._cache[set].get(name).shouldRefresh = false;
		}, refreshDuration);
	}

	get bttv() {
		return this._cache.bttv;
	}

	get ffz() {
		return this._cache.ffz;
	}
}

export const emoteCacher = new EmoteCacher();
