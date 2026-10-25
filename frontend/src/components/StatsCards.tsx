import React from 'react';
import { DashboardStats } from '../types';
import { Clock, Send, ShieldCheck, Zap } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const scheduledCount = stats?.totals.scheduled ?? 0;
  const sentCount = stats?.totals.sent ?? 0;
  const total = stats?.totals.total ?? 0;
  const deliveryRate = total > 0 ? Math.round((sentCount / total) * 100) : 100;
  const activeJobs = stats?.queue.active ?? 0;
  const delayedJobs = stats?.queue.delayed ?? 0;
  const waitingJobs = stats?.queue.waiting ?? 0;
  const sendersCount = stats?.sendersTelemetry.length ?? 0;

  const cards = [
    {
      title: 'Scheduled Emails',
      value: scheduledCount,
      subtext: `${delayedJobs} delayed in BullMQ queue`,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/10 to-amber-500/0 border-amber-500/20',
      badge: `${waitingJobs + delayedJobs} in pipeline`,
    },
    {
      title: 'Sent Successfully',
      value: sentCount,
      subtext: 'Delivered via Ethereal SMTP',
      icon: <Send className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20',
      badge: `${deliveryRate}% success`,
    },
    {
      title: 'Active BullMQ Workers',
      value: `${activeJobs} Active`,
      subtext: `Safe concurrent workers`,
      icon: <Zap className="w-5 h-5 text-brand-400" />,
      color: 'from-brand-500/10 to-brand-500/0 border-brand-500/20',
      badge: 'Persistence Enabled',
    },
    {
      title: 'Senders & Rate Limits',
      value: `${sendersCount} Senders`,
      subtext: 'Redis sliding hour windows',
      icon: <ShieldCheck className="w-5 h-5 text-indigo-400" />,
      color: 'from-indigo-500/10 to-indigo-500/0 border-indigo-500/20',
      badge: stats?.elasticsearch.isAvailable ? 'Elasticsearch ON' : 'DB Search ON',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`glass-panel glass-panel-hover p-4 sm:p-5 rounded-2xl border bg-gradient-to-b ${card.color} relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">{card.title}</span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">{card.icon}</div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {card.value}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {card.badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
};
