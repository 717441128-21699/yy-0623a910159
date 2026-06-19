import { AlertTriangle, GitBranch, Syringe, Bandage, User, Hash, MapPin, DollarSign } from 'lucide-react';
import type { ConsentTemplateContent, Patient, TreatmentItem } from '@/types';
import { getTemplateByCode } from '@/data/consentTemplates';

interface Props {
  patient: Patient;
  item: TreatmentItem | null;
  toothPosition: string;
  feeDescription: string;
  compact?: boolean;
  template?: ConsentTemplateContent | null;
  showId?: string;
}

export default function ConsentPreview({
  patient, item, toothPosition, feeDescription,
  compact = false, template: templateProp, showId,
}: Props) {
  const template = templateProp ?? (item ? getTemplateByCode(item.code) : null);

  return (
    <div className={`${compact ? '' : 'paper-a4 animate-scale-in'} bg-white`} style={compact ? {} : undefined}>
      {!compact && (
        <div className="text-center border-b border-gray-200 pb-4 mb-6">
          <div className="text-xs text-gray-400 tracking-widest mb-1">YAKANG DENTAL CLINIC</div>
          <h1 className="text-2xl font-bold text-gray-800">
            {template ? template.title : '请选择就诊项目'}
          </h1>
          <div className="mt-2 text-xs text-gray-500">
            编号：DIC-{new Date().getFullYear()}-{showId ?? String(Math.floor(Math.random() * 90000) + 10000)}
          </div>
        </div>
      )}

      {compact && template && (
        <div className="text-center mb-5 pb-3 border-b border-gray-200">
          <h2 className="text-xl font-bold text-primary-700">{template.title}</h2>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <User size={15} className="text-primary-500" />
          患者基本信息
        </h3>
        <div className={`grid gap-x-6 gap-y-2 text-sm ${compact ? 'grid-cols-2' : 'grid-cols-2'}`}>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20">患者姓名：</span>
            <span className={`font-medium ${patient.name ? 'text-primary-600' : 'text-gray-300'}`}>
              {patient.name || '____________'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20">性别 / 年龄：</span>
            <span className={`font-medium ${patient.gender && patient.age ? 'text-primary-600' : 'text-gray-300'}`}>
              {patient.gender && patient.age ? `${patient.gender} / ${patient.age} 岁` : '____________'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20"><Hash size={12} className="inline mr-1" />病历号：</span>
            <span className={`font-medium ${patient.medicalRecordNo ? 'text-primary-600' : 'text-gray-300'}`}>
              {patient.medicalRecordNo || '____________'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20">联系电话：</span>
            <span className={`font-medium ${patient.phone ? 'text-primary-600' : 'text-gray-300'}`}>
              {patient.phone || '____________'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20"><MapPin size={12} className="inline mr-1" />治疗牙位：</span>
            <span className={`font-medium ${toothPosition ? 'text-primary-600' : 'text-gray-300'}`}>
              {toothPosition || '____________'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-20"><DollarSign size={12} className="inline mr-1" />费用说明：</span>
            <span className={`font-medium ${feeDescription ? 'text-primary-600' : 'text-gray-300'}`}>
              {feeDescription || '____________'}
            </span>
          </div>
        </div>
      </div>

      {template ? (
        <div className="space-y-5">
          <Section icon={<AlertTriangle size={16} className="text-status-resign" />} title="一、治疗风险告知" items={template.riskNotice} compact={compact} />
          <Section icon={<GitBranch size={16} className="text-primary-500" />} title="二、替代治疗方案" items={template.alternatives} compact={compact} />
          <Section icon={<Syringe size={16} className="text-accent-500" />} title="三、麻醉方式与说明" items={template.anesthesiaNote} compact={compact} />
          <Section icon={<Bandage size={16} className="text-status-signed" />} title="四、术后注意事项" items={template.postOperative} compact={compact} />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4 opacity-40">📋</div>
          <p>请选择就诊项目以加载对应知情同意书模板</p>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, items, compact }: { icon: React.ReactNode; title: string; items: string[]; compact: boolean }) {
  return (
    <section>
      <h3 className={`font-semibold text-gray-800 mb-2 flex items-center gap-2 ${compact ? 'text-base' : 'text-[15px]'}`}>
        {icon}
        {title}
      </h3>
      <ol className="space-y-1.5 pl-5 list-decimal marker:text-gray-400">
        {items.map((it, i) => (
          <li key={i} className={`text-gray-700 leading-relaxed ${compact ? 'text-sm' : 'text-[14px]'}`}>
            {it}
          </li>
        ))}
      </ol>
    </section>
  );
}
