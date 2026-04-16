"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  labels: string[];
  title?: string;
}

export function RadarChart({ labels, title = "Power Map" }: RadarChartProps) {
  // Ensure we have exactly 4 or 5 labels for a good radar look
  const displayLabels = labels.slice(0, 5);
  
  const data: ChartData<"radar"> = {
    labels: displayLabels,
    datasets: [
      {
        label: "Strength Presence",
        data: displayLabels.map(() => 80), // Fixed normalized value as requested
        backgroundColor: "rgba(52, 211, 235, 0.2)",
        borderColor: "rgba(52, 211, 235, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(52, 211, 235, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(52, 211, 235, 1)",
      },
    ],
  };

  const options: ChartOptions<"radar"> = {
    scales: {
      r: {
        angleLines: {
          display: true,
          color: "rgba(255, 255, 255, 0.1)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          display: false,
          stepSize: 20,
        },
        pointLabels: {
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
            weight: "bold",
            family: "Inter, system-ui, sans-serif",
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="relative h-[300px] w-full">
      <Radar data={data} options={options} />
    </div>
  );
}
