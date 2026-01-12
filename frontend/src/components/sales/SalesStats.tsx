import { Building2, Users, Zap, CheckCircle } from 'lucide-react';
import type { Company } from '../../lib/api';

interface SalesStatsProps {
  companies: Company[];
  totalSignals: number;
  totalContacts: number;
}

export function SalesStats({ companies, totalSignals, totalContacts }: SalesStatsProps) {
  const enrichedCount = companies.filter(c => c.apollo_id).length;

  const stats = [
    {
      label: 'Companies',
      value: companies.length,
      icon: Building2,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
      iconBorder: 'border-accent/30',
      shadow: 'shadow-pop',
    },
    {
      label: 'Job Signals',
      value: totalSignals,
      icon: Zap,
      iconColor: 'text-tertiary',
      iconBg: 'bg-tertiary/10',
      iconBorder: 'border-tertiary/30',
      shadow: 'shadow-pop-soft',
    },
    {
      label: 'Contacts',
      value: totalContacts,
      icon: Users,
      iconColor: 'text-quaternary',
      iconBg: 'bg-quaternary/10',
      iconBorder: 'border-quaternary/30',
      shadow: 'shadow-pop-pink',
    },
    {
      label: 'Enriched',
      value: enrichedCount,
      icon: CheckCircle,
      iconColor: 'text-secondary',
      iconBg: 'bg-secondary/10',
      iconBorder: 'border-secondary/30',
      shadow: 'shadow-pop',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`bg-card border-2 border-foreground rounded-xl ${stat.shadow} p-6 hover:animate-wiggle transition-all group`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 ${stat.iconBg} rounded-full flex items-center justify-center border-2 ${stat.iconBorder} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className="text-4xl font-heading font-extrabold text-foreground tracking-tight">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-sm font-body text-mutedForeground font-semibold uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
