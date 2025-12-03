'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import type { Message, MessageReaction, ReactionType } from '@/types';
import { formatTime } from '@/lib/utils';

interface MessageItemProps {
  message: Message & { isSender: boolean };
  onReact?: (messageId: string, type: ReactionType) => void;
  reactions?: MessageReaction[];
  currentUserId: string;
}

const reactionPalette: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'いいね' },
  idea: { emoji: '💡', label: 'ひらめき' },
  question: { emoji: '🤔', label: '質問' },
  confused: { emoji: '🍊', label: 'みかん！' },
};

export default function MessageItem({
  message,
  onReact,
  reactions = [],
  currentUserId,
}: MessageItemProps) {
  const { text, user_id, timestamp, isSender, is_host, host_name, mentions = [] } = message;
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const reactionCounts = reactions.reduce<Record<ReactionType, number>>(
    (acc, reaction) => {
      const type = reaction.type || 'like';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    { like: 0, idea: 0, question: 0, confused: 0 }
  );
  const hasReacted = reactions.some((r) => r.user_id === currentUserId);
  const reactionOrder: ReactionType[] = ['like', 'idea', 'question', 'confused'];
  const totalReactions = reactionOrder.reduce((sum, type) => sum + (reactionCounts[type] || 0), 0);

  const time = formatTime(timestamp);

  const urlOrMentionRegex = /((https?:\/\/|www\.)[^\s]+)|(@[^\s@]+)/gi;

  const linkClassName = isSender
    ? 'underline text-white decoration-white/70 underline-offset-2 hover:decoration-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 break-all'
    : 'underline text-corp-blue-light hover:text-corp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-corp-blue-light/60 break-all';

  const renderRichText = () => {
    const nodes: Array<string | JSX.Element> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    urlOrMentionRegex.lastIndex = 0;

    while ((match = urlOrMentionRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];

      if (matchIndex > lastIndex) {
        nodes.push(text.slice(lastIndex, matchIndex));
      }

      if (fullMatch.startsWith('@')) {
        nodes.push(
          <span
            key={`mention-${matchIndex}`}
            className={`font-semibold ${isSender ? 'text-white' : 'text-corp-blue-light'} bg-corp-blue-light/10 px-1.5 py-0.5 rounded-full`}
          >
            {fullMatch}
          </span>
        );
      } else {
        const href = fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`;
        nodes.push(
          <a
            key={`link-${matchIndex}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {fullMatch}
          </a>
        );
      }

      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes.map((node, idx) =>
      typeof node === 'string' ? <Fragment key={`text-${idx}`}>{node}</Fragment> : node
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionPicker]);

  const handleReaction = (type: ReactionType) => {
    if (onReact && message.id) {
      onReact(message.id, type);
      setShowReactionPicker(false);
    }
  };

  const displayName = is_host && host_name ? host_name : user_id;
  const isMentioned = mentions.includes(currentUserId);

  return (
    <div className={`flex items-end gap-2 group ${isSender ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`flex flex-col w-full max-w-[85vw] sm:max-w-md lg:max-w-xl ${isSender ? 'items-end' : 'items-start'}`}
      >
        <div className="relative">
          <div
            className={`w-full px-4 py-3 rounded-2xl overflow-hidden ${
              isSender
                ? 'bg-corp-blue-light text-white rounded-br-none'
                : 'bg-white dark:bg-corp-gray-700 text-corp-gray-800 dark:text-corp-gray-200 rounded-bl-none shadow-md'
            }`}
            style={{
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              wordWrap: 'break-word',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {is_host && (
                <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-corp-gray-900 rounded-full">
                  ホスト
                </span>
              )}
              <span className="text-xs font-semibold text-corp-gray-700 dark:text-corp-gray-200">
                {displayName}
              </span>
              {isMentioned && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-corp-blue-light text-white rounded-full">
                  あなた宛
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{renderRichText()}</p>
          </div>

          {onReact && showReactionPicker && (
            <div
              ref={pickerRef}
              className={`absolute ${isSender ? 'right-0' : 'left-0'} top-full mt-1 z-10 bg-white dark:bg-corp-gray-700 rounded-full shadow-lg border border-corp-gray-200 dark:border-corp-gray-600 p-1 flex gap-1`}
            >
              {(Object.keys(reactionPalette) as ReactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-corp-gray-100 dark:hover:bg-corp-gray-600 transition-all transform hover:scale-110 active:scale-95"
                  aria-label={`${reactionPalette[type].label}を送る`}
                >
                  <span className="text-2xl">{reactionPalette[type].emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
          {totalReactions > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {reactionOrder.map((type) => {
                const count = reactionCounts[type] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1 px-2 py-1 rounded-full border bg-corp-gray-100 dark:bg-corp-gray-800 border-corp-gray-200 dark:border-corp-gray-600"
                    title={`${reactionPalette[type].label}: ${count}件`}
                  >
                    <span className="text-sm">{reactionPalette[type].emoji}</span>
                    <span className="text-xs font-semibold text-corp-gray-700 dark:text-corp-gray-300">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className={`px-1 text-xs text-corp-gray-700 dark:text-corp-gray-300 flex items-center gap-2 ${isSender ? 'justify-end' : 'justify-start'} w-full sm:w-auto`}
          >
            <span>{time}</span>
            {onReact && (
              <>
                <span>·</span>
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="flex items-center gap-1 text-corp-gray-400 dark:text-corp-gray-500 hover:text-corp-blue-light dark:hover:text-corp-blue-light font-semibold transition-colors opacity-60 hover:opacity-100"
                  aria-label="リアクションを送る"
                >
                  <span className="text-base">😊</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
