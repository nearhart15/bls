/*
 * News / shout-outs highlights © 2026
 */
import {type FC, useCallback, useMemo} from "react";
import moment from "moment";
import {Badge, Card, CardBody, CardHeader, CardText, CardTitle, Stack} from "react-bootstrap";
import {MegaphoneFill} from "react-bootstrap-icons";

import {compareMoments} from "../../../data/utils/utils";
import {NEWS_CACHE_CATEGORY, newsFetcher} from "../../../data/news/news-api";
import type {News} from "../../../data/news/news-items";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";

interface NewsHighlightsProps {
    shoutOuts?: boolean;
}

const NewsHighlights: FC<NewsHighlightsProps> = ({shoutOuts = false}) => {
    const fetcher = useCallback(newsFetcher, []);
    const {data, isLoading, error} = useCachedFetcher<News>(fetcher, NEWS_CACHE_CATEGORY);

    const expiredDays = Number(import.meta.env.VITE_NEWS_EXPIRED_AFTER_DAYS) || 14;
    const windowDays = shoutOuts ? Math.max(expiredDays, 90) : expiredDays;
    const cutoff = useMemo(() => moment().subtract(windowDays, "d"), [windowDays]);

    const items = useMemo(() => {
        if (!data?.newsItems) return [];
        return data.newsItems
            .filter((ni) => ni.date.isSameOrAfter(cutoff))
            .sort((a, b) => compareMoments(a.date, b.date));
    }, [data, cutoff]);

    const title = shoutOuts ? "Shout outs" : "Recent Highlights";

    return (
        <Card className={`mb-0${shoutOuts ? " bls-shoutouts" : ""}`}>
            <CardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <span className="d-flex align-items-center gap-2">
                    {shoutOuts && <MegaphoneFill className="text-warning" />}
                    {title}
                </span>
                {shoutOuts && items.length > 0 && (
                    <Badge bg="warning" text="dark" pill>
                        {items.length} recent
                    </Badge>
                )}
            </CardHeader>
            {isLoading && (
                <CardBody>
                    <Loader />
                </CardBody>
            )}
            {error != null && (
                <ErrorDisplay message="Error loading shout outs." error={error} />
            )}
            {!isLoading && !error && items.length === 0 && (
                <CardBody className="text-body-secondary fs-sm">
                    No recent shout outs — check back after the next strong series.
                </CardBody>
            )}
            {items.map((ni, idx) => (
                <CardBody className="bls-news-item" key={"news-" + idx.toString()}>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                        <div className="bls-news-date">{ni.date.format("DD MMM")}</div>
                        <div className="flex-grow-1 min-w-0">
                            <CardTitle as="h6" className="mb-1">
                                {ni.title}
                            </CardTitle>
                            <CardText className="fs-sm mb-0 text-body-secondary">{ni.text}</CardText>
                        </div>
                    </Stack>
                </CardBody>
            ))}
        </Card>
    );
};

export default NewsHighlights;
