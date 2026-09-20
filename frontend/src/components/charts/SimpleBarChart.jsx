import React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

const ChartTooltip = ({ active, payload, label, valueSuffix }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
            <p className="font-medium text-popover-foreground">{label}</p>
            <p className="text-muted-foreground">{payload[0].value} {valueSuffix}</p>
        </div>
    )
}

// Single-measure "compare magnitude" bar chart - one series, one hue (sequential
// default blue), never a rainbow per bar (dataviz skill anti-patterns: a value
// ramp on nominal/ordinal categories double-encodes and burns the color channel
// on nothing). highlightIndex optionally emphasises one bar (e.g. "today").
const SimpleBarChart = ({ data, xKey, yKey, valueSuffix = "", height = 220, highlightIndex }) => (
    <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltip valueSuffix={valueSuffix} />} />
            <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((_, index) => {
                    const isEmphasis = highlightIndex !== undefined
                    const fill = !isEmphasis ? "var(--chart-1)" : index === highlightIndex ? "var(--chart-1)" : "var(--chart-track)"
                    return <Cell key={index} fill={fill} />
                })}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
)

export default SimpleBarChart
