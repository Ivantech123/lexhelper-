
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { ChatMessage, MessageSender } from '../types';
import { Bot, User, Sparkles, Scale } from 'lucide-react';

marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', 
} as any);

interface MessageItemProps {
  message: ChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.sender === MessageSender.USER;
  const isModel = message.sender === MessageSender.MODEL;

  if (message.sender === MessageSender.SYSTEM) {
    return (
      <div className="flex justify-center my-6 animate-in fade-in zoom-in-95 duration-500">
        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase bg-[#2c2c2e]/80 px-4 py-1.5 rounded-full border border-white/5 shadow-sm backdrop-blur-sm">
          {message.text}
        </span>
      </div>
    );
  }

  const renderContent = () => {
    if (isModel && !message.isLoading) {
      const rawMarkup = marked.parse(message.text || "") as string;
      // Using 'prose-headings:font-serif' to give it a more "legal document" feel for headers
      return <div className="prose prose-sm prose-invert prose-p:leading-7 prose-li:marker:text-gray-500" dangerouslySetInnerHTML={{ __html: rawMarkup }} />;
    }
    return <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.text}</div>;
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`
        relative max-w-[90%] md:max-w-[80%] 
        ${isUser ? 'items-end' : 'items-start'} 
        flex flex-col gap-1
      `}>
        {/* Role Indicator (Minimal) */}
        {!isUser && (
           <div className="flex items-center gap-2 ml-1 opacity-70 mb-1.5">
              <div className="bg-indigo-500/20 p-1 rounded-md">
                 <Scale size={12} className="text-indigo-300" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Legal AI Assistant</span>
           </div>
        )}

        {/* Bubble */}
        <div className={`
          p-5 shadow-lg backdrop-blur-xl transition-all duration-300
          ${isUser 
            ? 'bg-[#2c2c2e] text-white rounded-[24px] rounded-br-[4px] border border-white/10' 
            : 'glass-panel text-gray-100 rounded-[24px] rounded-bl-[4px] border border-white/10'
          }
        `}>
          {message.isLoading ? (
            <div className="flex gap-1.5 py-1 px-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          ) : (
            renderContent()
          )}

          {/* Source Pills - Enhanced Visuals */}
          {isModel && message.urlContext && message.urlContext.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center gap-1">
                 <Sparkles size={10} /> Источники
              </div>
              <div className="flex flex-wrap gap-2">
                {message.urlContext.map((meta, i) => (
                  <a 
                    key={i} 
                    href={meta.retrievedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/pill bg-black/40 hover:bg-indigo-900/20 border border-white/5 hover:border-indigo-500/30 px-3 py-2 rounded-xl flex items-center gap-2.5 text-[11px] text-gray-300 hover:text-indigo-200 transition-all"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${meta.urlRetrievalStatus.includes('SUCCESS') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`}></div>
                    <span className="truncate max-w-[200px] font-medium">{new URL(meta.retrievedUrl).hostname}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-[10px] text-gray-600 font-medium mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
