'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useChatRoom } from '@/hooks/useChatRoom';
import MessageItem from './MessageItem';
import Dashboard from './Dashboard';
import { SendIcon, ShareIcon, CheckIcon, BackIcon } from './Icons';
import type { ReactionType } from '@/types';

interface FlyingEmoji {
  id: number;
  emoji: string;
  type: ReactionType;
}

interface RoomClientProps {
  roomId: string;
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const searchParams = useSearchParams();
  const decodedRoomId = decodeURIComponent(roomId);
  const {
    messages,
    sendMessage,
    addReaction,
    reactions,
    messageReactions,
    addMessageReaction,
    currentUserId,
    isDemoMode,
  } = useChatRoom(decodedRoomId);
  const [newMessage, setNewMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isHostLinkCopied, setIsHostLinkCopied] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
  const [canNavigateHome, setCanNavigateHome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [hostName, setHostName] = useState('講演者');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isHostMode = searchParams.get('host') === '1';
  const totalMessageCount = messages.length;
  const totalReactionCount = reactions.length + messageReactions.length;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chat-host-name');
      if (stored) setHostName(stored);
    }
  }, []);

  useEffect(() => {
    const queryHostName = searchParams.get('hostName');
    if (queryHostName) {
      setHostName(queryHostName);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-host-name', hostName);
    }
  }, [hostName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setCanNavigateHome(false);
      return;
    }

    const allowHomeKey = `allowHomeNavigation:${decodedRoomId}`;
    const storedValue = sessionStorage.getItem(allowHomeKey) === 'true';
    setCanNavigateHome(storedValue);
  }, [decodedRoomId]);

  const participants = useMemo(() => {
    const map = new Map<string, { id: string; display: string; isHost?: boolean }>();
    messages.forEach((m) => {
      if (!m.user_id) return;
      const display = m.is_host && m.host_name ? m.host_name : m.user_id;
      map.set(m.user_id, { id: m.user_id, display, isHost: m.is_host });
    });
    return Array.from(map.values());
  }, [messages]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newMessage.trim() && !isComposing) {
        const mentionNames = Array.from(
          new Set((newMessage.match(/@([^\s@]+)/g) || []).map((m) => m.replace('@', '')))
        );
        const participantLookup = participants.reduce<Record<string, string>>((acc, p) => {
          acc[p.display] = p.id;
          return acc;
        }, {});
        const mentionIds = mentionNames.map((name) => participantLookup[name]).filter(Boolean);
        sendMessage(newMessage.trim(), { mentions: mentionIds, isHost: isHostMode, hostName });
        setNewMessage('');
        setMentionQuery('');
        setMentionStart(null);
      }
    },
    [newMessage, isComposing, sendMessage, participants, isHostMode, hostName]
  );

  const attendeeShareLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${encodeURIComponent(decodedRoomId)}`;
  }, [decodedRoomId]);

  const hostShareLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/room/${encodeURIComponent(decodedRoomId)}`;
    const hostParam = new URLSearchParams({ host: '1', hostName });
    return `${base}?${hostParam.toString()}`;
  }, [decodedRoomId, hostName]);

  const handleShare = () => {
    if (!attendeeShareLink) return;
    navigator.clipboard.writeText(attendeeShareLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleHostShare = () => {
    if (!hostShareLink) return;
    navigator.clipboard.writeText(hostShareLink).then(() => {
      setIsHostLinkCopied(true);
      setTimeout(() => setIsHostLinkCopied(false), 2000);
    });
  };

  const handleReactionClick = (type: ReactionType, emoji: string) => {
    addReaction(type);
    const newEmoji: FlyingEmoji = { id: Date.now() + Math.random(), emoji, type };
    setFlyingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 1000);
  };

  const reactionButtons: {
    type: ReactionType;
    emoji: string;
    label: string;
    borderClass: string;
    hoverClass: string;
  }[] = [
    {
      type: 'like',
      emoji: '👍',
      label: 'いいね',
      borderClass: 'border-yellow-100/80 focus:ring-yellow-400',
      hoverClass: 'hover:bg-yellow-50 dark:hover:bg-yellow-500/20',
    },
    {
      type: 'idea',
      emoji: '💡',
      label: 'ひらめき',
      borderClass: 'border-blue-100/80 focus:ring-blue-400',
      hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-500/20',
    },
    {
      type: 'question',
      emoji: '🤔',
      label: '質問',
      borderClass: 'border-green-100/80 focus:ring-green-400',
      hoverClass: 'hover:bg-green-50 dark:hover:bg-green-500/20',
    },
    {
      type: 'confused',
      emoji: '🍊',
      label: 'みかん！',
      borderClass: 'border-purple-100/80 focus:ring-purple-400',
      hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-500/20',
    },
  ];

  const mentionCandidates = useMemo(() => {
    if (!mentionQuery) return participants;
    const lower = mentionQuery.toLowerCase();
    return participants.filter((p) => p.display.toLowerCase().includes(lower));
  }, [mentionQuery, participants]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = /@([^\s@]*)$/.exec(textBeforeCursor);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionStart(cursorPos - mentionMatch[1].length - 1);
    } else {
      setMentionQuery('');
      setMentionStart(null);
    }
    setNewMessage(value);
  };

  const insertMention = (display: string) => {
    if (mentionStart === null || !textareaRef.current) return;
    const before = newMessage.slice(0, mentionStart);
    const cursorPos = textareaRef.current.selectionStart || newMessage.length;
    const after = newMessage.slice(cursorPos);
    const insertion = `@${display} `;
    const nextValue = `${before}${insertion}${after}`;
    setNewMessage(nextValue);
    setMentionQuery('');
    setMentionStart(null);
    requestAnimationFrame(() => {
      const nextCursor = before.length + insertion.length;
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      textareaRef.current?.focus();
    });
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-gradient-to-br from-corp-gray-50 via-white to-corp-gray-100 dark:from-corp-gray-900 dark:via-corp-gray-900 dark:to-corp-gray-800 overflow-x-hidden"
      style={{ height: '100dvh' }}
    >
      <header className="flex flex-col gap-3 p-3 sm:p-4 bg-white/90 dark:bg-corp-gray-800/90 backdrop-blur shadow-md z-10 shrink-0 border-b border-corp-gray-200/60 dark:border-corp-gray-700/60">
        <div className="flex items-center justify-between gap-3">
          {canNavigateHome ? (
            <Link
              href="/"
              className="flex items-center gap-2 text-corp-blue-light hover:text-corp-blue transition-colors"
            >
              <BackIcon className="w-6 h-6" />
              <span className="font-semibold hidden sm:inline">ホームに戻る</span>
            </Link>
          ) : (
            <div className="w-6 shrink-0" aria-hidden />
          )}
          <div className="flex-1 text-center">
            <p className="text-xs uppercase tracking-wide text-corp-gray-700 dark:text-corp-gray-300">
              ライブディスカッション
            </p>
            <h1
              className="text-xl sm:text-2xl font-extrabold text-corp-gray-900 dark:text-white truncate"
              title={decodedRoomId}
            >
              <span className="text-corp-gray-700 dark:text-corp-gray-300">ルーム:</span>{' '}
              {decodedRoomId}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-corp-gray-700 dark:text-corp-gray-200">
            <div className="flex flex-col items-end">
              <span className="px-2 py-1 bg-corp-gray-100 dark:bg-corp-gray-700 rounded-full font-semibold">
                {totalMessageCount} 件
              </span>
              <span className="px-2 py-1 bg-corp-gray-100 dark:bg-corp-gray-700 rounded-full font-semibold mt-1">
                リアクション {totalReactionCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3">
          <div className="flex flex-1 gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold bg-white dark:bg-corp-gray-700 border border-corp-gray-200 dark:border-corp-gray-600 text-corp-gray-800 dark:text-white rounded-lg hover:bg-corp-gray-100 dark:hover:bg-corp-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corp-blue-light"
            >
              {isCopied ? <CheckIcon className="w-5 h-5" /> : <ShareIcon className="w-5 h-5" />}
              <span>{isCopied ? '参加リンクをコピー済み' : '参加リンクを共有'}</span>
            </button>
            <button
              onClick={handleHostShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold bg-corp-blue-light text-white rounded-lg hover:bg-corp-blue transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corp-blue-light"
            >
              {isHostLinkCopied ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <ShareIcon className="w-5 h-5" />
              )}
              <span>{isHostLinkCopied ? 'ホストリンクをコピー済み' : 'ホスト専用リンクを共有'}</span>
            </button>
          </div>
          <p className="text-xs text-corp-gray-700 dark:text-corp-gray-300 text-center px-2">
            ホストリンクで入室した場合のみ、名前付きで投稿できます。オーナー権限の共有にもお使いください。
          </p>
        </div>
      </header>

      {(isHostMode || isDemoMode) && (
        <div className="bg-gradient-to-r from-yellow-50 via-white to-blue-50 dark:from-corp-gray-800 dark:via-corp-gray-800 dark:to-corp-gray-700 border-b border-corp-gray-200 dark:border-corp-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-corp-gray-700 dark:text-corp-gray-200">
              {isHostMode && (
                <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-corp-gray-900 rounded-full">
                  ホストモード
                </span>
              )}
              {isDemoMode && (
                <span className="px-2 py-0.5 text-xs font-bold bg-corp-blue-light text-white rounded-full">
                  デモモード
                </span>
              )}
              <span className="font-semibold">講演者や事務局の身分表示をオンにして投稿できます。</span>
            </div>
            {isHostMode && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-lg border border-corp-gray-200 dark:border-corp-gray-600 bg-white dark:bg-corp-gray-800 text-corp-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-blue-light"
                  placeholder="ホスト名"
                  aria-label="ホスト名"
                />
                <span className="text-xs text-corp-gray-700 dark:text-corp-gray-300">
                  例: 司会 / 講演者 / 事務局
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <Dashboard messages={messages} reactions={reactions} />

      <main
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full" aria-live="polite">
          {messages.length === 0 && (
            <div className="bg-white dark:bg-corp-gray-800 border border-corp-gray-200 dark:border-corp-gray-700 rounded-2xl shadow-sm p-6 text-center">
              <p className="text-lg font-bold text-corp-gray-800 dark:text-white">
                まだメッセージがありません
              </p>
              <p className="text-sm text-corp-gray-700 dark:text-corp-gray-300 mt-2">
                最初の一言を送ってディスカッションを始めましょう。
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onReact={addMessageReaction}
              reactions={messageReactions.filter((r) => r.message_id === msg.id)}
              currentUserId={currentUserId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="relative p-3 sm:p-4 bg-white dark:bg-corp-gray-800 border-t border-corp-gray-200 dark:border-corp-gray-700 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-end sm:gap-4">
          <form
            onSubmit={handleSendMessage}
            className="order-1 sm:order-2 flex-1 flex items-center gap-2 sm:gap-4 relative"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={isHostMode ? `${hostName}として投稿...` : '匿名でメッセージを送信...'}
                rows={1}
                className="flex-1 w-full min-h-[2.5rem] sm:min-h-[3rem] p-2 sm:p-3 text-sm sm:text-base bg-corp-gray-100 dark:bg-corp-gray-700 border-2 border-transparent focus:border-corp-blue-light focus:ring-0 rounded-lg resize-none transition"
                style={{ maxHeight: '120px' }}
              />
              {mentionStart !== null && mentionCandidates.length > 0 && (
                <div className="absolute left-0 right-0 -bottom-2 translate-y-full mt-2 bg-white dark:bg-corp-gray-800 border border-corp-gray-200 dark:border-corp-gray-600 rounded-xl shadow-xl z-20">
                  <div className="p-2 text-xs text-corp-gray-700 dark:text-corp-gray-300">
                    メンション先を選択
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-corp-gray-100 dark:divide-corp-gray-700">
                    {mentionCandidates.map((candidate) => (
                      <button
                        type="button"
                        key={candidate.id}
                        onClick={() => insertMention(candidate.display)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-corp-gray-100 dark:hover:bg-corp-gray-700 transition-colors"
                      >
                        <span className="font-semibold text-corp-gray-800 dark:text-white">
                          @{candidate.display}
                        </span>
                        {candidate.isHost && (
                          <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-yellow-400 text-corp-gray-900 rounded-full">
                            ホスト
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="p-2 sm:p-3 bg-corp-blue-light text-white rounded-full hover:bg-corp-blue disabled:bg-gray-400 transition-colors transform active:scale-95 sm:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corp-blue-light"
              disabled={!newMessage.trim()}
            >
              <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </form>
          <div className="order-2 sm:order-1 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto p-2 bg-white/90 dark:bg-corp-gray-700/80 border border-corp-gray-200 dark:border-corp-gray-600 rounded-2xl shadow-md sm:shadow-none sm:bg-transparent sm:dark:bg-transparent sm:border-none">
              {reactionButtons.map(({ type, emoji, label, borderClass, hoverClass }) => (
                <div key={type} className="flex flex-col items-center flex-1 min-w-[64px] sm:min-w-0 sm:w-auto">
                  <button
                    onClick={() => handleReactionClick(type, emoji)}
                    aria-label={`${label}を送る`}
                    className={`relative w-full max-w-[72px] h-12 sm:w-12 sm:h-12 flex items-center justify-center bg-white/90 dark:bg-corp-gray-700 border ${borderClass} rounded-full ${hoverClass} transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-corp-gray-800`}
                  >
                    <span className="text-xl sm:text-2xl" aria-hidden>
                      {emoji}
                    </span>
                    {flyingEmojis
                      .filter((fe) => fe.type === type)
                      .map((fe) => (
                        <span
                          key={fe.id}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 text-2xl sm:text-3xl pointer-events-none animate-fly-up"
                          style={{ userSelect: 'none' }}
                        >
                          {fe.emoji}
                        </span>
                      ))}
                  </button>
                  <span className="mt-1 text-[11px] font-semibold text-corp-gray-700 dark:text-corp-gray-200 sm:hidden">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
