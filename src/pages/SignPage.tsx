import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertTriangle, GitBranch, Syringe, Bandage, ArrowLeft, ArrowRight, CheckCircle, Home, User, FileText, MapPin, DollarSign, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import StepIndicator from '@/components/StepIndicator';
import SignaturePad from '@/components/SignaturePad';
import { useConsentStore } from '@/store/consentStore';
import { resolveTemplate } from '@/data/consentTemplates';
import { formatDate } from '@/utils/date';
import type { SignStepKey } from '@/types';

const STEP_ORDER: SignStepKey[] = ['risk', 'alternatives', 'anesthesia', 'postOperative', 'signature'];

export default function SignPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const record = useConsentStore((s) => s.getRecord(recordId ?? ''));
  const markReading = useConsentStore((s) => s.markReading);
  const markSigned = useConsentStore((s) => s.markSigned);
  const completeResign = useConsentStore((s) => s.completeResign);
  const updateRecord = useConsentStore((s) => s.updateRecord);

  const [currentStep, setCurrentStep] = useState<SignStepKey>('risk');
  const [signature, setSignature] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isResign = record?.status === 'resign';

  const template = useMemo(
    () => (record ? resolveTemplate(record.item.code, record.templateOverride) : null),
    [record],
  );

  const firstSignTime = useMemo(() => {
    if (!record?.signHistory || record.signHistory.length === 0) return null;
    const first = record.signHistory.find((h) => h.type === 'first');
    return first?.signedAt ?? null;
  }, [record]);

  if (!record || !template) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center card p-10 animate-fade-in">
        <div className="text-6xl mb-4">😵</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">未找到该签署记录</h3>
        <p className="text-sm text-gray-500 mb-5">记录可能已被删除或链接无效</p>
        <Link to="/" className="btn-primary inline-flex">
          <Home size={16} />
          返回首页
        </Link>
      </div>
    );
  }

  const completed: Record<SignStepKey, boolean> = {
    risk: record.readings.risk,
    alternatives: record.readings.alternatives,
    anesthesia: record.readings.anesthesia,
    postOperative: record.readings.postOperative,
    signature: !!record.signatureData,
  };

  const idx = STEP_ORDER.indexOf(currentStep);

  function goNext() {
    if (currentStep === 'signature') {
      if (!signature) return;
      if (isResign) {
        completeResign(record.id, signature, '前台');
      } else {
        markSigned(record.id, signature, '前台');
      }
      setShowSuccess(true);
      setTimeout(() => navigate('/records'), 2600);
      return;
    }
    const next = STEP_ORDER[idx + 1];
    if (next) setCurrentStep(next);
  }
  function goPrev() {
    const prev = STEP_ORDER[idx - 1];
    if (prev) setCurrentStep(prev);
  }

  function currentCanNext(): boolean {
    switch (currentStep) {
      case 'risk': return record.readings.risk;
      case 'alternatives': return record.readings.alternatives;
      case 'anesthesia': return record.readings.anesthesia;
      case 'postOperative': return record.readings.postOperative;
      case 'signature': return !!signature;
      default: return false;
    }
  }

  const readingKey = currentStep === 'risk' ? 'risk'
    : currentStep === 'alternatives' ? 'alternatives'
    : currentStep === 'anesthesia' ? 'anesthesia'
    : currentStep === 'postOperative' ? 'postOperative' : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <div className="no-print mb-5 flex items-center justify-between animate-fade-in">
        <Link to="/" className="btn-outline text-xs py-1.5">
          <ArrowLeft size={14} />
          返回患者信息
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 font-medium border border-primary-100">
            请将屏幕交给患者，引导其按步骤阅读并签署
          </span>
        </div>
      </div>

      {isResign && (
        <section className="card p-4 mb-4 animate-fade-in border-l-4 border-l-status-resign bg-status-resign/5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-status-resign/10 flex items-center justify-center text-status-resign">
              <RefreshCw size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-status-resign text-sm">补签签署</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-status-resign/10 text-status-resign font-medium">
                  第 {(record.signHistory?.filter((h) => h.type === 'resign').length ?? 0) + 1} 次补签
                </span>
              </div>
              {record.resignReason && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="text-gray-500">补签原因：</span>
                  <span className="font-medium">{record.resignReason}</span>
                </div>
              )}
              {firstSignTime && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  首次签署时间：{formatDate(firstSignTime, 'full')}
                </div>
              )}
            </div>
            <div className="shrink-0 text-xs text-gray-400 bg-white px-2.5 py-1 rounded-lg border border-gray-100">
              <AlertCircle size={12} className="inline mr-1 text-status-resign" />
              请患者重新阅读并签署
            </div>
          </div>
        </section>
      )}

      <section className="card p-5 mb-5 animate-fade-in">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold shadow-md">
              {record.patient.name.slice(0, 1)}
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-base flex items-center gap-2">
                <User size={15} className="text-primary-500" />
                {record.patient.name}
                <span className="text-xs font-normal text-gray-500">{record.patient.gender} / {record.patient.age}岁</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 font-mono">病历号：{record.patient.medicalRecordNo}</div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <InfoChip icon={<FileText size={13} />} label="就诊项目" value={record.item.name} highlight />
          <InfoChip icon={<MapPin size={13} />} label="治疗牙位" value={record.toothPosition} />
          <InfoChip icon={<DollarSign size={13} />} label="费用" value={record.feeDescription.split('（')[0]} />
        </div>
      </section>

      <section className="card p-6 mb-5 animate-fade-in">
        <StepIndicator current={currentStep} completed={completed} />
      </section>

      <section className="card p-6 mb-5 animate-slide-in min-h-[480px]">
        {currentStep === 'risk' && <ReadBlock title="治疗风险告知" icon={<AlertTriangle size={20} className="text-status-resign" />} accent="border-l-status-resign" items={template.riskNotice} />}
        {currentStep === 'alternatives' && <ReadBlock title="替代治疗方案" icon={<GitBranch size={20} className="text-primary-500" />} accent="border-l-primary-500" items={template.alternatives} />}
        {currentStep === 'anesthesia' && <ReadBlock title="麻醉方式说明" icon={<Syringe size={20} className="text-accent-500" />} accent="border-l-accent-500" items={template.anesthesiaNote} />}
        {currentStep === 'postOperative' && <ReadBlock title="术后注意事项" icon={<Bandage size={20} className="text-status-signed" />} accent="border-l-status-signed" items={template.postOperative} />}
        {currentStep === 'signature' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">请患者手写签名确认</h3>
              <p className="text-sm text-gray-500">签名确认即表示您已完整阅读并同意上述全部条款</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-5 bg-gray-50/60">
              <div className="flex items-start gap-4 mb-5">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-status-signed">
                  <CheckCircle size={22} />
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  本人<span className="font-semibold text-primary-600 mx-1">{record.patient.name}</span>
                  已认真阅读并充分理解本知情同意书中的<b>全部内容</b>（包括风险告知、替代方案、麻醉说明、术后注意事项），
                  经主治医师详细解释后，仍<b>自愿选择</b>本次治疗方案，并愿意承担可能出现的风险。
                  本人签名具有与纸质手写签名同等的法律效力。
                </div>
              </div>
              <div className="rounded-lg bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">签名区域：</div>
                <SignaturePad
                  width={900}
                  height={240}
                  value={signature}
                  onSignatureChange={setSignature}
                />
              </div>
            </div>
          </div>
        )}

        {readingKey && (
          <label className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-primary-50/70 border border-primary-100 cursor-pointer hover:bg-primary-50 transition-colors group">
            <input
              type="checkbox"
              className="custom-checkbox mt-0.5"
              checked={record.readings[readingKey]}
              onChange={(e) => {
                markReading(record.id, readingKey, e.target.checked);
                updateRecord(record.id, {});
              }}
            />
            <div className="text-sm">
              <div className="font-semibold text-gray-800 group-hover:text-primary-700 transition-colors">
                我已阅读并充分理解以上「{
                  readingKey === 'risk' ? '治疗风险告知' :
                  readingKey === 'alternatives' ? '替代治疗方案' :
                  readingKey === 'anesthesia' ? '麻醉方式说明' : '术后注意事项'
                }」全部内容
              </div>
              <div className="text-xs text-gray-500 mt-1">如有任何疑问，请现场咨询主治医师后再勾选确认</div>
            </div>
          </label>
        )}
      </section>

      <section className="no-print flex items-center justify-between animate-fade-in">
        <button type="button" onClick={goPrev} disabled={idx === 0} className="btn-secondary">
          <ArrowLeft size={15} />
          上一步
        </button>
        <div className="text-xs text-gray-400">
          步骤 {idx + 1} / {STEP_ORDER.length}
        </div>
        <button type="button" onClick={goNext} disabled={!currentCanNext()} className="btn-primary px-6">
          {currentStep === 'signature' ? (
            <>
              <CheckCircle size={15} />
              完成签署
            </>
          ) : (
            <>
              下一步
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </section>

      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl p-10 w-[420px] text-center shadow-2xl animate-scale-in">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-50" />
              <div className="relative w-20 h-20 rounded-full bg-status-signed flex items-center justify-center text-white shadow-lg">
                <CheckCircle size={42} strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {isResign ? '补签完成 ✨' : '签署完成 ✨'}
            </h3>
            <p className="text-sm text-gray-500 mb-1">
              患者 {record.patient.name} 的知情同意书已{isResign ? '补签' : '签署'}
            </p>
            <p className="text-xs text-gray-400 mb-5">正在跳转至签署记录页...</p>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-400 to-accent-400 animate-[scale-in_2.6s_ease-out]" style={{ width: '100%', transformOrigin: 'left' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-xs text-gray-500">{label}：</span>
      <span className={`text-sm font-medium ${highlight ? 'text-primary-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}

function ReadBlock({ title, icon, accent, items }: { title: string; icon: React.ReactNode; accent: string; items: string[] }) {
  return (
    <div className="space-y-4">
      <div className={`pl-4 border-l-4 ${accent} py-1`}>
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-xs text-gray-500 mt-1">请患者务必认真阅读每一条内容</p>
      </div>

      <div className="max-h-[380px] overflow-auto pr-2 space-y-2.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-white border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center border border-gray-200">
              {i + 1}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{it}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
