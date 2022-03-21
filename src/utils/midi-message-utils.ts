export function getCommandContent(message: string): string {
    return message.substring(message.indexOf(" ") + 1)
}

export function firstMessageValue(message: string): string {
    return message.split(" ")[1];
}

export function removeTimeFigure(message: string): string {
    return message.split("(")[0];
}

export function parseChord(chord: string): string {
    const parsedChord = removeTimeFigure(chord);
    if (parsedChord.length === 0) {
        return ""
    }
    if (parsedChord.length === 1 || (parsedChord.length === 2 && (parsedChord.includes("b") || parsedChord.includes("#")))) {
        return parsedChord + "M";
    }
    if (parsedChord.includes("min")) {
        const [pre, post] = parsedChord.split("min");
        return pre + "m" + post;
    }
    if (["7", "6"].includes(parsedChord.charAt(parsedChord.length - 1)) && (parsedChord.length < 3 || (parsedChord.length === 3 ? parsedChord.includes("b") || parsedChord.includes("#") : false))) {
        return parsedChord + "th"
    }
    return parsedChord;
}

export function calculateTimeout(chordNoteToken: string, tempo: number): number {
    return Math.floor((60_000_000_000 * _getQuarterMultiplier(chordNoteToken)) / tempo)
}

export function calculateClockTickTimeNs(tempo: number) {
    //ns per second * (60/tempo) = time for each hit / 24ppq => MIDI Clock
    return Math.floor(60_000_000_000 / (tempo * 24));
}

function _getQuarterMultiplier(chordNoteToken: string) {
    return Number(chordNoteToken.substring(chordNoteToken.indexOf("(") + 1, chordNoteToken.indexOf(")"))) || 4
}