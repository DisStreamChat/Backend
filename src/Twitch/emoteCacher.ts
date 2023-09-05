import { firestore } from "firebase-admin";

import { Duration, setDurationInterval, setDurationTimeout } from "../utils/duration.util";
import { EnvManager } from "../utils/envManager.util";
import { Logger } from "../utils/functions/logging";
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
		Logger.log("starting emote cacher");
		setDurationTimeout(() => {
			this.refreshEmotes().then(() => {
				setDurationInterval(this.refreshEmotes, refreshDuration);
			});
		}, Duration.fromSeconds(1));
	}

	async refreshEmotes() {
		if (EnvManager.BOT_DEV) return;
		const streamersRef = await firestore().collection("Streamers").get();
		const streamers = streamersRef.docs.map(doc => doc.data());
		const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
		for (const name of twitchNames) {
			try {
				const cachedBTTVEmotes = this.bttv.get(name);
				const cachedFFZEmotes = this.ffz.get(name);
				if (!cachedBTTVEmotes || (cachedBTTVEmotes && cachedBTTVEmotes.shouldRefresh)) {
					Logger.log(`refreshing bttv for channel: ${name}`);
					this.bttv.set(name, { ...(await getBttvEmotes(name)), shouldRefresh: false });
				}
				if (!cachedFFZEmotes || (cachedFFZEmotes && cachedFFZEmotes.shouldRefresh)) {
					Logger.log(`refreshing ffz for channel: ${name}`);
					this.ffz.set(name, { ...(await getFfzEmotes(name)), shouldRefresh: false });
				}
			} catch (err) {
				Logger.error(err.message);
			}
		}
	}

	temporarilyInvalidate(set: "bttv" | "ffz", name: string) {
		this._cache[set].get(name).shouldRefresh = true;
		setDurationTimeout(() => {
			this._cache[set].get(name).shouldRefresh = false;
		}, refreshDuration);
	}

	temporarilyInvalidateAll(name: string) {
		this.temporarilyInvalidate("bttv", name);
		this.temporarilyInvalidate("ffz", name);
	}

	get bttv() {
		return this._cache.bttv;
	}

	get ffz() {
		return this._cache.ffz;
	}
}

export const emoteCacher = new EmoteCacher();
