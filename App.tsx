
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useState } from 'react';
import ChatInterface from './components/ChatInterface';
import { Smartphone, Loader2, AlertTriangle, Terminal, X, Wrench, Trash2, CheckCircle, Activity } from 'lucide-react';

// Hardcoded Default Context (Civil Code) - passed silently to AI
const DEFAULT_URLS = [
  "http://pravo.gov.ru/proxy/ips/?docbody=&nd=102041891", // ГК РФ Часть 1
  "http://pravo.gov.ru/proxy/ips/?docbody=&nd=102039308", // ГК РФ Часть 2
  "http://www.consultant.ru/document/cons_doc_LAW_305/", // ЗоЗПП
];

const App: React.FC = () => {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const [appHeight, setAppHeight] = useState<string>('100vh');
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(window.innerWidth < 768);
  
  // Debug State
  const [isDebug, setIsDebug] = useState<boolean>(false);
  const [debugTab, setDebugTab] = useState<'LOGS' | 'TOOLS'>('LOGS');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Tool State
  const [botToken, setBotToken] = useState('');
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.log(`[LexHelper] ${msg}`);
  };

  const handleClearWebhook = async () => {
    if (!botToken.trim()) {
      setToolStatus("Ошибка: Введите токен бота");
      return;
    }
    
    setToolStatus("Отправка запроса...");
    try {
      // deleteWebhook with drop_pending_updates=true fixes stuck updates
      const response = await fetch(`https://api.telegram.org/bot${botToken.trim()}/deleteWebhook?drop_pending_updates=true`);
      const data = await response.json();
      
      if (data.ok) {
        setToolStatus(`Успех: ${data.description}`);
        addLog(`Webhook reset: ${data.description}`);
      } else {
        setToolStatus(`Ошибка API: ${data.description}`);
        addLog(`Webhook reset failed: ${data.description}`);
      }
    } catch (e: any) {
      setToolStatus(`Ошибка сети: ${e.toString()}`);
      addLog(`Network error clearing webhook: ${e}`);
    }
  };

  useEffect(() => {
    // 0. Screen Resize Listener
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // 1. Check for debug flag in URL or Telegram start param
    const params = new URLSearchParams(window.location.search);
    const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    
    if (params.get('debug') === 'true' || tgStartParam === 'debug') {
      setIsDebug(true);
      addLog("Debug mode enabled via URL/StartParam");
    }

    // 2. Global Error Handler
    const handleError = (event: ErrorEvent) => {
      addLog(`CRITICAL ERROR: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog(`UNHANDLED PROMISE: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // 3. Initialize Telegram
    const initTelegram = () => {
      addLog("Starting initialization...");
      
      try {
        const tg = window.Telegram?.WebApp;
        
        if (!tg) {
          addLog("window.Telegram.WebApp is undefined");
          setIsTelegram(false);
          return;
        }

        addLog(`TG Platform: ${tg.platform}`);
        
        tg.ready();
        addLog("Called tg.ready()");
        
        // Robust check: initData string OR initDataUnsafe object with user
        if (tg.initData || tg.initDataUnsafe?.user) {
          addLog("Valid initData or User found. App running in Telegram.");
          setIsTelegram(true);
          
          try {
            tg.expand();
            addLog("Called tg.expand()");
          } catch (e) {
            addLog(`Expand error: ${e}`);
          }
          
          try {
             tg.setHeaderColor('#09090b');
          } catch (e) {
             // ignore color error
          }
          
          // Dynamic height fix
          const syncHeight = () => {
            if (tg.viewportStableHeight) {
              setAppHeight(`${tg.viewportStableHeight}px`);
            }
          };
          
          syncHeight();
          tg.onEvent('viewportChanged', syncHeight);
          
          return () => {
             tg.offEvent('viewportChanged', syncHeight);
             window.removeEventListener('resize', handleResize);
          };
        } else {
          addLog("No initData. App running in Browser/Desktop Mode.");
          setIsTelegram(false); 
        }

      } catch (e: any) {
        addLog(`Init Exception: ${e.toString()}`);
        setIsTelegram(false);
      }
    };

    // Small delay to ensure script injection
    setTimeout(initTelegram, 100);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- RENDERERS ---

  const DebugOverlay = () => {
    if (!isDebug) return null;
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end">
        <div className="bg-black/95 text-green-400 font-mono text-[10px] p-4 h-2/3 overflow-hidden pointer-events-auto border-t-2 border-green-500 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4 border-b border-green-500/30 pb-2 flex-shrink-0">
            <div className="flex items-center gap-4">
               <span className="flex items-center gap-2 font-bold text-lg"><Terminal size={16}/> DEBUG</span>
               <div className="flex bg-green-900/20 rounded p-1 gap-1">
                  <button 
                    onClick={() => setDebugTab('LOGS')}
                    className={`px-3 py-1 rounded ${debugTab === 'LOGS' ? 'bg-green-500 text-black' : 'text-green-500'}`}
                  >
                    LOGS
                  </button>
                  <button 
                    onClick={() => setDebugTab('TOOLS')}
                    className={`px-3 py-1 rounded flex items-center gap-1 ${debugTab === 'TOOLS' ? 'bg-green-500 text-black' : 'text-green-500'}`}
                  >
                    <Wrench size={10} /> TOOLS
                  </button>
               </div>
            </div>
            <button onClick={() => setIsDebug(false)} className="text-red-400 hover:text-white"><X size={20}/></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {debugTab === 'LOGS' ? (
              <div className="space-y-1">
                 {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-white/5 pb-0.5 break-all">{log}</div>
                 ))}
                 <div className="h-4"></div> {/* spacer */}
              </div>
            ) : (
              <div className="p-2 space-y-6">
                 <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                       <Trash2 size={14} className="text-rose-500"/> Очистка Webhook
                    </h3>
                    <p className="text-xs text-zinc-400 mb-3">
                       Если бот "завис" или не отвечает, сбросьте webhook. Это удалит старые настройки и очистит очередь обновлений.
                    </p>
                    <input 
                       type="text" 
                       value={botToken}
                       onChange={(e) => setBotToken(e.target.value)}
                       placeholder="Вставьте токен бота (123:ABC...)"
                       className="w-full bg-black border border-green-800 rounded p-2 text-white mb-3 focus:border-green-500 outline-none"
                    />
                    <button 
                       onClick={handleClearWebhook}
                       className="w-full bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800 text-rose-200 py-2 rounded font-bold transition-colors flex items-center justify-center gap-2"
                    >
                       СБРОСИТЬ ВЕБХУК
                    </button>
                    {toolStatus && (
                       <div className="mt-3 p-2 bg-black rounded border border-green-500/30 text-xs break-all">
                          {toolStatus}
                       </div>
                    )}
                 </div>

                 <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                       <Activity size={14} className="text-blue-500"/> Инфо о сессии
                    </h3>
                    <pre className="text-[9px] text-zinc-400 bg-black p-2 rounded overflow-x-auto">
                       {JSON.stringify(window.Telegram?.WebApp?.initDataUnsafe || { error: "No Data" }, null, 2)}
                    </pre>
                 </div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  // 1. Loading State
  if (isTelegram === null) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400 gap-4 relative">
        <Loader2 size={48} className="animate-spin text-emerald-500" />
        <p className="text-sm font-medium animate-pulse">Загрузка LexHelper...</p>
        
        {logs.length > 0 && (
           <div className="absolute bottom-10 left-0 w-full text-center px-4">
              <p className="text-xs text-zinc-600 mb-2">Последнее действие:</p>
              <p className="text-xs text-zinc-500 font-mono bg-zinc-900 p-2 rounded truncate">
                {logs[logs.length - 1]}
              </p>
           </div>
        )}
        <DebugOverlay />
      </div>
    );
  }

  // 2. Layout Logic
  // showDesktopMockup logic:
  // - FALSE if we are in Telegram (any platform: mobile, desktop, web).
  // - FALSE if we are in a mobile browser (based on screen width).
  // - TRUE ONLY if we are in a Desktop Browser AND NOT in Telegram.
  const showDesktopMockup = isTelegram === false && !isSmallScreen;

  return (
    <div 
      className={`w-screen overflow-hidden bg-[#09090b] text-white ${showDesktopMockup ? 'flex items-center justify-center bg-zinc-950' : ''}`}
      style={{ height: appHeight }}
    >
      <DebugOverlay />
      
      <main 
        className={`h-full w-full relative z-0 flex flex-col ${
          showDesktopMockup 
            ? 'max-w-md h-[95vh] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden bg-black my-auto' 
            : ''
        }`}
      >
           <ChatInterface
             urls={DEFAULT_URLS}
             isTgEnvironment={!!isTelegram}
           />
      </main>
    </div>
  );
};

export default App;
