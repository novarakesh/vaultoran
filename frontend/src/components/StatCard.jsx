import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-slate-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-slate-200',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-slate-200',
    },
    sky: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      border: 'border-slate-200',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-slate-200',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${scheme.bg} ${scheme.text} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
