// add a non breaking space after the @
export const escapePings = (text: string) => text.replace("@", "@‍");

export const unescapeHTML = (text: string) => text.replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
