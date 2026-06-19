import type { ConsentStatus } from '@/types';

const CONFIG: Record<ConsentStatus, { label: string; bg: string; text: string; dot: string; stripe: string }> = {
  pending: {
    label: '待签署',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-status-pending',
    stripe: 'bg-status-pending',
  },
  signed: {
    label: '已签署',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-status-signed',
    stripe: 'bg-status-signed',
  },
  resign: {
    label: '需补签',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-status-resign',
    stripe: 'bg-status-resign',
  },
};

interface Props {
  status: ConsentStatus;
  variant?: 'badge' | 'stripe';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, variant = 'badge', size = 'sm' }: Props) {
  const cfg = CONFIG[status];
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (variant === 'stripe') {
    return (
      <div className={`flex items-center gap-2 ${cfg.bg} ${cfg.text} ${padding} rounded-r-lg border-l-4 ${textSize} font-medium`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.text} ${padding} rounded-md ${textSize} font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}
