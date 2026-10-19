import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'cyan' }) => {
  const colorMap = {
    cyan: {
      bg: 'bg-cyber-cyan/10',
      text: 'text-cyber-cyan',
      border: 'border-cyber-cyan/20',
      glow: 'shadow-glow-cyan',
    },
    emerald: {
      bg: 'bg-cyber-emerald/10',
      text: 'text-cyber-emerald',
      border: 'border-cyber-emerald/20',
      glow: 'shadow-glow-emerald',
    },
    rose: {
      bg: 'bg-cyber-rose/10',
      text: 'text-cyber-rose',
      border: 'border-cyber-rose/20',
      glow: 'shadow-glow-rose',
    },
    purple: {
      bg: 'bg-cyber-purple/10',
      text: 'text-cyber-purple',
      border: 'border-cyber-purple/20',
      glow: '',
    },
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`glass-panel p-5 rounded-2xl border ${scheme.border} relative overflow-hidden transition hover:border-opacity-50`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-2xl font-extrabold text-white mt-1 tracking-tight">{value}</p>
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
