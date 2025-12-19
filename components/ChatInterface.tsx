
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { LegalAnalysisResult, CategoryDef, UploadedFile, HistoryItem } from '../types';
import { analyzeLegalCase, generateLegalDocument } from '../services/geminiService';
import { 
  Briefcase, AlertTriangle, CheckCircle, 
  ArrowRight, Shield, Home, Car, Users, Scale, 
  ChevronRight, Loader2, ArrowLeft,
  ShoppingBag, Gavel, Scroll, Percent,
  FileText, Clock, TrendingUp, AlertCircle, FileCheck, HelpCircle, X, Copy,
  PlusCircle, BrainCircuit, Lock, Camera, History, User as UserIcon, Calendar, Trash2
} from 'lucide-react';

interface Props {
  urls: string[]; 
  onToggleSidebar?: () => void;
  isTgEnvironment?: boolean;
}

// Flow Steps
type Step = 
  | 'DASHBOARD' 
  | 'DISCLAIMER' 
  | 'CATEGORY' 
  | 'ROLE' 
  | 'INTAKE' 
  | 'PROCESSING' 
  | 'CLARIFICATION'
  | 'ANALYSIS';

// Categories Configuration
const CATEGORIES: CategoryDef[] = [
  { 
    id: 'consumer', 
    name: 'Защита прав потребителей', 
    desc: 'Возврат, брак, услуги',
    icon: ShoppingBag, 
    roles: [
      { id: 'buyer', label: 'Покупатель / Заказчик' },
      { id: 'seller', label: 'Продавец / Исполнитель' }
    ],
    questions: [
      { id: 'period', text: 'Прошло менее 14 дней?' },
      { id: 'receipt', text: 'Чек сохранился?' },
      { id: 'defect', text: 'Есть явный брак?' }
    ]
  },
  { 
    id: 'labor', 
    name: 'Трудовые споры', 
    desc: 'Увольнения, зарплата',
    icon: Briefcase, 
    roles: [
      { id: 'employee', label: 'Работник' },
      { id: 'employer', label: 'Работодатель' }
    ],
    questions: [
      { id: 'contract', text: 'Трудовой договор есть?' },
      { id: 'official', text: 'Зарплата "белая"?' },
      { id: 'debt', text: 'Есть задолженность?' }
    ]
  },
  { 
    id: 'debt', 
    name: 'Долги и Кредиты', 
    desc: 'Займы, банкротство',
    icon: Scale, 
    roles: [
      { id: 'debtor', label: 'Должник (я должен)' },
      { id: 'creditor', label: 'Кредитор (мне должны)' }
    ],
    questions: [
      { id: 'contract', text: 'Договор займа подписан?' },
      { id: 'delay', text: 'Просрочка > 3 месяцев?' },
      { id: 'court', text: 'Суд уже был?' }
    ]
  },
  { 
    id: 'family', 
    name: 'Семья и Дети', 
    desc: 'Развод, алименты',
    icon: Users, 
    roles: [
      { id: 'spouse_m', label: 'Супруг / Отец' },
      { id: 'spouse_f', label: 'Супруга / Мать' }
    ],
    questions: [
      { id: 'married', text: 'Брак зарегистрирован?' },
      { id: 'kids', text: 'Есть несовершеннолетние дети?' },
      { id: 'property', text: 'Есть общее имущество?' }
    ]
  },
  { 
    id: 'auto', 
    name: 'Авто / ДТП', 
    desc: 'Аварии, ГИБДД, споры',
    icon: Car, 
    roles: [
      { id: 'victim', label: 'Пострадавший' },
      { id: 'driver', label: 'Виновник / Водитель' }
    ],
    questions: [
      { id: 'protocol', text: 'Протокол оформлен?' },
      { id: 'insurance', text: 'Есть полис ОСАГО?' },
      { id: 'injury', text: 'Есть пострадавшие люди?' }
    ]
  },
  { 
    id: 'realty', 
    name: 'Недвижимость', 
    desc: 'Аренда, ЖКХ, собственность',
    icon: Home, 
    roles: [
      { id: 'tenant', label: 'Арендатор / Жилец' },
      { id: 'landlord', label: 'Собственник / Арендодатель' }
    ],
    questions: [
      { id: 'owner', text: 'Право собственности оформлено?' },
      { id: 'contract', text: 'Договор аренды письменный?' },
      { id: 'debt', text: 'Есть долги по оплате?' }
    ]
  },
  { 
    id: 'criminal', 
    name: 'Уголовное право', 
    desc: 'Полиция, допросы',
    icon: Gavel, 
    roles: [
      { id: 'witness', label: 'Свидетель' },
      { id: 'suspect', label: 'Подозреваемый' },
      { id: 'victim', label: 'Потерпевший' }
    ],
    questions: [
      { id: 'lawyer', text: 'Адвокат участвовал?' },
      { id: 'protocol', text: 'Протокол подписан?' },
      { id: 'detained', text: 'Было задержание?' }
    ]
  },
  { 
    id: 'inheritance', 
    name: 'Наследство', 
    desc: 'Завещания, споры',
    icon: Scroll, 
    roles: [
      { id: 'heir', label: 'Наследник' },
      { id: 'challenger', label: 'Оспаривающий' }
    ],
    questions: [
      { id: 'time', text: 'Прошло < 6 месяцев?' },
      { id: 'will', text: 'Есть завещание?' },
      { id: 'relatives', text: 'Есть другие наследники?' }
    ]
  },
  { 
    id: 'tax', 
    name: 'Налоги', 
    desc: 'ФНС, вычеты',
    icon: Percent, 
    roles: [
      { id: 'person', label: 'Физлицо' },
      { id: 'business', label: 'ИП / Бизнес' }
    ],
    questions: [
      { id: 'resident', text: 'Налоговый резидент РФ?' },
      { id: 'demand', text: 'Пришло требование ФНС?' }
    ]
  }
];

const ChatInterface: React.FC<Props> = ({ urls, isTgEnvironment = false }) => {
  const [step, setStep] = useState<Step>('DASHBOARD');
  
  // Selection State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [customRole, setCustomRole] = useState(''); // For manual role entry
  
  // Intake State
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [detailsText, setDetailsText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Clarification State
  const [clarificationInput, setClarificationInput] = useState('');
  
  // Analysis State
  const [result, setResult] = useState<LegalAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STRATEGY' | 'DOCS'>('OVERVIEW');
  const [showReasoning, setShowReasoning] = useState(false);

  // Document Generation State
  const [generatedDoc, setGeneratedDoc] = useState<{title: string, content: string} | null>(null);
  const [generatingDocName, setGeneratingDocName] = useState<string | null>(null);

  // Privacy Policy State
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  // Processing Logs (Fake Stream)
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Telegram Helpers
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id || 'guest';
  const username = user?.first_name || 'Guest';
  const userPhoto = user?.photo_url;

  // ---------------- Navigation & Effects ----------------

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem(`lex_history_${userId}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, [userId]);

  // Save History Helper
  const saveToHistory = (res: LegalAnalysisResult, cat: string, role: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: Date.now(),
      categoryName: cat,
      roleName: role,
      score: res.legalStrengthScore,
      summary: res.summary.substring(0, 100) + "...",
      result: res
    };
    
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem(`lex_history_${userId}`, JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('impact', 'medium');
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem(`lex_history_${userId}`, JSON.stringify(newHistory));
  };

  const loadFromHistory = (item: HistoryItem) => {
    haptic('impact', 'light');
    setSelectedCategoryId(''); // We don't have cat ID in simple history item, just name
    setCustomRole(item.roleName); // Treat as custom for simplicity
    setResult(item.result);
    setStep('ANALYSIS');
  };

  const handleBack = () => {
      haptic('impact', 'light');
      switch (step) {
        case 'DISCLAIMER': setStep('DASHBOARD'); break;
        case 'CATEGORY': setStep('DISCLAIMER'); break;
        case 'ROLE': setStep('CATEGORY'); break;
        case 'INTAKE': setStep('ROLE'); break;
        case 'PROCESSING': break; 
        case 'ANALYSIS': setStep('DASHBOARD'); break; 
        case 'CLARIFICATION': setStep('INTAKE'); break;
        default: if(isTgEnvironment && tg) tg.close(); else setStep('DASHBOARD');
      }
  };

  // Handle Telegram Back Button
  useEffect(() => {
    if (!isTgEnvironment || !tg) return;

    if (step === 'DASHBOARD') {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    }

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [step, isTgEnvironment]);

  // Handle Telegram Main Button (for Intake Step)
  useEffect(() => {
    if (!isTgEnvironment || !tg) return;

    const handleMainBtn = () => {
       haptic('impact', 'heavy');
       handleAnalyzeClick();
    };

    if (step === 'INTAKE') {
      tg.MainButton.setText('ЗАПУСТИТЬ АНАЛИЗ');
      tg.MainButton.color = '#10b981'; // Emerald 500
      tg.MainButton.show();
      tg.MainButton.onClick(handleMainBtn);
    } else {
      tg.MainButton.hide();
      tg.MainButton.offClick(handleMainBtn);
    }

    return () => {
      tg.MainButton.offClick(handleMainBtn);
    };
  }, [step, detailsText, isTgEnvironment]);

  // ---------------- Handlers & Haptics ----------------

  // Enhanced Haptic Helper
  const haptic = (type: 'impact' | 'notification' | 'selection' = 'impact', style?: string) => {
    if (isTgEnvironment && tg && tg.HapticFeedback) {
       try {
          if (type === 'impact') {
            tg.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy' || 'light');
          } else if (type === 'notification') {
            tg.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning' || 'success');
          } else if (type === 'selection') {
            tg.HapticFeedback.selectionChanged();
          }
       } catch (e) {
         // Fallback or ignore
       }
    }
  };

  const handleCustomCategory = () => {
    haptic('impact', 'medium');
    setSelectedCategoryId('custom');
    setStep('ROLE'); 
  };

  const handleCustomRoleSubmit = () => {
    if(!customRole.trim()) return;
    haptic('impact', 'medium');
    setStep('INTAKE');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      haptic('notification', 'success');
      const fileList = e.target.files;
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (ev) => {
           const base64 = ev.target?.result as string;
           setFiles(prev => [...prev, { name: file.name, type: file.type, data: base64 }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = (idx: number) => {
    haptic('impact', 'light');
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleAnswer = (qId: string) => {
    haptic('selection'); // Perfect for checkboxes
    setAnswers(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const runAnalysis = async (currentDetails: string) => {
    if (!categoryName) return;
    if (!roleName) return;

    if (isTgEnvironment && tg) tg.MainButton.showProgress(false); 
    setStep('PROCESSING');
    setProcessingLogs([]); 

    const addLog = (msg: string, delay: number) => {
       setTimeout(() => setProcessingLogs(prev => [...prev, msg]), delay);
    };

    addLog("Загрузка профиля пользователя...", 100);
    addLog("Синхронизация с базой знаний...", 600);
    addLog("Анализ фактов и обстоятельств...", 1500);
    addLog("Поиск релевантных статей ГК/УК РФ...", 2500);
    addLog("Формирование стратегии...", 3500);

    let checkboxSummary = '';
    if (!isCustomCase && selectedCategory) {
       checkboxSummary = selectedCategory.questions
        .map(q => `- ${q.text}: ${answers[q.id] ? 'Да' : 'Нет/Не знаю'}`)
        .join('\n');
    }
    
    const fullDescription = `Вводные данные:\n${checkboxSummary}\n\nДетали:\n${currentDetails}`;

    try {
      const data = await analyzeLegalCase(
        categoryName, 
        roleName,
        fullDescription, 
        urls,
        files
      );
      
      if (isTgEnvironment && tg) {
        tg.MainButton.hideProgress();
        haptic('notification', 'success'); // SUCCESS VIBRATION
      }

      if (data.clarifyingQuestions && data.clarifyingQuestions.length > 0) {
        setResult(data);
        setStep('CLARIFICATION');
      } else {
        setResult(data);
        saveToHistory(data, categoryName, roleName); // SAVE TO HISTORY
        setStep('ANALYSIS');
      }

    } catch (e) {
      console.error(e);
      if (isTgEnvironment && tg) {
        tg.MainButton.hideProgress();
        haptic('notification', 'error'); // ERROR VIBRATION
      }
      setStep('INTAKE'); 
    }
  };

  const handleAnalyzeClick = () => {
    runAnalysis(detailsText);
  };

  const handleClarificationSubmit = () => {
    if (!clarificationInput.trim()) return;
    haptic('impact', 'medium');
    const updatedDetails = detailsText + "\n\nДополнительные уточнения пользователя:\n" + clarificationInput;
    setDetailsText(updatedDetails);
    setClarificationInput('');
    runAnalysis(updatedDetails);
  };

  const handleGenerateDoc = async (docName: string) => {
    if (!categoryName || !roleName) return;
    haptic('impact', 'medium');
    setGeneratingDocName(docName);
    try {
        const content = await generateLegalDocument(docName, categoryName, roleName, detailsText);
        setGeneratedDoc({ title: docName, content });
        haptic('notification', 'success');
    } catch (e) {
        console.error(e);
        haptic('notification', 'error');
        alert("Не удалось создать документ. Попробуйте позже.");
    } finally {
        setGeneratingDocName(null);
    }
  };

  const reset = () => {
    haptic('impact', 'heavy');
    setStep('DASHBOARD');
    setResult(null);
    setDetailsText('');
    setClarificationInput('');
    setAnswers({});
    setFiles([]);
    setSelectedCategoryId('');
    setSelectedRoleId('');
    setCustomRole('');
    setActiveTab('OVERVIEW');
    setGeneratedDoc(null);
  };

  // Derived Values
  const isCustomCase = selectedCategoryId === 'custom';
  const selectedCategory = CATEGORIES.find(c => c.id === selectedCategoryId);
  const selectedRole = selectedCategory?.roles.find(r => r.id === selectedRoleId);
  const categoryName = isCustomCase ? 'Свой случай' : selectedCategory?.name;
  const roleName = isCustomCase ? customRole : selectedRole?.label;

  // ---------------- UI RENDERERS ----------------

  const renderHeader = (title: string, showBack: boolean = true) => {
     if (isTgEnvironment) return null;
     return (
        <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-[#09090b] sticky top-0 z-20">
           {showBack && (
              <button onClick={handleBack} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                 <ArrowLeft size={20} />
              </button>
           )}
           <h2 className="text-lg font-bold text-white truncate">{title}</h2>
        </div>
     );
  };

  // --- E0: DASHBOARD (Replaces Welcome) ---
  if (step === 'DASHBOARD') {
    return (
      <div className="h-full flex flex-col p-4 md:p-6 animate-slide-up relative bg-[#09090b]">
        {/* Privacy Modal Overlay */}
        {showPrivacy && (
            <div className="absolute inset-0 z-50 bg-[#09090b]/95 backdrop-blur-md flex items-center justify-center p-4 animate-scale-in">
                <div className="w-full max-w-3xl bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                           <Lock className="text-emerald-500" />
                           <h3 className="text-xl font-bold text-white">Политика</h3>
                        </div>
                        <button onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                           <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 text-zinc-300 text-sm leading-relaxed">
                        <p><strong>1. Общие положения</strong><br/>
                        LexHelper (далее – Оператор) уважает вашу конфиденциальность. Данные хранятся локально на вашем устройстве.</p>
                        <p><strong>6. Отказ от ответственности</strong><br/>
                        Результаты работы ИИ не являются юридической консультацией.</p>
                    </div>
                    <div className="p-6 border-t border-zinc-800 bg-[#18181b] rounded-b-2xl">
                        <button onClick={() => setShowPrivacy(false)} className="w-full btn-primary py-3 rounded-xl font-bold">
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* User Profile Header */}
        <div className="flex items-center gap-4 mb-6 pt-2 animate-slide-up delay-0">
           <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-zinc-800 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-900/10">
              {userPhoto ? (
                 <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
              ) : (
                 <UserIcon size={28} className="text-zinc-500" />
              )}
           </div>
           <div>
              <div className="text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">
                 {isTgEnvironment ? 'ID: ' + userId : 'Гость'}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                 {username}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                    ONLINE
                 </span>
                 {history.length > 0 && (
                   <span className="text-zinc-500 text-[10px] md:text-xs">
                     {history.length} {history.length === 1 ? 'дело' : 'дел'}
                   </span>
                 )}
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 space-y-6">
           
           {/* Main Action */}
           <div className="animate-slide-up delay-100">
              <button 
                onClick={() => { haptic('impact', 'medium'); setStep('DISCLAIMER'); }}
                className="w-full btn-primary p-6 rounded-3xl font-bold flex flex-col items-center gap-4 shadow-xl shadow-white/5 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Shield size={120} />
                </div>
                <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                   <PlusCircle size={32} />
                </div>
                <div className="text-center relative z-10">
                   <div className="text-xl">Новое разбирательство</div>
                   <div className="text-sm text-zinc-500 font-normal mt-1">Анализ ситуации и документов</div>
                </div>
              </button>
           </div>

           {/* History List */}
           <div className="animate-slide-up delay-200">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <History size={18} className="text-zinc-500" /> История дел
                 </h2>
              </div>

              {history.length === 0 ? (
                 <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                    <Briefcase size={32} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">История пуста</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                    {history.map((item) => (
                       <div 
                         key={item.id} 
                         onClick={() => loadFromHistory(item)}
                         className="group bg-[#18181b] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer relative"
                       >
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 font-mono">
                                   {new Date(item.date).toLocaleDateString()}
                                </span>
                                {item.score < 30 ? <span className="w-2 h-2 rounded-full bg-rose-500"></span> :
                                 item.score < 60 ? <span className="w-2 h-2 rounded-full bg-amber-500"></span> :
                                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                             </div>
                             <button 
                               onClick={(e) => deleteHistoryItem(item.id, e)} 
                               className="p-1.5 text-zinc-600 hover:text-rose-500 hover:bg-zinc-800 rounded-lg transition-colors"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                          <h3 className="font-bold text-white text-sm mb-1 truncate">{item.categoryName}</h3>
                          <p className="text-xs text-zinc-400 truncate mb-2">{item.roleName}</p>
                          <div className="text-[10px] text-zinc-600 line-clamp-2 leading-relaxed bg-zinc-900/50 p-2 rounded-lg">
                             {item.summary}
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 w-full p-4 text-center bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none">
           <button 
             onClick={() => { haptic('impact', 'light'); setShowPrivacy(true); }}
             className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors pointer-events-auto"
           >
              Политика конфиденциальности
           </button>
        </div>
      </div>
    );
  }

  // --- E1: DISCLAIMER ---
  if (step === 'DISCLAIMER') {
    return (
      <div className="h-full flex flex-col animate-slide-up">
        {!isTgEnvironment && renderHeader("Важно знать", true)}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto pb-24">
          <div className="max-w-2xl bg-[#18181b] border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl my-auto">
            <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-zinc-800 pb-4">
              <AlertTriangle size={32} className="flex-shrink-0" />
              <h2 className="text-xl md:text-2xl font-bold">Отказ от ответственности</h2>
            </div>
            
            <div className="space-y-6 text-zinc-300 mb-8 leading-relaxed text-sm md:text-base max-h-[60vh] overflow-y-auto pr-2">
              <p>Сервис <strong>LexHelper</strong> является экспертной системой на базе искусственного интеллекта. Информация носит справочный характер.</p>
              <p className="text-zinc-400 text-xs bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                 ИИ может ошибаться. Для принятия важных решений проконсультируйтесь с юристом.
              </p>
            </div>

            <button 
               onClick={() => { haptic('impact', 'medium'); setStep('CATEGORY'); }}
               className="w-full btn-primary py-4 rounded-xl font-bold text-lg"
             >
               Принимаю условия
             </button>
          </div>
        </div>
      </div>
    );
  }

  // --- E2: CATEGORY ---
  if (step === 'CATEGORY') {
    return (
      <div className="h-full flex flex-col">
        {!isTgEnvironment && renderHeader("Категории", true)}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          <div className="max-w-5xl mx-auto py-2">
            <div className="animate-slide-up delay-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Выберите категорию</h2>
              <p className="text-zinc-400 mb-6 md:mb-8">С чем связана ваша проблема?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => { haptic('impact', 'light'); setSelectedCategoryId(cat.id); setStep('ROLE'); }}
                  className={`card-base card-hover p-4 md:p-6 text-left group flex flex-col gap-4 animate-slide-up active:scale-95`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                    <cat.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white">{cat.name}</h3>
                    <p className="text-xs md:text-sm text-zinc-500 mt-1">{cat.desc}</p>
                  </div>
                </button>
              ))}
              
              {/* CUSTOM CASE BUTTON */}
              <button
                  onClick={handleCustomCategory}
                  className="card-base card-hover p-4 md:p-6 text-left group flex flex-col gap-4 border-dashed border-zinc-700 bg-transparent hover:bg-zinc-900 animate-slide-up active:scale-95"
                  style={{ animationDelay: `${CATEGORIES.length * 50}ms` }}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 transition-colors">
                    <PlusCircle size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white">Другая ситуация</h3>
                    <p className="text-xs md:text-sm text-zinc-500 mt-1">Опишите свой случай вручную</p>
                  </div>
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- E3: ROLE ---
  if (step === 'ROLE') {
    return (
      <div className="h-full flex flex-col animate-slide-up">
        {!isTgEnvironment && renderHeader("Выбор роли", true)}
        {/* Changed from justify-center to regular flow with padding-bottom for scroll safety */}
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="max-w-2xl w-full mx-auto my-auto min-h-[50vh] flex flex-col justify-center">
            {isTgEnvironment && (
               <button onClick={() => setStep('CATEGORY')} className="text-zinc-500 mb-6 hover:text-white flex items-center gap-2 transition-colors"><ArrowLeft size={16}/> Назад</button>
            )}
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ваша роль?</h2>
            <p className="text-zinc-400 mb-8">Это важно для оценки рисков.</p>

            {isCustomCase ? (
              // CUSTOM ROLE INPUT
              <div className="bg-[#18181b] p-6 rounded-2xl border border-zinc-800 animate-scale-in">
                 <label className="block text-sm font-bold text-zinc-400 mb-2">Назовите вашу роль</label>
                 <input 
                   autoFocus
                   className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 transition-all"
                   placeholder="Например: Арендодатель..."
                   value={customRole}
                   onChange={(e) => setCustomRole(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleCustomRoleSubmit()}
                 />
                 <button 
                   onClick={handleCustomRoleSubmit}
                   disabled={!customRole.trim()}
                   className="w-full btn-primary py-3 rounded-xl font-bold disabled:opacity-50"
                 >
                   Продолжить
                 </button>
              </div>
            ) : (
              // PREDEFINED ROLES
              <div className="grid gap-4">
                {selectedCategory?.roles.map((role, idx) => (
                  <button
                    key={role.id}
                    onClick={() => { haptic('impact', 'medium'); setSelectedRoleId(role.id); setStep('INTAKE'); }}
                    className="card-base card-hover p-6 text-left flex items-center justify-between group animate-slide-up active:scale-95"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <span className="text-lg md:text-xl font-bold text-white">{role.label}</span>
                    <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- E4: INTAKE ---
  if (step === 'INTAKE') {
    return (
      <div className="h-full flex flex-col">
         {!isTgEnvironment && renderHeader("Детали", true)}
         <div className="flex-1 overflow-y-auto p-6 pb-32">
            <div className="max-w-3xl mx-auto py-2 animate-slide-up">
               {isTgEnvironment && (
                 <button onClick={() => setStep('ROLE')} className="text-zinc-500 mb-6 hover:text-white flex items-center gap-2"><ArrowLeft size={16}/> Назад</button>
               )}
               
               <div className="mb-8">
                 <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
                   Дело: {categoryName} • {roleName}
                 </div>
                 <h2 className="text-2xl md:text-3xl font-bold text-white">Уточнение фактов</h2>
               </div>

               <div className="space-y-8">
                 {/* Checkbox Questions (Only for predefined) */}
                 {!isCustomCase && selectedCategory && (
                   <div className="space-y-3">
                     <label className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Чек-лист обстоятельств</label>
                     {selectedCategory.questions.map((q) => (
                        <label key={q.id} className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${answers[q.id] ? 'bg-zinc-800 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'card-base'}`}>
                           <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${answers[q.id] ? 'bg-emerald-500 text-black border-emerald-500' : 'border-zinc-600'}`}>
                             {answers[q.id] && <CheckCircle size={14} />}
                           </div>
                           <input type="checkbox" className="hidden" checked={!!answers[q.id]} onChange={() => toggleAnswer(q.id)} />
                           <span className="text-zinc-200 font-medium text-sm md:text-base">{q.text}</span>
                        </label>
                     ))}
                   </div>
                 )}

                 {/* Details & Files */}
                 <div className="space-y-3">
                   <label className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Детали и документы</label>
                   
                   {/* File Upload Area */}
                   <div className="flex flex-wrap gap-2 mb-2">
                     {files.map((f, i) => (
                       <div key={i} className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-lg text-sm text-zinc-300 border border-zinc-700 animate-scale-in">
                         <FileText size={14} />
                         <span className="truncate max-w-[150px]">{f.name}</span>
                         <button onClick={() => removeFile(i)} className="text-zinc-500 hover:text-white"><X size={14}/></button>
                       </div>
                     ))}
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-zinc-600 text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors text-sm"
                     >
                       <Camera size={14} /> Скан / Фото
                     </button>
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       accept="image/*,application/pdf"
                       multiple
                       capture="environment" 
                       onChange={handleFileUpload}
                     />
                   </div>

                   <textarea 
                     className="w-full bg-[#18181b] border border-zinc-800 rounded-2xl p-5 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[150px] resize-none transition-all"
                     placeholder="Опишите хронологию событий..."
                     value={detailsText}
                     onChange={(e) => setDetailsText(e.target.value)}
                   />
                   <p className="text-xs text-zinc-500 flex items-center gap-2">
                     <FileText size={12} /> Анализ документов производится автоматически с помощью Vision API.
                   </p>
                 </div>
                 
                 {/* Explicit Button for Desktop/Browser or Fallback */}
                 {(!isTgEnvironment || !tg) && (
                    <button 
                      onClick={handleAnalyzeClick} 
                      className="w-full btn-primary py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
                    >
                      Запустить анализ
                      <ArrowRight size={20} />
                    </button>
                 )}
               </div>
            </div>
         </div>
      </div>
    );
  }

  // --- E5: PROCESSING (Enhanced Animation with Logs) ---
  if (step === 'PROCESSING') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#09090b] relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="text-center w-full max-w-md relative z-10">
           {/* Radar/Ripple Animation */}
           <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-10">
              <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ripple" style={{ animationDelay: '0s' }}></div>
              <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ripple" style={{ animationDelay: '0.6s' }}></div>
              <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ripple" style={{ animationDelay: '1.2s' }}></div>
              
              <div className="relative w-24 h-24 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] z-20">
                 <BrainCircuit className="text-emerald-500 animate-breathe" size={48} />
              </div>
           </div>
           
           <h3 className="text-2xl font-bold text-white animate-pulse mb-6">LexHelper анализирует...</h3>
           
           {/* Progress Logs "Messages" */}
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-left space-y-3 min-h-[160px] flex flex-col justify-end">
              {processingLogs.length === 0 && (
                 <div className="text-zinc-600 italic text-sm text-center">Инициализация...</div>
              )}
              {processingLogs.map((log, i) => (
                 <div key={i} className="flex items-center gap-3 animate-slide-up">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-sm text-zinc-300 font-mono">{log}</span>
                 </div>
              ))}
              {/* Fake typing cursor */}
              <div className="flex items-center gap-3 opacity-50">
                  <div className="w-2 h-2 rounded-full border border-zinc-500 shrink-0 animate-pulse"></div>
                  <span className="text-xs text-zinc-600">...</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- E6: CLARIFICATION (Interactive) ---
  if (step === 'CLARIFICATION' && result && result.clarifyingQuestions) {
    return (
      <div className="h-full flex flex-col animate-slide-up">
        {!isTgEnvironment && renderHeader("Уточнение", false)}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full">
             <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 text-blue-400 mb-6">
                   <HelpCircle size={28} />
                   <h2 className="text-2xl font-bold text-white">Нужны уточнения</h2>
                </div>
                
                <div className="space-y-4 mb-6">
                  <p className="text-zinc-300 text-lg">
                    Для точного анализа LexHelper необходимо прояснить следующие моменты:
                  </p>
                  <ul className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    {result.clarifyingQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-zinc-200 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <span className="text-blue-500 font-bold">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Ваш ответ</label>
                   <textarea
                     className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none transition-all"
                     placeholder="Напишите ответы здесь..."
                     value={clarificationInput}
                     onChange={(e) => setClarificationInput(e.target.value)}
                   />
                </div>

                <div className="flex gap-3 mt-6">
                   <button 
                     onClick={() => { haptic('impact', 'medium'); saveToHistory(result, categoryName || '', roleName || ''); setStep('ANALYSIS'); }}
                     className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                   >
                     Пропустить
                   </button>
                   <button 
                     onClick={handleClarificationSubmit}
                     disabled={!clarificationInput.trim()}
                     className="flex-1 btn-primary py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Обновить анализ
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- E7-E19: DASHBOARD (Result) ---
  if (step === 'ANALYSIS' && result) {
    const score = result.legalStrengthScore;
    let scoreColor = 'text-zinc-500';
    let scoreLabel = 'Неопределенно';
    if(score < 30) { scoreColor = 'text-rose-500'; scoreLabel = 'Критическая ситуация'; }
    else if(score < 60) { scoreColor = 'text-amber-500'; scoreLabel = 'Спорная позиция'; }
    else { scoreColor = 'text-emerald-500'; scoreLabel = 'Устойчивая позиция'; }

    return (
      <div className="h-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden relative">
        {!isTgEnvironment && renderHeader("Результат", true)}
        
        {/* DOCUMENT MODAL OVERLAY */}
        {generatedDoc && (
          <div className="absolute inset-0 z-50 bg-[#09090b]/90 backdrop-blur-sm flex items-center justify-center p-6 animate-scale-in">
             <div className="w-full max-w-4xl bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                   <div className="flex items-center gap-3">
                      <FileText className="text-emerald-500" />
                      <h3 className="text-xl font-bold text-white">{generatedDoc.title}</h3>
                   </div>
                   <button onClick={() => setGeneratedDoc(null)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                      <X size={24} className="text-zinc-400 hover:text-white" />
                   </button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-white text-black font-serif leading-relaxed whitespace-pre-wrap shadow-inner">
                   {generatedDoc.content}
                </div>
                <div className="p-6 border-t border-zinc-800 flex justify-end gap-4 bg-[#18181b] rounded-b-2xl">
                   <button 
                      onClick={() => { haptic('impact', 'light'); navigator.clipboard.writeText(generatedDoc.content); }}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                   >
                      <Copy size={18} /> Копировать текст
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex-none p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up delay-0">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Результат анализа</div>
            <h2 className="text-2xl font-bold text-white">{categoryName}</h2>
          </div>
          <button onClick={reset} className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors">
            Вернуться в Дашборд
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-none px-6 pt-4 flex gap-6 border-b border-zinc-800 overflow-x-auto no-scrollbar animate-slide-up delay-100">
          <button 
            onClick={() => { haptic('selection'); setActiveTab('OVERVIEW'); }}
            className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'OVERVIEW' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Обзор и Позиция
          </button>
          <button 
            onClick={() => { haptic('selection'); setActiveTab('STRATEGY'); }}
            className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'STRATEGY' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Стратегия и Сроки
          </button>
          <button 
            onClick={() => { haptic('selection'); setActiveTab('DOCS'); }}
            className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DOCS' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Документы
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="max-w-5xl mx-auto">
            
            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-8">
                {/* Score Card */}
                <div className="card-base p-8 flex flex-col md:flex-row items-center gap-8 bg-[#18181b] animate-slide-up delay-200">
                   <div className="relative w-40 h-40 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className={`${score < 30 ? 'text-rose-600' : score < 60 ? 'text-amber-500' : 'text-emerald-500'} meter-needle`} strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{score}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">из 100</span>
                      </div>
                   </div>
                   <div className="flex-1 text-center md:text-left">
                     <div className={`text-lg font-bold mb-2 ${scoreColor}`}>{scoreLabel}</div>
                     <p className="text-zinc-400 text-sm leading-relaxed">{result.summary}</p>
                   </div>
                </div>

                {/* AI Reasoning Trace */}
                {result.reasoningTrace && result.reasoningTrace.length > 0 && (
                   <div className="bg-[#1e1e24] border border-zinc-800 rounded-xl overflow-hidden animate-slide-up delay-300">
                      <button 
                         onClick={() => { haptic('impact', 'light'); setShowReasoning(!showReasoning); }}
                         className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                         <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 uppercase tracking-wider">
                            <BrainCircuit size={16} />
                            Логика анализа
                         </div>
                         <ChevronRight size={16} className={`text-zinc-500 transition-transform ${showReasoning ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {showReasoning && (
                         <div className="p-4 pt-0 border-t border-zinc-800/50 animate-scale-in origin-top">
                            <ul className="space-y-3 mt-4 relative border-l border-zinc-700 ml-2">
                               {result.reasoningTrace.map((step, i) => (
                                  <li key={i} className="pl-6 relative">
                                     <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-600 border-2 border-[#1e1e24]"></div>
                                     <p className="text-sm text-zinc-300 font-mono">{step}</p>
                                  </li>
                               ))}
                            </ul>
                         </div>
                      )}
                   </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="card-base p-6 animate-slide-up delay-400">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-4 flex items-center gap-2">
                       <TrendingUp size={14}/> Сильные стороны
                    </h3>
                    <ul className="space-y-3">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300 text-sm">
                          <CheckCircle size={16} className="text-emerald-500/50 flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Risks */}
                  <div className="card-base p-6 border-l-4 border-l-rose-500/20 animate-slide-up delay-500">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-4 flex items-center gap-2">
                       <AlertCircle size={14}/> Риски и Угрозы
                    </h3>
                    <ul className="space-y-3">
                      {result.risks.map((r, i) => (
                        <li key={i} className="flex gap-3 text-zinc-300 text-sm">
                          <span className="text-rose-500 flex-shrink-0">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Evidence Check */}
                <div className="card-base p-6 animate-slide-up delay-600">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                     <FileCheck size={14}/> Анализ доказательной базы
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                       <div className="text-sm font-bold text-emerald-400 mb-2">В наличии:</div>
                       <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                         {result.evidenceAssessment.present.length > 0 ? result.evidenceAssessment.present.map((e,i)=><li key={i}>{e}</li>) : <li>Нет данных</li>}
                       </ul>
                     </div>
                     <div>
                       <div className="text-sm font-bold text-amber-500 mb-2">Необходимо собрать:</div>
                       <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                         {result.evidenceAssessment.missing.map((e,i)=><li key={i}>{e}</li>)}
                       </ul>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: STRATEGY --- */}
            {activeTab === 'STRATEGY' && (
              <div className="space-y-6">
                 {/* Deadlines */}
                 <div className="card-base p-6 bg-zinc-900/50 border-zinc-700 animate-slide-up delay-200">
                    <div className="flex items-start gap-4">
                       <div className="p-3 bg-zinc-800 rounded-xl text-zinc-400">
                          <Clock size={24} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-white mb-1">Сроки и Давность</h3>
                          <div className="text-amber-500 font-bold text-sm mb-2 uppercase">{result.deadlines.status}</div>
                          <p className="text-zinc-400 text-sm">{result.deadlines.info}</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Negotiation */}
                    <div className="card-base p-6 animate-slide-up delay-300">
                       <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                         <Users size={20} className="text-blue-400"/> Стратегия переговоров
                       </h3>
                       <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                         {result.strategy.negotiation}
                       </p>
                    </div>

                    {/* Court */}
                    <div className="card-base p-6 animate-slide-up delay-400">
                       <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                         <Gavel size={20} className="text-rose-400"/> Перспективы суда
                       </h3>
                       <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                         {result.strategy.court}
                       </p>
                    </div>
                 </div>
              </div>
            )}

            {/* --- TAB: DOCUMENTS --- */}
            {activeTab === 'DOCS' && (
              <div className="space-y-6">
                 <div className="card-base p-8 text-center animate-slide-up delay-200">
                    <h3 className="text-xl font-bold text-white mb-4">Рекомендованные документы</h3>
                    <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                      Исходя из вашей ситуации, мы рекомендуем подготовить следующий пакет документов.
                    </p>
                    
                    <div className="grid gap-3 max-w-lg mx-auto mb-8">
                       {result.recommendedDocuments.map((doc, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl border border-zinc-700 animate-slide-up" style={{animationDelay: `${i*100}ms`}}>
                            <div className="flex items-center gap-3">
                               <FileText size={20} className="text-zinc-500" />
                               <span className="text-white font-medium">{doc}</span>
                            </div>
                            <button 
                               onClick={() => handleGenerateDoc(doc)}
                               disabled={generatingDocName === doc}
                               className="text-xs font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                               {generatingDocName === doc ? <Loader2 size={12} className="animate-spin"/> : 'СОЗДАТЬ'}
                            </button>
                         </div>
                       ))}
                    </div>

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-200 inline-block animate-scale-in delay-500">
                       <span className="font-bold">New:</span> Теперь вы можете автоматически генерировать проекты документов!
                    </div>
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatInterface;
