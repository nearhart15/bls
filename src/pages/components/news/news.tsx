/*
 * News / shout-outs from last-game notes © 2026
 */
import {type FC, useCallback, useMemo} from "react";
import {Link} from "react-router";
import moment from "moment";
import {Badge, Card, CardBody, CardHeader, CardText, CardTitle, Stack} from "react-bootstrap";
import {MegaphoneFill} from "react-bootstrap-icons";

import {compareMoments} from "../../../data/utils/utils";
import {NEWS_CACHE_CATEGORY, newsFetcher} from "../../../data/news/news-api";
import type {News} from "../../../data/news/news-items";
import {SHOUTOUT_CACHE_CATEGORY, shoutOutsFromLastGameNotes, type MatchNoteShoutOut} from "../../../data/news/shoutouts-from-notes";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";

interface NewsHighlightsProps {
    shoutOuts?: boolean;
}

const NewsHighlights: FC<NewsHighlightsProps> = ({shoutOuts = false}) => {
    if (shoutOuts) return <LastGameNotesShoutOuts />;
    return <FileNewsHighlights />;
};

const FileNewsHighlights: FC = () => {
    const fetcher = useCallback(newsFetcher, []);
    const {data, isLoading, error} = useCachedFetcher<News>(fetcher, NEWS_CACHE_CATEGORY);

    const expiredDays = Number(import.meta.env.VITE_NEWS_EXPIRED_AFTER_DAYS) || 14;
    const cutoff = useMemo(() => moment().subtract(expiredDays, "d"), [expiredDays]);

    const items = useMemo(() => {
        if (!data?.newsItems) return [];
        return data.newsItems
            .filter((ni) => ni.date.isSameOrAfter(cutoff))
            .sort((a, b) => compareMoments(a.date, b.date));
    }, [data, cutoff]);

    return (
        <Card className="mb-0">
            <CardHeader>Recent Highlights</CardHeader>
            {isLoading && <CardBody><Loader /></CardBody>}
            {error != null && <ErrorDisplay message="Error loading highlights." error={error} />}
            {!isLoading && !error && items.length === 0 && (
                <CardBody className="text-body-secondary fs-sm">No recent highlights.</CardBody>
            )}
            {items.map((ni, idx) => (
                <CardBody className="bls-news-item" key={"news-" + idx.toString()}>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                        <div className="bls-news-date">{ni.date.format("DD MMM")}</div>
                        <div className="flex-grow-1 min-w-0">
                            <CardTitle as="h6" className="mb-1">{ni.title}</CardTitle>
                            <CardText className="fs-sm mb-0 text-body-secondary">{ni.text}</CardText>
                        </div>
                    </Stack>
                </CardBody>
            ))}
        </Card>
    );
};

const LastGameNotesShoutOuts: FC = () => {
    const fetcher = useCallback(shoutOutsFromLastGameNotes, []);
    const {data, isLoading, error} = useCachedFetcher<MatchNoteShoutOut[]>(fetcher, SHOUTOUT_CACHE_CATEGORY);

    const items = data ?? [];
    const lastDate = items[0]?.date;

    return (
        <Card className="mb-0 bls-shoutouts">
            <CardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <span className="d-flex align-items-center gap-2">
                    <MegaphoneFill className="text-warning" />
                    Shout outs
                </span>
                {lastDate && (
                    <Badge bg="warning" text="dark" pill>
                        Last game {lastDate.format("DD MMM YYYY")}
                    </Badge>
                )}
            </CardHeader>
            {isLoading && <CardBody><Loader /></CardBody>}
            {error != null && <ErrorDisplay message="Error loading shout outs." error={error} />}
            {!isLoading && !error && items.length === 0 && (
                <CardBody className="text-body-secondary fs-sm">
                    No notes on the most recent games yet.
                </CardBody>
            )}
            {items.map((item, idx) => (
                <CardBody className="bls-news-item" key={`shout-${item.leagueId}-${item.week}-${idx}`}>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                        <div className="bls-news-date">{item.date.format("DD MMM")}</div>
                        <div className="flex-grow-1 min-w-0">
                            <CardTitle as="h6" className="mb-1">
                                <Link className="bls-link" to={`/league/${item.leagueId}/${item.teamId}`}>
                                    {item.leagueName}
                                </Link>
                                <span className="text-body-secondary fw-normal"> · Week {item.week}</span>
                            </CardTitle>
                            <div className="fs-sm text-body-secondary mb-1">
                                {item.teamName}
                                {item.opponentName ? ` vs ${item.opponentName}` : ""}
                            </div>
                            {item.notes.map((note, i) => (
                                <CardText className="fs-sm mb-1" key={`${idx}-${i}`}>{note}</CardText>
                            ))}
                        </div>
                    </Stack>
                </CardBody>
            ))}
        </Card>
    );
};

export default NewsHighlights;
