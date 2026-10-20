import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-600 dark:text-rose-400',
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-950/50',
      text: 'text-sky-600 dark:text-sky-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      text: 'text-purple-600 dark:text-purple-400',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white dark:bg-[#141414] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs transition hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-400 font-bold">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-neutral-50 mt-1 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 font-medium">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${scheme.bg} ${scheme.text} flex items-center justify-center shadow-2xs`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
