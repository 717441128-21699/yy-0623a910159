import { AlertTriangle, GitBranch, Syringe, Bandage, PenLine, Check } from 'lucide-react';
import type { SignStep, SignStepKey } from '@/types';

const STEPS: SignStep[] = [
  { key: 'risk', title: '风险告知', icon: 'AlertTriangle' },
  { key: 'alternatives', title: '替代方案', icon: 'GitBranch' },
  { key: 'anesthesia', title: '麻醉说明', icon: 'Syringe' },
  { key: 'postOperative', title: '术后注意', icon: 'Bandage' },
  { key: 'signature', title: '签名确认', icon: 'PenLine' },
];

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle, GitBranch, Syringe, Bandage, PenLine,
};

interface Props {
  current: SignStepKey;
  completed: Record<SignStepKey, boolean>;
}

export default function StepIndicator({ current, completed }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="w-full">
      <ol className="flex items-center w-full">
        {STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] ?? AlertTriangle;
          const isDone = completed[step.key] || idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          const showConnector = idx < STEPS.length - 1;

          return (
            <li key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? 'bg-status-signed border-status-signed text-white shadow-md shadow-green-200'
                      : isCurrent
                      ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-200 scale-110'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {isDone ? (
                    <Check size={20} strokeWidth={3} className="animate-checkmark" style={{ strokeDasharray: 48 }} />
                  ) : (
                    <Icon size={20} strokeWidth={2} />
                  )}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full border-2 border-primary-400 animate-ping opacity-40" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    isDone || isCurrent ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {showConnector && (
                <div className="mx-2 flex-1 h-[2px] mt-[-22px] rounded-full overflow-hidden bg-gray-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isPast ? 'w-full bg-status-signed' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
