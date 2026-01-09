'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getUserId } from '@/lib/utils';
import type { Message, Reaction, ReactionType, MessageReaction } from '@/types';

interface SendMessageOptions {
  mentions?: string[];
  isHost?: boolean;
  hostName?: string;
}

export function useChatRoom(roomId: string) {
  const currentUserIdRef = useRef<string>('');
  const [messages, setMessages] = useState<(Message & { isSender: boolean })[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [messageReactions, setMessageReactions] = useState<MessageReaction[]>([]);
  const isDemoMode = !isSupabaseConfigured;

  useEffect(() => {
    currentUserIdRef.current = getUserId();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (isDemoMode || !supabase) {
        const now = new Date().toISOString();
        console.warn('⚠️ Running in DEMO mode - Supabase not configured');
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

      console.log('🔄 Fetching initial data for room:', roomId);

      const [messagesResult, reactionsResult, messageReactionsResult] = await Promise.all([
        supabase!
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('timestamp', { ascending: true }),
        supabase!
          .from('reactions')
          .select('*')
          .eq('room_id', roomId)
          .order('timestamp', { ascending: true }),
        supabase!
          .from('message_reactions')
          .select('*')
          .eq('room_id', roomId)
          .order('timestamp', { ascending: true }),
      ]);

      if (messagesResult.error) {
        console.error('❌ Error fetching messages:', messagesResult.error);
        console.error('Error details:', JSON.stringify(messagesResult.error, null, 2));
      } else {
        const messages = (messagesResult.data || []) as Message[];
        console.log(`✅ Fetched ${messages.length} messages`);
        setMessages(
          messages.map((m) => ({
            ...m,
            isSender: m.user_id === currentUserIdRef.current,
            mentions: m.mentions || [],
          }))
        );
      }

      if (reactionsResult.error) {
        console.error('❌ Error fetching reactions:', reactionsResult.error);
        console.error('Error details:', JSON.stringify(reactionsResult.error, null, 2));
      } else {
        console.log(`✅ Fetched ${reactionsResult.data?.length || 0} reactions`);
        setReactions(reactionsResult.data || []);
      }

      if (messageReactionsResult.error) {
        console.error('❌ Error fetching message reactions:', messageReactionsResult.error);
        console.error('Error details:', JSON.stringify(messageReactionsResult.error, null, 2));
      } else {
        console.log(`✅ Fetched ${messageReactionsResult.data?.length || 0} message reactions`);
        setMessageReactions(messageReactionsResult.data || []);
      }
    };

    fetchInitialData();

    if (!isDemoMode && supabase) {
      const messageChannel = supabase!
        .channel(`messages-${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            console.log('📨 Received new message from realtime:', payload.new);
            const newMessage = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                console.log('⚠️ Duplicate message detected, skipping:', newMessage.id);
                return prev;
              }
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
        )
        .subscribe((status) => {
          console.log('📡 Messages channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Messages channel subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Messages channel error, retrying...');
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Messages channel timed out, retrying...');
          }
        });

      const reactionChannel = supabase!
        .channel(`reactions-${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reactions',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            console.log('👍 Received new reaction from realtime:', payload.new);
            const newReaction = payload.new as Reaction;
            setReactions((prev) => {
              if (prev.some((r) => r.id === newReaction.id)) {
                console.log('⚠️ Duplicate reaction detected, skipping:', newReaction.id);
                return prev;
              }
              return [...prev, newReaction];
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Reactions channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Reactions channel subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Reactions channel error, retrying...');
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Reactions channel timed out, retrying...');
          }
        });

      const messageReactionChannel = supabase!
        .channel(`message-reactions-${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reactions',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            console.log('💬 Received new message reaction from realtime:', payload.new);
            const newReaction = payload.new as MessageReaction;
            setMessageReactions((prev) => {
              if (prev.some((r) => r.id === newReaction.id)) {
                console.log('⚠️ Duplicate message reaction detected, skipping:', newReaction.id);
                return prev;
              }
              return [...prev, newReaction];
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Message reactions channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Message reactions channel subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Message reactions channel error, retrying...');
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Message reactions channel timed out, retrying...');
          }
        });

      // ページが再表示された時にデータを再取得（モバイル対応）
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Page became visible, refreshing data...');
          fetchInitialData();
        }
      };

      // オンライン復帰時にデータを再取得（ネットワーク復帰対応）
      const handleOnline = () => {
        console.log('Network restored, refreshing data...');
        fetchInitialData();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        if (supabase) {
          supabase.removeChannel(messageChannel);
          supabase.removeChannel(reactionChannel);
          supabase.removeChannel(messageReactionChannel);
        }
      };
    }
  }, [roomId, isDemoMode]);

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

      if (isDemoMode || !supabase) {
        console.log('📝 Sending message (DEMO mode):', text);
        setMessages((prev) => [...prev, { ...newMessage, isSender: true }]);
        return;
      }

      console.log('📤 Sending message to Supabase:', { text, roomId, messageId: newMessage.id });
      const { error, data } = await (supabase!.from('messages') as any).insert([newMessage]).select();
      if (error) {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Message sent successfully:', data);
      }
    },
    [roomId, isDemoMode]
  );

  const addReaction = useCallback(
    async (type: ReactionType) => {
      const now = new Date().toISOString();
      const newReaction: Reaction = {
        id: `${now}-${Math.random().toString(16).slice(2, 10)}`,
        timestamp: now,
        type,
        room_id: roomId,
      };

      if (isDemoMode || !supabase) {
        console.log('👍 Adding reaction (DEMO mode):', type);
        setReactions((prev) => [...prev, newReaction]);
        return;
      }

      console.log('📤 Adding reaction to Supabase:', { type, roomId });
      const { error, data } = await (supabase!.from('reactions') as any).insert([newReaction]).select();
      if (error) {
        console.error('❌ Error adding reaction:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Reaction added successfully:', data);
      }
    },
    [roomId, isDemoMode]
  );

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

      if (isDemoMode || !supabase) {
        console.log('👍 Adding message reaction (DEMO mode):', type);
        setMessageReactions((prev) => [...prev, newReaction]);
        return;
      }

      console.log('📤 Adding message reaction to Supabase:', { type, messageId, roomId });
      const { error, data } = await (supabase!.from('message_reactions') as any).insert([newReaction]).select();
      if (error) {
        console.error('❌ Error adding message reaction:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Message reaction added successfully:', data);
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
