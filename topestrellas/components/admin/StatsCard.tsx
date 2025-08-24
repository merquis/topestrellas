'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor: string;
  iconBgColor: string;
}

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  bgColor, 
  iconBgColor 
}: StatsCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`${iconBgColor} w-14 h-14 rounded-lg flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
