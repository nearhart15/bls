import ApexChart from "react-apexcharts";
import type {ComponentProps} from "react";
import type {ApexOptions} from "apexcharts";

export const escapeChartText = (value: string): string => value.replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]!));

/** Apex owns HTML sinks. Encode data labels and replace its HTML legend/tooltip. */
export default function SafeChart(props: ComponentProps<typeof ApexChart>) {
    const original = props.series ?? [];
    const series = original.map((s, i) => typeof s === "number" ? s : {...s, name: "Series " + (i + 1), data: s.data.map(point => typeof point === "object" && point !== null && !Array.isArray(point) && "x" in point && typeof point.x === "string" ? {...point, x: escapeChartText(point.x)} : point)}) as typeof original;
    const source = props.options ?? {};
    const options: ApexOptions = {...source,
        ...(source.labels ? {labels: source.labels.map(escapeChartText)} : {}),
        ...(source.xaxis ? {xaxis: {...source.xaxis, ...(source.xaxis.categories ? {categories: source.xaxis.categories.map((v: unknown) => typeof v === "string" ? escapeChartText(v) : typeof v === "number" ? v : "")} : {})}} : {}),
        legend: {...source.legend, show: false},
        tooltip: {...source.tooltip, custom: ({series: values, seriesIndex, dataPointIndex}: {series: number[][]; seriesIndex: number; dataPointIndex: number}) => {
            const node = document.createElement("div");
            node.style.padding = "8px";
            const item = original[seriesIndex];
            const name = typeof item === "object" ? item.name : source.labels?.[seriesIndex];
            const category: unknown = source.xaxis?.categories?.[dataPointIndex];
            node.textContent = [name, typeof category === "string" || typeof category === "number" ? category : null, values[seriesIndex]?.[dataPointIndex]].filter(v => v != null).join(" · ");
            return node;
        }},
    };
    return <><ApexChart {...props} options={options} series={series}/>{source.legend?.show !== false && original.length > 1 && <div className="d-flex justify-content-center gap-3 flex-wrap" aria-label="Chart legend">{original.map((item, i) => <span key={i} style={{color: typeof source.colors?.[i] === "string" ? source.colors[i] : undefined}}>{typeof item === "object" ? item.name : source.labels?.[i]}</span>)}</div>}</>;
}
