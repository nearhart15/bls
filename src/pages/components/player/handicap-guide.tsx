/*
 * Handicap guide - expected stats for a given house handicap
 */

import {type FC, type ReactNode, useMemo, useState} from "react";
import {Card, CardBody, Form} from "react-bootstrap";

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function round0(n: number): number {
    return Math.round(n);
}

/** Invert typical 90% of 220 house handicap. */
function avgFromHandicap(hdcp: number): number {
    return clamp(220 - hdcp / 0.9, 110, 230);
}

function handicapFromAvg(avg: number): number {
    return Math.max(0, Math.round(0.9 * (220 - avg)));
}

interface ExpectedStats {
    hdcp: number;
    avg: number;
    hdcpGame: number;
    series: number;
    hdcpSeries: number;
    strike: number;
    spare: number;
    single: number;
    open: number;
    split: number;
    firstBall: number;
    clean: number;
    hung: number;
    turkey: number;
    twoHundred: number;
    threeHundred: number;
    sixHundred: number;
    sd: number;
    highGame: number;
    pinfallFrame: number;
    marksGame: number;
    ballsGame: number;
    frames50: number;
    balls50: number;
    frames100: number;
    balls100: number;
    frames150: number;
    balls150: number;
    frames200: number;
    balls200: number;
}

function predict(hdcp: number): ExpectedStats {
    const avg = avgFromHandicap(hdcp);
    const a = clamp(avg, 110, 230);
    const strike = clamp(28 + (a - 150) * 0.37, 12, 62);
    const spare = clamp(42 + (a - 150) * 0.33, 28, 72);
    const single = clamp(70 + (a - 150) * 0.33, 55, 96);
    const open = clamp(26 - (a - 150) * 0.27, 6, 40);
    const split = clamp(12 - (a - 150) * 0.08, 4, 16);
    const firstBall = clamp(7.6 + (a - 150) * 0.023, 7.0, 9.6);
    const clean = clamp(8 + (a - 150) * 0.2, 4, 28);
    const hung = clamp(18 - (a - 150) * 0.1, 6, 22);
    const turkey = clamp(4 + (a - 150) * 0.12, 2, 16);
    const twoHundred = clamp(8 + (a - 150) * 0.35, 1, 45);
    const threeHundred = clamp((a - 180) * 0.04, 0, 3);
    const sixHundred = clamp(12 + (a - 150) * 0.4, 2, 55);
    const sd = clamp(32 - (a - 150) * 0.08, 18, 36);
    const ppf = avg / 10;
    const ballsPerFrame = 1 + (1 - strike / 100);
    const pace = (target: number) => {
        const frames = clamp(target / Math.max(ppf, 0.1), 2, 10);
        return {frames, balls: frames * ballsPerFrame};
    };
    const p50 = pace(50);
    const p100 = pace(100);
    const p150 = pace(150);
    const p200 = pace(200);
    return {
        hdcp,
        avg: round1(avg),
        hdcpGame: round1(avg + hdcp),
        series: round1(avg * 3),
        hdcpSeries: round1((avg + hdcp) * 3),
        strike: round1(strike),
        spare: round1(spare),
        single: round1(single),
        open: round1(open),
        split: round1(split),
        firstBall: round1(firstBall),
        clean: round1(clean),
        hung: round1(hung),
        turkey: round1(turkey),
        twoHundred: round1(twoHundred),
        threeHundred: round1(threeHundred),
        sixHundred: round1(sixHundred),
        sd: round1(sd),
        highGame: round0(avg + 1.65 * sd),
        pinfallFrame: round1(ppf),
        marksGame: round1(10 * (1 - open / 100)),
        ballsGame: round1(9 * ballsPerFrame + 2.4),
        frames50: round1(p50.frames),
        balls50: round1(p50.balls),
        frames100: round1(p100.frames),
        balls100: round1(p100.balls),
        frames150: round1(p150.frames),
        balls150: round1(p150.balls),
        frames200: round1(p200.frames),
        balls200: round1(p200.balls),
    };
}

const Tile: FC<{value: string; label: string}> = ({value, label}) => (
    <div className="bls-allstats-cell">
        <div className="bls-allstats-val">{value}</div>
        <div className="bls-allstats-lbl">{label}</div>
    </div>
);

const Group: FC<{title: string; children: ReactNode}> = ({title, children}) => (
    <div className="bls-allstats-group mb-3">
        <div className="bls-allstats-group-head">{title}</div>
        <div className="bls-allstats-grid">{children}</div>
    </div>
);

const HandicapGuide: FC = () => {
    const [hdcp, setHdcp] = useState(36);
    const stats = useMemo(() => predict(hdcp), [hdcp]);
    const check = handicapFromAvg(stats.avg);

    return (
        <div className="container-md bls-hdcp-guide">
            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Handicap guide</div>
                <CardBody>
                    <p className="text-body-secondary mb-4">
                        Drag the slider to a house handicap. Numbers below are what a bowler
                        with that handicap usually looks like on a typical 90% of 220 league
                        - not a guarantee, and not a 220 scratch standard.
                    </p>
                    <div className="bls-hdcp-hero mb-3">
                        <div className="bls-hdcp-hero-num tabular-nums">{hdcp}</div>
                        <div className="bls-hdcp-hero-lbl">Handicap pins</div>
                        <div className="bls-hdcp-hero-sub">
                            About a {stats.avg} scratch average
                            {check !== hdcp ? ` (rounds to ${check} hdcp)` : ""}
                        </div>
                    </div>
                    <Form.Label htmlFor="hdcp-slider" className="visually-hidden">
                        Handicap
                    </Form.Label>
                    <Form.Range
                        id="hdcp-slider"
                        min={0}
                        max={90}
                        step={1}
                        value={hdcp}
                        onChange={(e) => setHdcp(Number(e.target.value))}
                    />
                    <div className="d-flex justify-content-between text-body-secondary fs-sm">
                        <span>0 hdcp / 220 avg</span>
                        <span>90 hdcp / 120 avg</span>
                    </div>
                </CardBody>
            </Card>

            <Group title="Scoring">
                <Tile value={String(stats.avg)} label="Expected scratch avg" />
                <Tile value={String(stats.hdcp)} label="House handicap (90/220)" />
                <Tile value={String(stats.hdcpGame)} label="Expected hdcp game" />
                <Tile value={String(stats.series)} label="Expected 3-game series" />
                <Tile value={String(stats.hdcpSeries)} label="Expected hdcp series" />
                <Tile value={String(stats.sd)} label="Typical game SD" />
                <Tile value={String(stats.highGame)} label="Typical hot game (95th)" />
                <Tile value={`${stats.twoHundred}%`} label="Games 200+" />
                <Tile value={`${stats.threeHundred}%`} label="Games 300" />
                <Tile value={`${stats.sixHundred}%`} label="Series 600+" />
            </Group>

            <Group title="Conversion">
                <Tile value={`${stats.strike}%`} label="Strike rate" />
                <Tile value={`${stats.spare}%`} label="Spare rate" />
                <Tile value={`${stats.single}%`} label="Single-pin pickup" />
                <Tile value={`${stats.open}%`} label="Open frames" />
                <Tile value={`${stats.split}%`} label="Splits" />
                <Tile value={String(stats.firstBall)} label="First-ball average" />
                <Tile value={`${stats.clean}%`} label="Clean games" />
                <Tile value={`${stats.hung}%`} label="Got hung (per game)" />
                <Tile value={`${stats.turkey}%`} label="Turkeys (per game)" />
            </Group>

            <Group title="Pace and frames">
                <Tile value={String(stats.pinfallFrame)} label="Expected pinfall per frame" />
                <Tile value={String(stats.marksGame)} label="Marks per game" />
                <Tile value={String(stats.ballsGame)} label="Balls thrown per game" />
                <Tile value={String(stats.frames50)} label="Frames to reach 50" />
                <Tile value={String(stats.balls50)} label="Balls to reach 50" />
                <Tile value={String(stats.frames100)} label="Frames to reach 100" />
                <Tile value={String(stats.balls100)} label="Balls to reach 100" />
                <Tile value={String(stats.frames150)} label="Frames to reach 150" />
                <Tile value={String(stats.balls150)} label="Balls to reach 150" />
                <Tile value={String(stats.frames200)} label="Frames to reach 200" />
                <Tile value={String(stats.balls200)} label="Balls to reach 200" />
            </Group>

            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">How this is calculated</div>
                <CardBody className="fs-sm text-body-secondary">
                    <p className="mb-2">
                        Handicap is inverted from a 90% of 220 house: average = 220 - handicap / 0.9.
                        Strike, spare, open, first-ball, and pace numbers are scaled from that average
                        using the same ranges used on player Insights.
                    </p>
                    <p className="mb-0">
                        These are typical values for that handicap, not a ceiling. Lane conditions,
                        games bowled, and spare systems move the real numbers around.
                    </p>
                </CardBody>
            </Card>
        </div>
    );
};

export default HandicapGuide;
