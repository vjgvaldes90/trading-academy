"use client"

import {
    createChart,
    ColorType,
    IChartApi,
    UTCTimestamp
} from "lightweight-charts"
import { useEffect, useRef } from "react"

export default function TradingChart() {

    const chartRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {

        if (!chartRef.current) return

        const chart: IChartApi = createChart(chartRef.current, {
            width: chartRef.current.clientWidth,
            height: 500,

            layout: {
                background: { type: ColorType.Solid, color: "#000000" },
                textColor: "#9ca3af",
            },

            grid: {
                vertLines: { color: "rgba(255,255,255,0.05)" },
                horzLines: { color: "rgba(255,255,255,0.05)" },
            },

            rightPriceScale: {
                borderVisible: false,
            },

            timeScale: {
                borderVisible: false,
            },
        })

        const candleSeries = chart.addCandlestickSeries()
        const volumeSeries = chart.addHistogramSeries({
            priceFormat: { type: "volume" },
            priceScaleId: "",
        })

        // ✅ timestamp base correcto
        const start = Math.floor(Date.now() / 1000) as UTCTimestamp

        const data = [
            { time: start, open: 100, high: 110, low: 95, close: 105, volume: 120 },
            { time: (start + 60) as UTCTimestamp, open: 105, high: 115, low: 100, close: 112, volume: 200 },
            { time: (start + 120) as UTCTimestamp, open: 112, high: 120, low: 108, close: 118, volume: 150 },
            { time: (start + 180) as UTCTimestamp, open: 118, high: 125, low: 110, close: 121, volume: 220 },
            { time: (start + 240) as UTCTimestamp, open: 121, high: 130, low: 115, close: 128, volume: 300 },
        ]

        candleSeries.setData(data)

        volumeSeries.setData(
            data.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close > d.open ? "#22c55e" : "#ef4444"
            }))
        )

        // ✅ animación segura
        let lastTime = data[data.length - 1].time

        const interval = setInterval(() => {

            const last = data[data.length - 1]

            lastTime = (lastTime + 60) as UTCTimestamp

            const newCandle = {
                time: lastTime,
                open: last.close,
                high: last.close + Math.random() * 10,
                low: last.close - Math.random() * 10,
                close: last.close + (Math.random() - 0.5) * 10,
                volume: Math.random() * 300
            }

            data.push(newCandle)

            candleSeries.update(newCandle)

            volumeSeries.update({
                time: newCandle.time,
                value: newCandle.volume,
                color: newCandle.close > newCandle.open ? "#22c55e" : "#ef4444"
            })

        }, 2000)

        const resizeObserver = new ResizeObserver(entries => {
            const { width } = entries[0].contentRect
            chart.applyOptions({ width })
        })

        resizeObserver.observe(chartRef.current)

        return () => {
            clearInterval(interval)
            resizeObserver.disconnect()
            chart.remove()
        }

    }, [])

    return (
        <div
            ref={chartRef}
            className="w-full h-[500px]"
        />
    )
}