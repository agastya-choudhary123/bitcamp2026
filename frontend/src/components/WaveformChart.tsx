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
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: {
        min: 0,
        max: 0.6,
        ticks: { color: 'rgba(156, 163, 175, 0.5)', stepSize: 0.2 },
        grid: { color: 'rgba(156, 163, 175, 0.05)' },
      },
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
        borderColor: '#005fe7',
        backgroundColor: 'rgba(0, 95, 231, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="w-full h-[120px]">
      <Line options={options} data={data} />
    </div>
  );
};

export default WaveformChart;
