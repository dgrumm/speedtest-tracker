import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register the necessary components with Chart.js
ChartJS.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const SpeedTestChart = ({ data }) => {
  const speedChartRef = useRef(null);
  const pingChartRef = useRef(null);

  useEffect(() => {
    const speedChartInstance = speedChartRef.current;
    const pingChartInstance = pingChartRef.current;

    return () => {
      if (speedChartInstance) {
        speedChartInstance.destroy();
      }
      if (pingChartInstance) {
        pingChartInstance.destroy();
      }
    };
  }, [data]);

  const speedChartData = {
    labels: data.map(result => new Date(result.timestamp).toLocaleString()),
    datasets: [
      {
        label: 'Download Speed',
        data: data.map(result => result.download),
        fill: false,
        borderColor: 'rgba(75,192,192,1)',
      },
      {
        label: 'Upload Speed',
        data: data.map(result => result.upload),
        fill: false,
        borderColor: 'rgba(153,102,255,1)',
      },
    ],
  };

  const pingChartData = {
    labels: data.map(result => new Date(result.timestamp).toLocaleString()),
    datasets: [
      {
        label: 'Ping',
        data: data.map(result => result.ping),
        fill: false,
        borderColor: 'rgba(255,99,132,1)',
      },
    ],
  };

  return (
    <div>
      <h2>Speed Test Results</h2>
      <Line data={speedChartData} ref={speedChartRef} />
      <h2>Ping Results</h2>
      <Line data={pingChartData} ref={pingChartRef} />
    </div>
  );
};

export default SpeedTestChart;
