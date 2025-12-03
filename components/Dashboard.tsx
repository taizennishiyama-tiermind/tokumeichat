'use client';

import { useMemo, useState } from 'react';
import type { Message, Reaction, ReactionType } from '@/types';
import { CommentIcon, ThumbsUpIcon } from './Icons';

interface DashboardProps {
  messages: (Message & { isSender: boolean })[];
  reactions: Reaction[];
}

const MESSAGE_GOAL = 500;
const REACTION_GOAL = 1000;
const SYSTEM_MESSAGE_USER = 'システムメッセージ';

const reactionTypes: Record<ReactionType, { emoji: string; colorClass: string; label: string }> = {
  like: { emoji: '👍', colorClass: 'bg-yellow-500', label: 'いいね' },
  idea: { emoji: '💡', colorClass: 'bg-blue-500', label: 'なるほど' },
  question: { emoji: '🤔', colorClass: 'bg-green-500', label: '疑問' },
  confused: { emoji: '🍊', colorClass: 'bg-purple-500', label: 'みかん！' },
};

function ProgressBar({
  title,
  icon,
  current,
  goal,
  colorClass,
}: {
  title: string;
  icon: React.ReactNode;
  current: number;
  goal: number;
  colorClass: string;
}) {
  const progress = Math.min((current / goal) * 100, 100);

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-corp-gray-800 dark:text-white">{title}</h2>
        </div>
        <p className="text-sm font-semibold text-corp-gray-800 dark:text-white">
          {current} / <span className="text-corp-gray-700 dark:text-corp-gray-300">{goal}</span>
        </p>
      </div>
      <div className="w-full bg-corp-gray-200 dark:bg-corp-gray-700 rounded-full h-2.5">
        <div
          className={`${colorClass} h-2.5 rounded-full`}
          style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
        />
      </div>
    </div>
  );
}

function ReactionDistribution({ reactions }: { reactions: Reaction[] }) {
  const totalReactions = reactions.length;

  const reactionCounts = useMemo(() => {
    const counts: Record<ReactionType, number> = { like: 0, idea: 0, question: 0, confused: 0 };
    reactions.forEach((r) => {
      counts[r.type]++;
    });
    return counts;
  }, [reactions]);

  if (totalReactions === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-corp-gray-800 dark:text-white mb-2 text-center">
        リアクション内訳
      </h3>
      <div className="w-full flex h-3 rounded-full overflow-hidden bg-corp-gray-200 dark:bg-corp-gray-700">
        {(Object.keys(reactionTypes) as ReactionType[]).map((type) => {
          const count = reactionCounts[type];
          const percentage = (count / totalReactions) * 100;
          if (percentage === 0) return null;
          return (
            <div
              key={type}
              className={reactionTypes[type].colorClass}
              style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }}
              title={`${reactionTypes[type].label}: ${count}件 (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-2 text-xs text-corp-gray-700 dark:text-corp-gray-300">
        {(Object.keys(reactionTypes) as ReactionType[]).map((type) => {
          const count = reactionCounts[type];
          const percentage = (count / totalReactions) * 100;
          return (
            <div key={type} className="flex items-center gap-1">
              <span>{reactionTypes[type].emoji}</span>
              <span className="font-semibold">{percentage.toFixed(0)}%</span>
              <span className="text-corp-gray-700 dark:text-corp-gray-300">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ messages, reactions }: DashboardProps) {
  const totalMessages = useMemo(
    () => messages.filter((m) => m.user_id !== SYSTEM_MESSAGE_USER).length,
    [messages]
  );
  const totalReactions = reactions.length;
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="bg-white dark:bg-corp-gray-800 border-b border-corp-gray-200 dark:border-corp-gray-700">
      <div className="max-w-4xl mx-auto">
        {!showMetrics && (
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4 text-xs text-corp-gray-700 dark:text-corp-gray-300">
              <div className="flex items-center gap-1">
                <CommentIcon className="w-3 h-3 text-corp-blue-light" />
                <span className="font-semibold">{totalMessages}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUpIcon className="w-3 h-3 text-yellow-500" />
                <span className="font-semibold">{totalReactions}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMetrics(true)}
              className="px-2 py-1 text-xs font-semibold text-corp-gray-700 dark:text-corp-gray-300 hover:text-corp-blue-light dark:hover:text-corp-blue-light transition-colors"
              aria-label="指標を表示"
            >
              詳細
            </button>
          </div>
        )}

        {showMetrics && (
          <div className="p-4">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setShowMetrics(false)}
                className="px-2 py-1 text-xs font-semibold text-corp-gray-700 dark:text-corp-gray-300 hover:text-corp-blue-light dark:hover:text-corp-blue-light transition-colors"
                aria-label="指標を隠す"
              >
                閉じる
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <ProgressBar
                title="メッセージ目標"
                icon={<CommentIcon className="w-4 h-4 text-corp-blue-light" />}
                current={totalMessages}
                goal={MESSAGE_GOAL}
                colorClass="bg-corp-blue-light"
              />
              <ProgressBar
                title="リアクション目標"
                icon={<ThumbsUpIcon className="w-4 h-4 text-yellow-500" />}
                current={totalReactions}
                goal={REACTION_GOAL}
                colorClass="bg-yellow-500"
              />
            </div>
            <ReactionDistribution reactions={reactions} />
          </div>
        )}
      </div>
    </div>
  );
}
