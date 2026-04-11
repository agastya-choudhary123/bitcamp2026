import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface WaveformChartProps {
  dataPoints: number[];
  width: number;
  height: number;
}

export default function WaveformChart({ dataPoints, width, height }: WaveformChartProps) {
  if (!dataPoints || dataPoints.length < 2) return <View />;

  const minVal = 0.1;
  const maxVal = 0.5;
  const range = maxVal - minVal;

  const toX = (i: number) => (i / (dataPoints.length - 1)) * width;
  const toY = (v: number) => height - ((v - minVal) / range) * height;

  // Build SVG path with cubic bezier smoothing
  let d = `M ${toX(0)} ${toY(dataPoints[0])}`;
  for (let i = 1; i < dataPoints.length; i++) {
    const x0 = toX(i - 1);
    const x1 = toX(i);
    const y0 = toY(dataPoints[i - 1]);
    const y1 = toY(dataPoints[i]);
    const cpX = (x0 + x1) / 2;
    d += ` C ${cpX} ${y0}, ${cpX} ${y1}, ${x1} ${y1}`;
  }

  // Fill path (close at bottom)
  const fillD = `${d} L ${toX(dataPoints.length - 1)} ${height} L ${toX(0)} ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#6d5ef7" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#6d5ef7" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Fill */}
      <Path d={fillD} fill="url(#fill)" />
      {/* Line */}
      <Path d={d} fill="none" stroke="#6d5ef7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
