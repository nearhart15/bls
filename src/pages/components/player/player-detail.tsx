/*
 * Player profile — sports dashboard layout (radar, switcher, KPI rings) © 2026
 */

import {type FC, useEffect, useState} from "react";
import {Link} from "react-router";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
import {Card, CardBody} from "react-bootstrap";

import type {
    AggregatedPlayerData,
    PlayerLeagueAppearance,
} from "../../../data/player/player-aggregate";
import type {PlayerStats} from "../../../data/player/player-stats";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";
import {
    AppearancesPanel,
    SeasonBreakdownTable,
    PlayerSwitcher,
} from "./player-detail-tables";
import {AllStatsPanel} from "./player-all-stats";
