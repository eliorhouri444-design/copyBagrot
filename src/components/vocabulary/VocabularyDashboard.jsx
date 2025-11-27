import React from 'react';
import { BookOpen, AlertTriangle, Target, TrendingUp, CheckCircle } from 'lucide-react';

export default function VocabularyDashboard({ stats }) {
  const {
    totalWords = 0,
    learnedWords = 0,
    weakWords = 0,
    activeErrors = 0,
    accuracy = 0,
    readiness = 0
  } = stats || {};

  const statItems = [
    {
      label: 'מילים שנלמדו',
      value: learnedWords,
      subtext: `מתוך ${totalWords}`,
      icon: BookOpen,
      color: 'blue'
    },
    {
      label: 'מילים חלשות',
      value: weakWords,
      subtext: 'צריכות חיזוק',
      icon: AlertTriangle,
      color: 'orange'
    },
    {
      label: 'דיוק',
      value: `${accuracy}%`,
      subtext: 'ממוצע',
      icon: Target,
      color: 'green'
    },
    {
      label: 'טעויות פעילות',
      value: activeErrors,
      subtext: 'לתרגול',
      icon: AlertTriangle,
      color: 'red'
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' }
  };

  return (
    <div className="space-y-4">
      {/* Readiness Score */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">מוכנות אוצר מילים</h3>
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={readiness >= 70 ? '#22C55E' : readiness >= 40 ? '#F59E0B' : '#EF4444'}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${readiness}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{readiness}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">
              {readiness >= 70 ? 'רמה טובה!' : readiness >= 40 ? 'צריך שיפור' : 'דורש תרגול אינטנסיבי'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${readiness >= 70 ? 'bg-green-500' : readiness >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${readiness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          const colors = colorClasses[item.color];
          return (
            <div key={idx} className={`${colors.bg} rounded-xl p-4 border border-gray-100`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${colors.text}`}>{item.value}</div>
              <div className="text-xs text-gray-600">{item.label}</div>
              <div className="text-xs text-gray-500">{item.subtext}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}