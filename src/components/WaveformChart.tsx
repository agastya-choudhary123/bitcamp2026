import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface WaveformChartProps {
  dataPoints: number[];
}

const WaveformChart: React.FC<WaveformChartProps> = ({ dataPoints }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0.1,
        max: 0.5,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(148, 163, 184, 0.5)', font: { size: 10 } },
      },
      x: {
        display: false,
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 0 },
    },
    animation: { duration: 0 } as const,
  };

  const data = {
    labels: dataPoints.map((_, i) => i.toString()),
    datasets: [
      {
        fill: true,
        label: 'EAR Score',
        data: dataPoints,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
      },
    ],
  };

  return (
    <div className="w-full h-full min-h-[200px]">
      <Line options={options} data={data} />
    </div>
  );
};

export default WaveformChart;
