import { useState } from 'react';
import { BookOpen, Search, ChevronDown, AlertTriangle, GitBranch, Syringe, Bandage, Copy, Info } from 'lucide-react';
import { TREATMENT_ITEMS } from '@/data/treatmentItems';
import { getTemplateByCode } from '@/data/consentTemplates';
import type { TreatmentItem } from '@/types';

export default function TemplatesPage() {
  const [keyword, setKeyword] = useState('');
  const [selectedItem, setSelectedItem] = useState<TreatmentItem | null>(TREATMENT_ITEMS[0] ?? null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    riskNotice: true,
    alternatives: false,
    anesthesiaNote: false,
    postOperative: false,
  });

  const filtered = TREATMENT_ITEMS.filter((it) =>
    it.name.includes(keyword) || it.code.toLowerCase().includes(keyword.toLowerCase()),
  );

  const template = selectedItem ? getTemplateByCode(selectedItem.code) : null;

  const sections = [
    { key: 'riskNotice', label: '风险告知', icon: <AlertTriangle size={16} />, color: 'text-status-resign', bg: 'bg-red-50' },
    { key: 'alternatives', label: '替代方案', icon: <GitBranch size={16} />, color: 'text-primary-500', bg: 'bg-blue-50' },
    { key: 'anesthesiaNote', label: '麻醉说明', icon: <Syringe size={16} />, color: 'text-accent-500', bg: 'bg-teal-50' },
    { key: 'postOperative', label: '术后注意事项', icon: <Bandage size={16} />, color: 'text-status-signed', bg: 'bg-green-50' },
  ] as const;

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function copySection(key: keyof typeof template) {
    if (!template) return;
    const text = template[key] as string[];
    navigator.clipboard?.writeText(text.join('\n'));
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-primary-500" size={24} />
            知情同意书模板库
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            查看各就诊项目的标准知情同意书模板；模板内容为系统默认，单份同意书可在创建时临时编辑
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-8 w-64"
            placeholder="搜索项目名称或编码"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 animate-fade-in">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-accent-50">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-500 rounded" />
                就诊项目（{TREATMENT_ITEMS.length}）
              </h3>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-auto py-2">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">无匹配项目</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 border-l-4 ${
                      selectedItem?.id === item.id
                        ? 'bg-primary-50 border-l-primary-500 text-primary-700'
                        : 'border-l-transparent hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
                      selectedItem?.id === item.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="text-sm">🦷</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">{item.description}</div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-8 animate-fade-in" style={{ animationDelay: '60ms' }}>
          {template && selectedItem ? (
            <div className="card overflow-hidden h-full">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 via-white to-accent-50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">{template.title}</h3>
                    <span className="text-[10px] font-mono text-primary-500 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded">
                      {selectedItem.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedItem.description} · 参考费用：{selectedItem.defaultFee}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                  <Info size={12} />
                  系统标准模板，只读查看
                </div>
              </div>

              <div className="max-h-[calc(100vh-320px)] overflow-auto p-5 space-y-4">
                {sections.map((s) => {
                  const isOpen = expanded[s.key];
                  const items = template[s.key] as string[];
                  return (
                    <div key={s.key} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection(s.key)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${s.bg}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={s.color}>{s.icon}</span>
                          <span className="font-semibold text-sm text-gray-800">{s.label}</span>
                          <span className="text-[11px] text-gray-400 bg-white/70 px-2 py-0.5 rounded-full border border-gray-200/60">
                            共 {items.length} 条
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copySection(s.key); }}
                            className="text-[11px] text-gray-400 hover:text-primary-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/70 transition-colors"
                          >
                            <Copy size={12} />
                            复制
                          </button>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isOpen && (
                        <ol className="px-4 py-3 space-y-2 bg-white animate-fade-in">
                          {items.map((it, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              <span className="flex-1">{it}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  💡 如需修改某份同意书内容，请在「患者信息页」选择项目后点击「编辑此份模板」进行临时调整
                </p>
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center py-20 text-gray-400">
                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">请选择左侧项目查看模板详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
