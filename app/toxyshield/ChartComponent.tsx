"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useWebSocket } from "../../hooks/useWebSocket";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TOPICS = [
  "breath/EC64C984B1FC",
  "breath/EC64C984E8B0",
  "EC64C984E8",
  "EC64C984B1",
];

const Gates: Record<string, string> = {
  EC64C984B1FC: "Gate 2",
  EC64C984E8B0: "Gate 3",
  EC64C984E8: "Gate 3",
  EC64C984B1: "Gate 4",
};

const THRESHOLD = 2800;

export default function ChartComponent() {
  const { deviceData, chartData, isConnected } = useWebSocket();

  const createChartData = (
    labels: string[],
    values: number[],

  ) => ({
    labels,
    datasets: [
      {
        label: `Alcohol Level`,
        data: values,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.3,
      },
    ],
  });


  return (
    <>
      <section className="bg-[#003a7a] w-full h-full">
        <div className="relative flex items-center h-20">
          <div className="absolute left-0 pl-4">
            <div className="bg-white/15 backdrop-blur-md rounded-full shadow-lg  flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img
                src="/GMR.webp"
                alt="Clino Logo"
                className="w-20 h-auto object-contain"
              />
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center space-x-4">
            <div className="bg-white backdrop-blur-md p-3 rounded-full shadow-md flex items-center">
              <span className="text-[#003a7a] text-3xl font-bold">Toxi</span>
              <span className="text-orange-500 text-3xl font-bold">Shi</span>
              <span className="text-yellow-400 text-3xl font-bold">eld-</span>
              <span className="text-[#003a7a] text-3xl font-bold">X</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOPICS.map((topic) => {
            const data = deviceData[topic];
            const chart = chartData[topic];
            // console.log(data,"data",chart,"chart");

            if (!data || !chart) {
              return (
                <div
                  key={topic}
                  className="border rounded-lg p-4 shadow bg-white flex flex-col items-center justify-center h-[380px]"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {topic.replace("breath/", "")}
                  </h3>
                  <p className="text-gray-500">Waiting for data...</p>
                </div>
              );
            }

            return (
              <div
                key={topic}
                className="border rounded-lg p-4 shadow bg-white"
              >
                <h3 className="text-lg font-semibold mb-2">
                  {Gates[data.MAC] || "Unknown Gate"}
                </h3>

                <div style={{ height: 300 }} className="mb-4">
                  <Line data={createChartData(chart?.labels, chart?.values)} />
                </div>

                <div
                  className={`p-4 rounded mb-2 ${
                    data.alc_val > THRESHOLD
                      ? "bg-red-100 text-orange-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  <p>
                    <strong>Alcohol Value:</strong> {data.Index}
                  </p>
                  <p>
                    <strong>Status:</strong> {data.Alert}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="fixed z-[20] md:bottom-2 bottom-28 right-2 transition-all">
        <div className="flex items-center bg-white  gap-3 px-4 py-2 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-xl hover:scale-105 transition-transform duration-300">
          <span className="text-black text-sm md:text-base font-medium">
            Powered by
          </span>
          <img
            src="/Gmr/clino.png"
            alt="Clino Logo"
            className="w-28 h-auto object-contain"
          />
        </div>
      </div>
    </>
  );
}