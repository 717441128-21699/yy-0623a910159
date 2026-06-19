import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Eye, Printer, RotateCcw, FileCheck, FileX, FileClock, Hash, ChevronDown, X } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useConsentStore } from '@/store/consentStore';
import { formatDate } from '@/utils/date';
import type { ConsentStatus, ConsentRecord } from '@/types';
import PrintLayout from '@/components/PrintLayout';

type FilterKey = 'all' | ConsentStatus;

const TABS: { key: FilterKey; label: string; icon: typeof FileClock }[] = [
  { key: 'all', label: '全部', icon: FileCheck },
  { key: 'pending', label: '未签', icon: FileClock },
  { key: 'signed', label: '已签', icon: FileCheck },
  { key: 'resign', label: '需补签', icon: FileX },
];

export default function RecordsPage() {
  const navigate = useNavigate();
  const records = useConsentStore((s) => s.records);
  const setStatus = useConsentStore((s) => s.setStatus);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<ConsentRecord | null>(null);
  const [printing, setPrinting] = useState<ConsentRecord | null>(null);

  const counts = useMemo(() => ({
    all: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    signed: records.filter((r) => r.status === 'signed').length,
    resign: records.filter((r) => r.status === 'resign').length,
  }), [records]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return records
      .filter((r) => filter === 'all' ? true : r.status === filter)
      .filter((r) => {
        if (!kw) return true;
        return (
          r.patient.name.toLowerCase().includes(kw) ||
          r.patient.medicalRecordNo.toLowerCase().includes(kw) ||
          r.item.name.toLowerCase().includes(kw) ||
          r.toothPosition.toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [records, filter, keyword]);

  function handlePrint(r: ConsentRecord) {
    setPrinting(r);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrinting(null), 300);
    }, 200);
  }

  if (printing) {
    return <PrintLayout record={printing} />;
  }

  return (
    <div className="max-w-[1500px] mx-auto px-6 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileCheck className="text-primary-500" size={24} />
            签署记录管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">查看、搜索、补签、打印所有知情同意书记录</p>
        </div>
      </div>

      <div className="card mb-5 animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-1">
          <div className="flex items-center">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`tab-item flex items-center gap-2 px-5 relative ${
                  filter === key ? 'tab-item-active' : ''
                }`}
              >
                <Icon size={15} />
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  filter === key
                    ? 'bg-primary-100 text-primary-700'
                    : key === 'pending' ? 'bg-orange-100 text-orange-600'
                    : key === 'signed' ? 'bg-green-100 text-green-600'
                    : key === 'resign' ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-8 w-64"
                placeholder="搜索姓名/病历号/项目/牙位"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select className="input-field pl-8 w-44 appearance-none pr-8 cursor-pointer bg-white">
                <option>全部日期</option>
                <option>今日</option>
                <option>近7天</option>
                <option>近30天</option>
                <option>本月</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600">
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap"><Hash size={13} className="inline mr-1.5" />编号</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">患者信息</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">就诊项目</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">治疗牙位</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">创建时间</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">签署时间</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap">状态</th>
                <th className="text-left font-medium px-5 py-3 whitespace-nowrap text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center text-gray-400">
                    <div className="text-5xl mb-3 opacity-40">📋</div>
                    <p>暂无符合条件的记录</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id} className={`border-t border-gray-50 hover:bg-primary-50/40 transition-colors ${
                    i % 2 === 1 ? 'bg-gray-50/30' : ''
                  }`}>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {r.id.slice(-10).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-700 flex items-center justify-center font-semibold text-sm border border-white shadow-sm">
                          {r.patient.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{r.patient.name}
                            <span className="text-xs font-normal text-gray-400 ml-1.5">{r.patient.gender} · {r.patient.age}岁</span>
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">{r.patient.medicalRecordNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
                        {r.item.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-xs max-w-[160px] truncate" title={r.toothPosition}>
                      {r.toothPosition}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {r.signedAt ? formatDate(r.signedAt) : '—'}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="查看详情" onClick={() => setDetail(r)}><Eye size={15} /></IconBtn>
                        <IconBtn
                          title={r.status === 'pending' ? '去签署' : '补签'}
                          onClick={() => {
                            if (r.status === 'signed') setStatus(r.id, 'resign');
                            navigate(`/sign/${r.id}`);
                          }}
                        >
                          <RotateCcw size={15} />
                        </IconBtn>
                        <IconBtn
                          title="打印确认单"
                          onClick={() => handlePrint(r)}
                          disabled={r.status !== 'signed'}
                        >
                          <Printer size={15} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
          <span>共 {filtered.length} 条记录</span>
          <span>已签署 {counts.signed} · 待签署 {counts.pending} · 需补签 {counts.resign}</span>
        </div>
      </div>

      {detail && <DetailModal record={detail} onClose={() => setDetail(null)} onSign={(id) => { setDetail(null); navigate(`/sign/${id}`); }} onPrint={handlePrint} />}
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        disabled
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  );
}

function DetailModal({ record, onClose, onSign, onPrint }: { record: ConsentRecord; onClose: () => void; onSign: (id: string) => void; onPrint: (r: ConsentRecord) => void }) {
  const allRead = record.readings.risk && record.readings.alternatives && record.readings.anesthesia && record.readings.postOperative;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 no-print" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[980px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 via-white to-accent-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Eye size={18} className="text-primary-500" />
              知情同意书详情
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {record.patient.name} · {record.item.name} · 创建于 {formatDate(record.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={record.status} size="md" />
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 grid grid-cols-5 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">签署进度</h4>
              <ProgressRow label="风险告知" done={record.readings.risk} />
              <ProgressRow label="替代方案" done={record.readings.alternatives} />
              <ProgressRow label="麻醉说明" done={record.readings.anesthesia} />
              <ProgressRow label="术后注意" done={record.readings.postOperative} />
              <ProgressRow label="手写签名" done={!!record.signatureData} last />
              <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                allRead && record.signatureData
                  ? 'bg-green-50 text-green-700'
                  : 'bg-orange-50 text-orange-700'
              }`}>
                {allRead && record.signatureData ? '全部已完成 ✓' : `还剩 ${[!record.readings.risk, !record.readings.alternatives, !record.readings.anesthesia, !record.readings.postOperative, !record.signatureData].filter(Boolean).length} 项`}
              </div>
            </div>

            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">患者签名</h4>
              {record.signatureData ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <img src={record.signatureData} alt="签名" className="max-h-32 w-full object-contain" />
                  <div className="mt-2 text-[11px] text-gray-500 text-right">签署时间：{formatDate(record.signedAt)}</div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 h-28 flex items-center justify-center text-sm text-gray-400">
                  尚未签名
                </div>
              )}
            </div>

            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">治疗信息</h4>
              <dl className="text-sm space-y-1.5">
                <Info label="项目" value={record.item.name} />
                <Info label="牙位" value={record.toothPosition} />
                <Info label="费用" value={record.feeDescription} />
                <Info label="病历号" value={record.patient.medicalRecordNo} />
                <Info label="联系电话" value={record.patient.phone} />
              </dl>
            </div>
          </div>

          <div className="col-span-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 max-h-[65vh] overflow-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-sm space-y-4">
                <h5 className="text-center font-bold text-base text-primary-700 border-b border-gray-200 pb-3 mb-3">
                  知情同意书内容摘要
                </h5>
                <MiniSection title="风险告知" items={getSummary(record.item.code, 'risk')} />
                <MiniSection title="替代方案" items={getSummary(record.item.code, 'alt')} />
                <MiniSection title="麻醉说明" items={getSummary(record.item.code, 'anes')} />
                <MiniSection title="术后注意" items={getSummary(record.item.code, 'post')} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">关闭</button>
          <button onClick={() => onSign(record.id)} className="btn-outline">
            <RotateCcw size={14} />
            {record.status === 'signed' ? '重新签署' : '继续签署'}
          </button>
          <button
            onClick={() => onPrint(record)}
            disabled={record.status !== 'signed'}
            className="btn-primary"
          >
            <Printer size={14} />
            打印确认单
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, done, last }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
        done ? 'bg-status-signed text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
      }`}>
        {done ? '✓' : '…'}
      </div>
      <div className="flex-1 flex items-center justify-between text-sm">
        <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
        <span className={`text-xs ${done ? 'text-status-signed' : 'text-gray-400'}`}>{done ? '已完成' : '未完成'}</span>
      </div>
      {!last && <div className="w-px h-3 ml-[10px]" />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-gray-100 pb-1.5 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}

function MiniSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h6 className="font-semibold text-gray-800 mb-1.5 text-[13px]">{title}</h6>
      <ul className="list-disc pl-5 space-y-0.5 text-gray-600 text-xs leading-relaxed">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

import { getTemplateByCode } from '@/data/consentTemplates';

function getSummary(code: string, part: 'risk' | 'alt' | 'anes' | 'post'): string[] {
  const t = getTemplateByCode(code);
  const arr =
    part === 'risk' ? t.riskNotice :
    part === 'alt' ? t.alternatives :
    part === 'anes' ? t.anesthesiaNote : t.postOperative;
  return arr.slice(0, 3);
}
