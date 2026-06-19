import { resolveTemplate } from '@/data/consentTemplates';
import { formatDate } from '@/utils/date';
import type { ConsentRecord } from '@/types';

interface Props {
  record: ConsentRecord;
}

export default function PrintLayout({ record }: Props) {
  const template = resolveTemplate(record.item.code, record.templateOverride);
  const hasOverride = record.templateOverride && (
    record.templateOverride.riskNotice ||
    record.templateOverride.alternatives ||
    record.templateOverride.anesthesiaNote ||
    record.templateOverride.postOperative
  );
  return (
    <div className="print-area min-h-screen bg-white">
      <div className="paper-a4 mx-auto my-10" style={{ width: '210mm' }}>
        <div className="absolute top-0 right-0 p-5 opacity-[0.04] pointer-events-none select-none" style={{ fontSize: '120px', transform: 'rotate(35deg)' }}>
          雅康口腔
        </div>

        <div className="text-center pb-5 border-b-2 border-gray-800 mb-6">
          <div className="text-[11px] tracking-[0.3em] text-gray-500 mb-1">YAKANG DENTAL CLINIC · INFORMED CONSENT</div>
          <h1 className="text-[26px] font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
            {template.title}
            {hasOverride && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-normal">
                已自定义条款
              </span>
            )}
          </h1>
          <div className="text-xs text-gray-500">编号：DIC-{new Date(record.createdAt).getFullYear()}-{record.id.slice(-6).toUpperCase()}</div>
        </div>

        <div className="text-xs mb-6 leading-relaxed text-gray-700 bg-gray-50/80 p-4 rounded border border-gray-200">
          尊敬的患者：您好！为保证您充分了解本次口腔治疗的相关内容，请您务必认真阅读本知情同意书的
          <b>全部条款</b>。如有任何疑问，请及时向您的主治医师提出，直至您完全理解后再签署。<br />
          本同意书经您签署后即成为具有法律效力的医疗文书，请您慎重决策。
        </div>

        <section className="mb-6 text-sm">
          <h2 className="text-[15px] font-bold text-gray-900 mb-3 pb-1 border-b border-gray-300 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary-500" />
            一、患者基本信息
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            <PrintInfo label="患者姓名" value={record.patient.name} />
            <PrintInfo label="性别 / 年龄" value={`${record.patient.gender} / ${record.patient.age} 岁`} />
            <PrintInfo label="病历号" value={record.patient.medicalRecordNo} mono />
            <PrintInfo label="联系电话" value={record.patient.phone} mono />
            <PrintInfo label="就诊项目" value={record.item.name} strong />
            <PrintInfo label="治疗牙位" value={record.toothPosition} />
          </div>
          <div className="mt-2.5">
            <PrintInfo label="费用说明" value={record.feeDescription} full />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-8">
            <PrintInfo label="建档时间" value={formatDate(record.createdAt, 'full')} />
            <PrintInfo label="签署时间" value={formatDate(record.signedAt, 'full')} />
          </div>
        </section>

        <PrintSection title="二、治疗风险告知" items={template.riskNotice} />
        <PrintSection title="三、替代治疗方案" items={template.alternatives} />
        <PrintSection title="四、麻醉方式与说明" items={template.anesthesiaNote} />
        <PrintSection title="五、术后注意事项" items={template.postOperative} />

        <section className="mt-6 pt-5 border-t-2 border-gray-800">
          <h2 className="text-[15px] font-bold text-gray-900 mb-4">六、患者声明与签署</h2>
          <div className="text-[13px] leading-loose text-gray-800 bg-gray-50/80 p-4 rounded border border-gray-200 mb-6">
            本人 <b className="text-primary-700 text-base mx-1">{record.patient.name}</b>
            在此郑重声明：
            <span className="block mt-1">1. 本人已就本次治疗的所有问题向主治医师进行了充分询问，医师已予以详细解答；</span>
            <span className="block">2. 本人已完整阅读并充分理解本知情同意书<b>全部内容</b>（包括风险、替代方案、麻醉说明及术后注意事项）；</span>
            <span className="block">3. 经慎重考虑，本人<b>自愿选择并同意</b>接受本次治疗，并愿意承担相应风险；</span>
            <span className="block">4. 本人确认本电子签名系本人真实意愿的表达，与手写签名具有同等法律效力。</span>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm">
            <div>
              <div className="mb-3 text-gray-600">患者签名：</div>
              <div className="h-24 border-b-2 border-gray-700 flex items-end justify-start">
                {record.signatureData && (
                  <img src={record.signatureData} alt="患者签名" className="max-h-20 object-contain" />
                )}
              </div>
            </div>
            <div>
              <div className="mb-3 text-gray-600">主治医师签名：</div>
              <div className="h-24 border-b-2 border-gray-700 flex items-end justify-end">
                <span className="text-xs text-gray-400 pb-1">（系统自动关联主治医师电子签章）</span>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-8 text-xs text-gray-500">
            <div>签署日期：<span className="text-gray-800 font-medium ml-1">{formatDate(record.signedAt, 'date')}</span></div>
            <div>签署地点：<span className="text-gray-800 font-medium ml-1">雅康口腔门诊</span></div>
            <div>打印时间：<span className="text-gray-800 font-medium ml-1">{formatDate(new Date(), 'full')}</span></div>
          </div>
        </section>

        <div className="mt-10 pt-4 border-t border-dashed border-gray-400 text-[10px] text-gray-500 flex items-center justify-between">
          <div>本确认单一式两份，患者与医疗机构各执一份，具有同等法律效力</div>
          <div>第 1 页 / 共 1 页</div>
        </div>
      </div>
    </div>
  );
}

function PrintInfo({ label, value, mono, strong, full }: { label: string; value: string; mono?: boolean; strong?: boolean; full?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${full ? '' : ''}`}>
      <span className="text-gray-600 shrink-0">{label}：</span>
      <span className={`flex-1 border-b border-dotted border-gray-400 pb-0.5 ${mono ? 'font-mono' : ''} ${strong ? 'font-bold text-primary-700' : 'text-gray-900'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function PrintSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mb-5 text-sm">
      <h2 className="text-[15px] font-bold text-gray-900 mb-2.5 pb-1 border-b border-gray-300 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary-500" />
        {title}
      </h2>
      <ol className="list-decimal pl-6 space-y-1.5 leading-relaxed text-gray-800">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ol>
    </section>
  );
}
