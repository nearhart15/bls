/*
 * News highlights — refined presentation © 2026
 */
import {type FC, useCallback} from "react";
import moment from "moment";

import {Card, CardBody, CardHeader, CardText, CardTitle, Stack} from "react-bootstrap";

import {compareMoments} from "../../../data/utils/utils";
import {NEWS_CACHE_CATEGORY, newsFetcher} from "../../../data/news/news-api";
import type {News} from "../../../data/news/news-items";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";

const NewsHighlights : FC = () => {
    const fetcher = useCallback(newsFetcher, []);
    const { data, isLoading, error } = useCachedFetcher<News>(fetcher, NEWS_CACHE_CATEGORY);

    const twoWeeksBack = moment().subtract(import.meta.env.VITE_NEWS_EXPIRED_AFTER_DAYS, 'd');

    return (<>
        <Card className="mb-0">
            <CardHeader>Recent Highlights</CardHeader>
            {isLoading && <CardBody><Loader /></CardBody>}
            {(error != null) && <ErrorDisplay message="Error loading news highlights." error={error} />}
            {data?.newsItems.filter(ni => ni.date.isSameOrAfter(twoWeeksBack))
                .sort((a, b) => compareMoments(a.date, b.date))
                .map((ni, idx) =>
                <CardBody className="bls-news-item" key={"news-" + idx.toString()}>
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                        <div className="bls-news-date">{ni.date.format("DD MMM")}</div>
                        <div className="flex-grow-1">
                            <CardTitle as="h6" className="mb-1">{ni.title}</CardTitle>
                            <CardText className="fs-sm mb-0 text-body-secondary">{ni.text}</CardText>
                        </div>
                    </Stack>
                </CardBody>
            )}
        </Card>
    </>);
}

export default NewsHighlights;
