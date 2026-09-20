import React from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
        <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
                <span className="font-medium text-popover-foreground">{item.name}</span>
            </div>
            <p className="text-muted-foreground">{item.value} ({Math.round(item.payload.percent)}%)</p>
        </div>
    )
}

// Part-to-whole at a glance, <= 6 segments (dataviz skill). Never used for
// comparing two close values - see Meter.jsx for that job instead.
const DonutChart = ({ data, centerLabel, centerValue, height = 200 }) => {
    // recharts renders a degenerate/invisible ring when a Pie's data includes
    // zero-value slices alongside non-zero ones (their 0-angle paths interfere
    // with the real sectors) - filtering them out is the reliable fix, and the
    // legend below still lists every possible category at 0 via `allEntries`.
    const nonZero = data.filter((d) => d.value > 0)
    const total = data.reduce((sum, d) => sum + d.value, 0)
    const withPercent = nonZero.map((d) => ({ ...d, percent: total > 0 ? (d.value / total) * 100 : 0 }))

    if (total === 0) {
        return (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
                No data yet
            </div>
        )
    }

    return (
        <div>
            <div className="relative" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={withPercent}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="62%"
                            outerRadius="90%"
                            paddingAngle={2}
                            stroke="var(--card)"
                            strokeWidth={2}
                            isAnimationActive
                        >
                            {withPercent.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                {centerValue !== undefined && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold text-foreground">{centerValue}</span>
                        {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
                    </div>
                )}
            </div>
            {/* Legend - lists every category (including zero), text stays in ink
                tokens, the swatch alone carries the series color */}
            <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {data.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-foreground">{entry.name}</span>
                        <span>{entry.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default DonutChart
