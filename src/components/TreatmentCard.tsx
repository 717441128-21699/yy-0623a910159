import { Flower2, Scissors, CircleDot, Grid3x3, ShieldCheck, Sparkles, Crown, HeartPulse, Check } from 'lucide-react';
import type { TreatmentItem } from '@/types';

const ICON_MAP: Record<string, typeof Flower2> = {
  Flower2, Scissors, CircleDot, Grid3x3, ShieldCheck, Sparkles, Crown, HeartPulse,
};

interface Props {
  item: TreatmentItem;
  selected: boolean;
  onClick: () => void;
}

export default function TreatmentCard({ item, selected, onClick }: Props) {
  const Icon = ICON_MAP[item.icon] ?? Flower2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left w-full p-4 rounded-xl border-2 transition-all duration-300 animate-fade-in ${
        selected
          ? 'border-primary-400 bg-primary-50/80 shadow-card-hover -translate-y-0.5'
          : 'border-gray-100 bg-white hover:border-primary-200 hover:bg-gray-50 hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md animate-scale-in">
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 transition-colors duration-300 ${
        selected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600'
      }`}>
        <Icon size={22} />
      </div>

      <h4 className={`font-semibold mb-1 transition-colors ${selected ? 'text-primary-700' : 'text-gray-800'}`}>
        {item.name}
      </h4>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
      <p className="mt-2 text-[11px] text-primary-500 font-medium">
        参考费用：{item.defaultFee.split('（')[0]}
      </p>
    </button>
  );
}
