import React, { FC } from "react";
import { ParentSizeModern } from "@visx/responsive";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar } from "@visx/shape";
import { useTooltipInPortal } from "@visx/tooltip";
import { formatNumber } from "@/services/metrics";

interface Datapoint {
  start: number;
  end: number;
  count: number;
}

interface HistogramGraphProps {
  data: Datapoint[];
  userIdType: string;
  height?: number;
  margin?: [number, number, number, number];
}

const HistogramGraph: FC<HistogramGraphProps> = ({
  data,
  userIdType,
  height = 220,
  margin = [15, 15, 30, 80],
}: HistogramGraphProps) => {
  const { containerRef, containerBounds } = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
  });

  const [marginTop, marginRight, marginBottom, marginLeft] = margin;

  const width = (containerBounds?.width || 0) + marginRight + marginLeft;

  const xMax = width - marginLeft - marginRight;
  const yMax = height - marginTop - marginBottom;
  const xScale = scaleLinear({
    domain: [0, data.length],
    range: [0, xMax],
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(...data.map((d) => d.count))],
    range: [yMax, 0],
  });

  const binWidth = xMax / data.length;

  return (
    <ParentSizeModern style={{ position: "relative" }}>
      {({ width }) => {
        const xMax = width - marginRight - marginLeft;

        return (
          <>
            <div ref={containerRef}></div>
            <svg width={width} height={height}>
              <Group top={marginTop} left={marginLeft}>
                {data.map((d, i) => (
                  <Bar
                    key={`bar-${i}`}
                    x={xScale(i)}
                    y={yScale(d.count)}
                    height={yMax - yScale(d.count)}
                    width={binWidth - 1}
                    fill="#8884d8"
                  />
                ))}
                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  stroke={"var(--text-color-table)"}
                  tickStroke="#333"
                  tickLabelProps={() => ({
                    fill: "var(--text-color-table)",
                    fontSize: 11,
                    textAnchor: "middle",
                  })}
                  numTicks={data.length + 1}
                  tickFormat={(v) => {
                    const i = v as number;
                    return i < data.length
                      ? `${formatNumber(data[i]?.start)}`
                      : `${formatNumber(data[i - 1]?.end)}`;
                  }}
                />
                <AxisLeft
                  scale={yScale}
                  stroke={"var(--text-color-table)"}
                  tickStroke={"var(--text-color-table)"}
                  tickLabelProps={() => ({
                    fill: "var(--text-color-table)",
                    fontSize: 12,
                    textAnchor: "end",
                    dx: -10,
                  })}
                  label={`Count of ${userIdType}`}
                  labelClassName="h5"
                />
              </Group>
            </svg>
          </>
        );
      }}
    </ParentSizeModern>
  );
};

export default HistogramGraph;
