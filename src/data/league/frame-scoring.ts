/*
 * Copyright (c) 2025. Bindul Bhowmik
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Frame} from "./league-matchup";
import {validateFrames} from "../utils/bowling-input";
import {isNumeric} from "../utils/utils";

export function accumulateFrameScores (frames: Frame[]) {
    const getNextNScores = (frames: Frame[], curIdx: number, count: number): number => {
        let toGet: number = count;
        let accum = 0;
        for (let i = curIdx + 1; i < frames.length && toGet > 0; i++) {
            accum += frames[i].ballScores[0][0];
            toGet--;
            if (toGet > 0 && frames[i].ballScores.length > 1) {
                accum += frames[i].ballScores[1][0];
                toGet--;
            }
        }
        return accum;
    }

    let scoreAccum = 0;
    frames.forEach((currFrame, i) => {
        currFrame.ballScores.forEach((score) => {
            scoreAccum += score[0];
            if (i < 9) {
                // Not the 10th frame
                if (score[1] == "X") {
                    scoreAccum += getNextNScores(frames, i, 2);
                } else if (score[1] == "/") {
                    scoreAccum += getNextNScores(frames, i, 1);
                }
            }
        })
        currFrame.cumulativeScore = scoreAccum;
    });

    return scoreAccum;
}

export function buildFrames(inFrames: string[][]) {
    validateFrames(inFrames);
    const frames: Frame[] = [];
    for (let f = 0; f < inFrames.length; f++) {
        // We assume Frame objects are not set, we set them
        const frame = new Frame();
        frame.number = f + 1;
        const inFrame = inFrames[f];

        for (let b = 0; b < inFrame.length; b++) {
            const lbl = inFrame[b];
            if ((b == 0 || f == 9) && (lbl == "X" || (isNumeric(lbl) && Number(lbl) == 10))) {
                frame.ballScores[b] = [10, "X"];
            } else if (lbl == "F" || lbl == "-") {
                frame.ballScores[b] = [0, lbl];
            } else if (lbl == "/" && b > 0) {
                frame.ballScores[b] = [10 - frame.ballScores[b - 1][0], lbl];
            } else if (lbl.endsWith("S") && (b == 0 || (f == 9 && b < 2))) {
                frame.ballScores[b] = [Number.parseInt(lbl.substring(0, 1)), "S"];
            } else if (isNumeric(lbl)) {
                frame.ballScores[b] = [Number.parseInt(lbl)];
            }
        }
        frames.push(frame);
    }
    return frames;
}


/** Bonus balls do not reopen a closed tenth frame. */
export function isCleanGame(frames: Frame[]): boolean {
    return frames.every(frame => frame.number === 10
        ? frame.ballScores[0][0] === 10 || frame.ballScores[0][0] + (frame.ballScores[1]?.[0] ?? 0) === 10
        : ["X", "/"].includes(frame.ballScores[frame.ballScores.length - 1]?.[1] ?? ""));
}

export function analyzeStrikes(frames: Frame[]) {
    const streaks = new Map<number, number>();
    const turkeyFrames = new Set<number>();
    const perfectFrames = new Set<number>();
    let run = 0;
    const finish = () => { if (run >= 3) streaks.set(run, (streaks.get(run) ?? 0) + 1); run = 0; };
    for (const frame of frames) {
        const rolls = frame.number === 10 ? frame.ballScores : frame.ballScores.slice(0, 1);
        rolls.forEach((roll, index) => {
            if (index === 0 ? roll[0] === 10 : roll[1] === "X") {
                run++;
                if (run === 3) turkeyFrames.add(frame.number);
                if (run === 12) perfectFrames.add(frame.number);
            } else finish();
        });
    }
    finish();
    return {streaks, turkeyFrames, perfectFrames};
}
