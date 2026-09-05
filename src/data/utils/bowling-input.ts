/** Validate complete games before either scoring or exporting them. */
export function validateFrames(value: unknown): asserts value is string[][] {
    if (!Array.isArray(value) || value.length !== 10) throw new Error("A game must contain exactly ten frames");
    value.forEach((raw: unknown, frameIndex: number) => {
        if (!Array.isArray(raw)) throw new Error("Invalid frame");
        const balls: unknown[] = raw;
        let remaining = 10;
        let expected = 2;
        for (let i = 0; i < balls.length; i++) {
            const label = balls[i];
            if (i >= expected || typeof label !== "string" || !/^(X|10|[0-9]S?|F|-|\/)$/.test(label)) throw new Error("Invalid ball in frame " + (frameIndex + 1));
            const strike = label === "X" || label === "10";
            const spare = label === "/";
            if (strike && remaining !== 10) throw new Error("Strike requires a fresh rack");
            const fresh = i === 0 || (frameIndex === 9 && (balls[i - 1] === "X" || balls[i - 1] === "10" || balls[i - 1] === "/"));
            if (spare && fresh) throw new Error("Spare requires a second ball");
            if (label.endsWith("S") && (!fresh || label === "0S")) throw new Error("Invalid split marker");
            const pins = strike ? 10 : spare ? remaining : /^[0-9]/.test(label) ? Number(label[0]) : 0;
            if (pins > remaining || (!strike && !spare && pins === remaining)) throw new Error("Use a strike or spare mark for a cleared rack");
            remaining -= pins;
            if (frameIndex < 9 && strike) expected = 1;
            if (frameIndex === 9 && ((i === 0 && strike) || (i === 1 && spare))) expected = 3;
            if (remaining === 0) remaining = 10;
        }
        if (balls.length !== expected) throw new Error("Incomplete frame " + (frameIndex + 1));
    });
}

export function convertScore(raw: string): string[][] {
    const input = raw.toUpperCase();
    if (input.length > 60 || !/^[X0-9FS/-]+$/.test(input)) throw new Error("Invalid score characters");
    const tokens = input.match(/[0-9]S?|[XF/-]/g) ?? [];
    if (tokens.join("") !== input) throw new Error("Unexpected split marker or trailing input");
    const frames: string[][] = [];
    let cursor = 0;
    for (let i = 0; i < 9; i++) {
        const first = tokens[cursor++];
        frames.push(first === "X" ? [first] : [first, tokens[cursor++]]);
    }
    frames.push(tokens.slice(cursor));
    validateFrames(frames);
    return frames;
}
