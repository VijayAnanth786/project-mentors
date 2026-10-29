import React from 'react';

interface DonutProgressProps {
  percentage: number;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export const DonutProgress: React.FC<DonutProgressProps> = ({
  percentage,
  completed,
  inProgress,
  pending,
  total
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm mb-6">
        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        <h3 className="text-base font-bold text-slate-900">My Progress</h3>
      </div>

      <div className="flex items-center justify-between">
        {/* Circular SVG Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
            {/* Background Circle */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              className="stroke-emerald-500 transition-all duration-1000 ease-out"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900">{percentage}%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 pl-4 flex-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Completed</span>
            </div>
            <span className="font-bold text-slate-800">{completed} / {total}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600 font-medium">In Progress</span>
            </div>
            <span className="font-bold text-slate-800">{inProgress} / {total}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-600 font-medium">Pending</span>
            </div>
            <span className="font-bold text-slate-800">{pending} / {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
