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
  const [showSharePanel, setShowSharePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [hostName, setHostName] = useState('講演者');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isIOSChrome, setIsIOSChrome] = useState(false);

  const isHostMode = searchParams.get('host') === '1';
  const totalMessageCount = messages.length;
  const totalReactionCount = reactions.length + messageReactions.length;

  // Detect iOS Chrome
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      // iOS Chrome contains 'CriOS' in user agent
      const isiOSChrome = /CriOS/.test(ua);
      setIsIOSChrome(isiOSChrome);
    }
  }, []);

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

  // Handle Android and iOS Chrome keyboard overlap by calculating keyboard height
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (window.visualViewport) {
        // Calculate the difference between window and visual viewport
        // This gives us the keyboard height
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset);

        // For iOS Chrome, also ensure the input stays visible when keyboard opens
        if (isIOSChrome && offset > 0 && textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current && document.activeElement === textareaRef.current) {
              textareaRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }
          }, 100);
        }
      }
    };

    // Set initial offset
    handleResize();

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [isIOSChrome]);

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
        // Reset textarea height after sending
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
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

    // Auto-resize textarea and keep it in view on Android
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
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
      className="flex flex-col bg-gradient-to-br from-corp-gray-50 via-white to-corp-gray-100 dark:from-corp-gray-900 dark:via-corp-gray-900 dark:to-corp-gray-800"
      style={{
        height: '100dvh',
        width: '100dvw',
        overflow: 'hidden',
        paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : '0'
      }}
    >
      <header className="flex flex-col gap-2 p-3 bg-white/90 dark:bg-corp-gray-800/90 backdrop-blur shadow-md z-10 shrink-0 border-b border-corp-gray-200/60 dark:border-corp-gray-700/60">
        <div className="flex items-center justify-between gap-2">
          {canNavigateHome ? (
            <Link
              href="/"
              className="flex items-center gap-1 text-corp-blue-light hover:text-corp-blue transition-colors"
            >
              <BackIcon className="w-5 h-5" />
            </Link>
          ) : (
            <div className="w-5 shrink-0" aria-hidden />
          )}
          <div className="flex-1 text-center min-w-0">
            <h1
              className="text-lg font-bold text-corp-gray-900 dark:text-white truncate"
              title={decodedRoomId}
            >
              {decodedRoomId}
            </h1>
          </div>
          {isHostMode && (
            <button
              onClick={() => setShowSharePanel(!showSharePanel)}
              className="p-2 rounded-full bg-corp-blue-light text-white hover:bg-corp-blue transition-all active:scale-95"
              aria-label="共有リンクを表示"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {isHostMode && showSharePanel && (
          <div className="flex flex-col gap-2 p-3 bg-corp-gray-50 dark:bg-corp-gray-700/50 rounded-lg">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white dark:bg-corp-gray-700 border border-corp-gray-200 dark:border-corp-gray-600 text-corp-gray-800 dark:text-white rounded-lg hover:bg-corp-gray-100 dark:hover:bg-corp-gray-600 transition-colors active:scale-95"
            >
              {isCopied ? <CheckIcon className="w-5 h-5" /> : <ShareIcon className="w-5 h-5" />}
              <span>{isCopied ? 'コピー済み' : '👥 参加用リンク'}</span>
            </button>
            <button
              onClick={handleHostShare}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-corp-blue-light text-white rounded-lg hover:bg-corp-blue transition-colors active:scale-95"
            >
              {isHostLinkCopied ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <ShareIcon className="w-5 h-5" />
              )}
              <span>{isHostLinkCopied ? 'コピー済み' : '👑 ホスト用リンク'}</span>
            </button>
          </div>
        )}
      </header>

      {(isHostMode || isDemoMode) && (
        <div className="bg-gradient-to-r from-yellow-50 via-white to-blue-50 dark:from-corp-gray-800 dark:via-corp-gray-800 dark:to-corp-gray-700 border-b border-corp-gray-200 dark:border-corp-gray-700">
          <div className="px-3 py-2 flex items-center gap-2">
            {isHostMode && (
              <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-corp-gray-900 rounded-full">
                👑 ホスト
              </span>
            )}
            {isDemoMode && (
              <span className="px-2 py-0.5 text-xs font-bold bg-corp-blue-light text-white rounded-full">
                デモ
              </span>
            )}
            {isHostMode && (
              <input
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-corp-gray-200 dark:border-corp-gray-600 bg-white dark:bg-corp-gray-800 text-corp-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-blue-light"
                placeholder="あなたの名前"
                aria-label="ホスト名"
              />
            )}
          </div>
        </div>
      )}

      <Dashboard messages={messages} reactions={reactions} />

      <main
        className="flex-1 overflow-y-auto p-3 sm:p-6"
        style={{
          WebkitOverflowScrolling: 'touch',
          overflowX: 'hidden',
          maxHeight: '100%'
        }}
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
                onFocus={() => {
                  // iOS Chrome needs explicit scrolling to keep input visible
                  if (isIOSChrome && textareaRef.current) {
                    // Wait for keyboard to appear and then scroll
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });
                      }
                    }, 300);
                  }
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={isHostMode ? `${hostName}として投稿...` : '匿名でメッセージを送信...'}
                rows={1}
                className="flex-1 w-full min-h-[2.5rem] sm:min-h-[3rem] p-2 sm:p-3 text-sm sm:text-base bg-corp-gray-100 dark:bg-corp-gray-700 border-2 border-transparent focus:border-corp-blue-light focus:ring-0 rounded-lg resize-none transition text-corp-gray-800"
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
                <button
                  key={type}
                  onClick={() => handleReactionClick(type, emoji)}
                  aria-label={`${label}を送る`}
                  className={`relative w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-corp-gray-700 border ${borderClass} rounded-full ${hoverClass} transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-corp-gray-800`}
                >
                  <span className="text-2xl" aria-hidden>
                    {emoji}
                  </span>
                  {flyingEmojis
                    .filter((fe) => fe.type === type)
                    .map((fe) => (
                      <span
                        key={fe.id}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 text-3xl pointer-events-none animate-fly-up"
                        style={{ userSelect: 'none' }}
                      >
                        {fe.emoji}
                      </span>
                    ))}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
