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
    };

    fetchInitialData();

    if (!isDemoMode && supabase) {
      const messageChannel = supabase!
        .channel(`messages-${roomId}`)
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
        )
        .subscribe();

      const reactionChannel = supabase!
        .channel(`reactions-${roomId}`)
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
        )
        .subscribe();

      const messageReactionChannel = supabase!
        .channel(`message-reactions-${roomId}`)
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
        )
        .subscribe();

      return () => {
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
        setMessages((prev) => [...prev, { ...newMessage, isSender: true }]);
        return;
      }

      const { error } = await (supabase!.from('messages') as any).insert([newMessage]);
      if (error) {
        console.error('Error sending message:', error);
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
        setReactions((prev) => [...prev, newReaction]);
        return;
      }

      const { error } = await (supabase!.from('reactions') as any).insert([newReaction]);
      if (error) {
        console.error('Error adding reaction:', error);
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
        setMessageReactions((prev) => [...prev, newReaction]);
        return;
      }

      const { error } = await (supabase!.from('message_reactions') as any).insert([newReaction]);
      if (error) {
        console.error('Error adding message reaction:', error);
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
