interface DurationOptions {
	milliseconds?: number;
	seconds?: number;
	minutes?: number;
	hours?: number;
	days?: number;
	weeks?: number;
	months?: number;
	years?: number;
}

export class Duration {
	private static readonly MS_PER_SECOND = 1000;
	private static readonly MS_PER_MINUTE = Duration.MS_PER_SECOND * 60;
	private static readonly MS_PER_HOUR = Duration.MS_PER_MINUTE * 60;
	private static readonly MS_PER_DAY = Duration.MS_PER_HOUR * 24;
	private static readonly MS_PER_WEEK = Duration.MS_PER_DAY * 7;
	private static readonly DAYS_PER_MONTH = 30.437;
	private static readonly MS_PER_MONTH = Duration.MS_PER_DAY * Duration.DAYS_PER_MONTH;
	private static readonly MS_PER_YEAR = Duration.MS_PER_DAY * 365.25; // Using an average year, including leap years

	private _milliseconds: number;

	constructor(input?: DurationOptions | number) {
		if (!input) this._milliseconds = 0;
		else if (typeof input === "number") {
			this._milliseconds = input;
		} else {
			const { milliseconds, seconds, minutes, hours, days, weeks, months, years } = input;
			this._milliseconds =
				milliseconds +
				seconds * Duration.MS_PER_SECOND +
				minutes * Duration.MS_PER_MINUTE +
				hours * Duration.MS_PER_HOUR +
				days * Duration.MS_PER_DAY +
				weeks * Duration.MS_PER_WEEK +
				months * Duration.MS_PER_MONTH +
				years * Duration.MS_PER_YEAR;
		}
	}

	static fromMilliseconds(milliseconds: number): Duration {
		return new Duration({ milliseconds });
	}

	static fromSeconds(seconds: number): Duration {
		return new Duration({ seconds });
	}

	static fromMinutes(minutes: number): Duration {
		return new Duration({ minutes });
	}

	static fromHours(hours: number): Duration {
		return new Duration({ hours });
	}

	static fromDays(days: number): Duration {
		return new Duration({ days });
	}

	static fromWeeks(weeks: number): Duration {
		return Duration.fromMilliseconds(weeks * Duration.MS_PER_WEEK);
	}

	static fromMonths(months: number): Duration {
		return Duration.fromMilliseconds(months * Duration.MS_PER_MONTH);
	}

	static fromYears(years: number): Duration {
		return new Duration({ years });
	}

	static zero(): Duration {
		return new Duration();
	}

	toMilliseconds(): number {
		return this._milliseconds;
	}

	toSeconds(): number {
		return this._milliseconds / Duration.MS_PER_SECOND;
	}

	toMinutes(): number {
		return this._milliseconds / Duration.MS_PER_MINUTE;
	}

	toHours(): number {
		return this._milliseconds / Duration.MS_PER_HOUR;
	}

	toDays(): number {
		return this._milliseconds / Duration.MS_PER_DAY;
	}

	toWeeks(): number {
		return this.milliseconds / Duration.MS_PER_WEEK;
	}

	toMonths(): number {
		return this.milliseconds / Duration.MS_PER_MONTH;
	}

	toYears(): number {
		return this._milliseconds / Duration.MS_PER_YEAR;
	}

	add(other: Duration): Duration {
		return new Duration({ milliseconds: this._milliseconds + other._milliseconds });
	}

	subtract(other: Duration): Duration {
		return new Duration({ milliseconds: this._milliseconds - other._milliseconds });
	}

	multiply(factor: number): Duration {
		return new Duration({ milliseconds: this._milliseconds * factor });
	}

	divide(divisor: number): Duration {
		return new Duration({ milliseconds: this._milliseconds / divisor });
	}

	valueOf(): number {
		return this._milliseconds;
	}

	get days(): number {
		return Math.floor(this.milliseconds / Duration.MS_PER_DAY);
	}

	get hours(): number {
		return Math.floor((this.milliseconds % Duration.MS_PER_DAY) / Duration.MS_PER_HOUR);
	}

	get minutes(): number {
		return Math.floor((this.milliseconds % Duration.MS_PER_HOUR) / Duration.MS_PER_MINUTE);
	}

	get seconds(): number {
		return Math.floor((this.milliseconds % Duration.MS_PER_MINUTE) / Duration.MS_PER_SECOND);
	}

	get weeks(): number {
		return Math.floor(this.days / 7);
	}

	get months(): number {
		return Math.floor(this.days / Duration.DAYS_PER_MONTH);
	}

	get years(): number {
		return Math.floor(this.months / 12);
	}

	get milliseconds(): number {
		return this._milliseconds;
	}

	format(template = "dd days hh hours mm minutes ss seconds"): string {
		const patterns: Record<string, string> = {
			YYYY: String(this.years).padStart(4, "0"),
			YY: String(this.years).slice(-2),
			MM: String(this.months).padStart(2, "0"),
			M: String(this.months),
			WW: String(this.weeks).padStart(2, "0"),
			W: String(this.weeks),
			DD: String(this.days).padStart(2, "0"),
			D: String(this.days),
			HH: String(this.hours).padStart(2, "0"),
			H: String(this.hours),
			mm: String(this.minutes).padStart(2, "0"),
			m: String(this.minutes),
			ss: String(this.seconds).padStart(2, "0"),
			s: String(this.seconds),
			SSS: String(this.milliseconds).padStart(3, "0"),
			S: String(this.milliseconds),
		};

		let formatted = template;

		for (const pattern in patterns) {
			formatted = formatted.replace(pattern, patterns[pattern]);
		}

		return formatted;
	}

	toString(): string {
		return this.format();
	}
}

export function setDurationTimeout(callback: () => void, duration: Duration): NodeJS.Timeout {
	return setTimeout(callback, duration.toMilliseconds());
}

export function setDurationInterval(callback: () => void, duration: Duration): NodeJS.Timeout {
	return setInterval(callback, duration.toMilliseconds());
}

export function sleep(duration: Duration): Promise<void> {
	return new Promise(resolve => {
		setDurationTimeout(resolve, duration);
	});
}
