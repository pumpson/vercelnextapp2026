'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FileText, Plus, Trash2, Edit3, Eye } from 'lucide-react';

interface Memo {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export default function MarkdownMemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedMemos = localStorage.getItem('markdown-memos-data');
    if (savedMemos) {
      try {
        const parsed = JSON.parse(savedMemos);
        setMemos(parsed);
        if (parsed.length > 0) {
          setActiveMemoId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse memos from local storage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('markdown-memos-data', JSON.stringify(memos));
    }
  }, [memos, isLoaded]);

  const createNewMemo = () => {
    const newMemo: Memo = {
      id: Date.now().toString(),
      title: '無題のメモ',
      content: '# 新しいメモ\n\nここにMarkdownで記述します。',
      updatedAt: Date.now(),
    };
    setMemos([newMemo, ...memos]);
    setActiveMemoId(newMemo.id);
    setIsPreview(false);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const deleteMemo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('このメモを削除してもよろしいですか？')) {
      const newMemos = memos.filter(m => m.id !== id);
      setMemos(newMemos);
      if (activeMemoId === id) {
        setActiveMemoId(newMemos.length > 0 ? newMemos[0].id : null);
      }
    }
  };

  const activeMemo = useMemo(() => memos.find(m => m.id === activeMemoId), [memos, activeMemoId]);

  const updateActiveMemo = (field: 'title' | 'content', value: string) => {
    if (!activeMemoId) return;
    setMemos(prevMemos => prevMemos.map(memo =>
      memo.id === activeMemoId
        ? { ...memo, [field]: value, updatedAt: Date.now() }
        : memo
    ));
  };

  const getMarkdownText = () => {
    if (!activeMemo) return { __html: '' };
    const rawMarkup = marked.parse(activeMemo.content) as string;
    const cleanMarkup = DOMPurify.sanitize(rawMarkup);
    return { __html: cleanMarkup };
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen bg-white text-gray-800 font-sans">
      <div className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        fixed md:relative z-20 md:translate-x-0 w-64 h-full bg-gray-50 border-r border-gray-200 transition-transform duration-300 flex flex-col
      `}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0">
          <h1 className="font-bold text-gray-700 flex items-center gap-2">
            <FileText size={20} className="text-blue-500"/>
            Memo
          </h1>
          <button
            onClick={createNewMemo}
            className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
            title="新規作成"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {memos.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm mt-10">
              メモがありません。<br/>右上の＋ボタンから作成してください。
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {memos.map(memo => (
                <li key={memo.id}>
                  <button
                    onClick={() => {
                      setActiveMemoId(memo.id);
                      if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-100 transition-colors flex justify-between items-start group ${
                      activeMemoId === memo.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <h3 className="font-medium text-gray-800 truncate">{memo.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(memo.updatedAt)}</p>
                    </div>
                    <div
                      onClick={(e) => deleteMemo(memo.id, e)}
                      className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {showSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-10"
          onClick={() => setShowSidebar(false)}
        />
      )}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {activeMemo ? (
          <>
            <header className="border-b border-gray-200 p-3 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowSidebar(true)}
                >
                  <FileText size={20} />
                </button>
                <input
                  type="text"
                  value={activeMemo.title}
                  onChange={(e) => updateActiveMemo('title', e.target.value)}
                  className="text-lg font-bold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 w-full truncate px-2"
                  placeholder="タイトルを入力..."
                />
              </div>
              <div className="md:hidden flex bg-gray-100 p-1 rounded-lg ml-2 shrink-0">
                <button
                  onClick={() => setIsPreview(false)}
                  className={`p-1.5 rounded-md ${!isPreview ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => setIsPreview(true)}
                  className={`p-1.5 rounded-md ${isPreview ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                  <Eye size={18} />
                </button>
              </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
              <div className={`flex-1 flex flex-col ${isPreview ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden bg-gray-50 text-xs text-gray-500 p-2 border-b text-center tracking-widest uppercase">Editor</div>
                <textarea
                  value={activeMemo.content}
                  onChange={(e) => updateActiveMemo('content', e.target.value)}
                  className="flex-1 w-full p-6 resize-none border-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed text-gray-700 md:border-r border-gray-200"
                  placeholder="Markdownを入力してください..."
                />
              </div>
              <div className={`flex-1 flex flex-col bg-gray-50 overflow-y-auto ${!isPreview ? 'hidden md:flex' : 'flex'}`}>
                <div className="md:hidden bg-gray-200 text-xs text-gray-600 p-2 border-b text-center tracking-widest uppercase">Preview</div>
                <div
                  className="p-8 markdown-body prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={getMarkdownText()}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <FileText size={64} className="mb-4 opacity-20" />
            <p>メモを選択するか、新しく作成してください</p>
          </div>
        )}
      </div>
    </div>
  );
}
