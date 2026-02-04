'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getUserId } from '@/lib/utils';
import type { Message, Reaction, ReactionType, MessageReaction } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SendMessageOptions {
  mentions?: string[];
  isHost?: boolean;
  hostName?: string;
}

// リトライ用のユーティリティ
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useChatRoom(roomId: string) {
  const currentUserIdRef = useRef<string>('');
  const [messages, setMessages] = useState<(Message & { isSender: boolean })[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [messageReactions, setMessageReactions] = useState<MessageReaction[]>([]);
  const isDemoMode = !isSupabaseConfigured;

  // チャンネル参照を保持
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    currentUserIdRef.current = getUserId();
  }, []);

  // 初期データ取得
  const fetchInitialData = useCallback(async () => {
    if (isDemoMode || !supabase) return;

    const [messagesResult, reactionsResult, messageReactionsResult] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true }),
      supabase
        .from('reactions')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true }),
      supabase
        .from('message_reactions')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true }),
    ]);

    if (messagesResult.error) {
      console.error('Error fetching messages:', messagesResult.error);
    } else {
      const messages = (messagesResult.data || []) as Message[];
      setMessages(
        messages.map((m) => ({
          ...m,
          isSender: m.user_id === currentUserIdRef.current,
          mentions: m.mentions || [],
        }))
      );
    }

    if (reactionsResult.error) {
      console.error('Error fetching reactions:', reactionsResult.error);
    } else {
      setReactions(reactionsResult.data || []);
    }

    if (messageReactionsResult.error) {
      console.error('Error fetching message reactions:', messageReactionsResult.error);
    } else {
      setMessageReactions(messageReactionsResult.data || []);
    }
  }, [roomId, isDemoMode]);

  // リアルタイムチャンネルをセットアップ
  const setupRealtimeChannels = useCallback(async () => {
    if (isDemoMode || !supabase || isSubscribedRef.current) return;

    // 既存のチャンネルをクリーンアップ
    channelsRef.current.forEach((channel) => {
      supabase!.removeChannel(channel);
    });
    channelsRef.current = [];

    const subscribeWithRetry = async (
      channel: RealtimeChannel,
      channelName: string
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`${channelName} subscribed successfully`);
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`${channelName} ${status}`);
            resolve(false);
          }
        });
      });
    };

    // メッセージチャンネル
    const messageChannel = supabase
      .channel(`messages-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // 重複チェック（楽観的更新との整合性）
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [
              ...prev,
              {
                ...newMessage,
                isSender: newMessage.user_id === currentUserIdRef.current,
                mentions: newMessage.mentions || [],
              },
            ];
          });
        }
      );

    // リアクションチャンネル
    const reactionChannel = supabase
      .channel(`reactions-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newReaction = payload.new as Reaction;
          setReactions((prev) => {
            if (prev.some((r) => r.id === newReaction.id)) return prev;
            return [...prev, newReaction];
          });
        }
      );

    // メッセージリアクションチャンネル
    const messageReactionChannel = supabase
      .channel(`message-reactions-${roomId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newReaction = payload.new as MessageReaction;
          setMessageReactions((prev) => {
            if (prev.some((r) => r.id === newReaction.id)) return prev;
            return [...prev, newReaction];
          });
        }
      );

    channelsRef.current = [messageChannel, reactionChannel, messageReactionChannel];

    // 全チャンネルをサブスクライブ
    const results = await Promise.all([
      subscribeWithRetry(messageChannel, 'Messages'),
      subscribeWithRetry(reactionChannel, 'Reactions'),
      subscribeWithRetry(messageReactionChannel, 'MessageReactions'),
    ]);

    const allSubscribed = results.every((r) => r);

    if (allSubscribed) {
      isSubscribedRef.current = true;
      retryCountRef.current = 0;
      console.log('All realtime channels subscribed successfully');
    } else {
      // 失敗した場合はリトライ
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        console.log(`Retrying subscription in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        await sleep(delay);
        setupRealtimeChannels();
      } else {
        console.error('Max retries reached for realtime subscription');
      }
    }
  }, [roomId, isDemoMode]);

  // メイン useEffect
  useEffect(() => {
    if (isDemoMode) {
      const now = new Date().toISOString();
      setMessages([
        {
          id: 'system-info',
          text: '接続設定がまだ行われていないためデモ表示中です。Supabase を設定するとリアルタイム同期が有効になります。',
          timestamp: now,
          user_id: 'システムメッセージ',
          isSender: false,
          room_id: roomId,
          is_host: false,
          host_name: null,
          mentions: [],
        },
      ]);
      return;
    }

    // 初期データ取得
    fetchInitialData();

    // リアルタイムチャンネルセットアップ
    setupRealtimeChannels();

    // ページ可視性変更時のハンドラ
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing data and reconnecting...');
        fetchInitialData();
        // リアルタイム接続を再確立
        isSubscribedRef.current = false;
        retryCountRef.current = 0;
        setupRealtimeChannels();
      }
    };

    // オンライン復帰時のハンドラ
    const handleOnline = () => {
      console.log('Network restored, refreshing data and reconnecting...');
      fetchInitialData();
      isSubscribedRef.current = false;
      retryCountRef.current = 0;
      setupRealtimeChannels();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (supabase) {
        const client = supabase;
        channelsRef.current.forEach((channel) => {
          client.removeChannel(channel);
        });
        channelsRef.current = [];
        isSubscribedRef.current = false;
      }
    };
  }, [roomId, isDemoMode, fetchInitialData, setupRealtimeChannels]);

  // メッセージ送信（楽観的更新付き）
  const sendMessage = useCallback(
    async (text: string, options?: SendMessageOptions) => {
      const { mentions = [], isHost = false, hostName } = options || {};
      const now = new Date().toISOString();
      const newMessage: Message = {
        id: `${now}-${Math.random().toString(16).slice(2, 10)}`,
        timestamp: now,
        text,
        room_id: roomId,
        user_id: currentUserIdRef.current,
        mentions,
        is_host: isHost,
        host_name: isHost ? hostName || null : null,
      };

      // 楽観的更新：即座にUIに反映
      setMessages((prev) => [...prev, { ...newMessage, isSender: true }]);

      if (isDemoMode || !supabase) {
        return;
      }

      const { error } = await (supabase.from('messages') as any).insert([newMessage]);
      if (error) {
        console.error('Error sending message:', error);
        // エラー時は楽観的更新をロールバック
        setMessages((prev) => prev.filter((m) => m.id !== newMessage.id));
      }
    },
    [roomId, isDemoMode]
  );

  // リアクション追加（楽観的更新付き）
  const addReaction = useCallback(
    async (type: ReactionType) => {
      const now = new Date().toISOString();
      const newReaction: Reaction = {
        id: `${now}-${Math.random().toString(16).slice(2, 10)}`,
        timestamp: now,
        type,
        room_id: roomId,
      };

      // 楽観的更新
      setReactions((prev) => [...prev, newReaction]);

      if (isDemoMode || !supabase) {
        return;
      }

      const { error } = await (supabase.from('reactions') as any).insert([newReaction]);
      if (error) {
        console.error('Error adding reaction:', error);
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }
    },
    [roomId, isDemoMode]
  );

  // メッセージリアクション追加（楽観的更新付き）
  const addMessageReaction = useCallback(
    async (messageId: string, type: ReactionType) => {
      const now = new Date().toISOString();
      const newReaction: MessageReaction = {
        id: `${now}-${Math.random().toString(16).slice(2, 10)}`,
        timestamp: now,
        message_id: messageId,
        user_id: currentUserIdRef.current,
        room_id: roomId,
        type,
      };

      // 楽観的更新
      setMessageReactions((prev) => [...prev, newReaction]);

      if (isDemoMode || !supabase) {
        return;
      }

      const { error } = await (supabase.from('message_reactions') as any).insert([newReaction]);
      if (error) {
        console.error('Error adding message reaction:', error);
        setMessageReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }
    },
    [roomId, isDemoMode]
  );

  return {
    messages,
    sendMessage,
    addReaction,
    reactions,
    messageReactions,
    addMessageReaction,
    currentUserId: currentUserIdRef.current,
    isDemoMode,
  };
}
