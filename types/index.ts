export interface Message {
  id: string;
  text: string;
  timestamp: string;
  user_id: string;
  room_id: string;
  is_host: boolean;
  host_name: string | null;
  mentions: string[];
  created_at?: string;
}

export type ReactionType = 'like' | 'idea' | 'question' | 'confused';

export interface Reaction {
  id: string;
  type: ReactionType;
  timestamp: string;
  room_id: string;
  created_at?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  room_id: string;
  timestamp: string;
  type: ReactionType;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: Message;
        Insert: Omit<Message, 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, 'created_at'>;
        Update: Partial<Omit<Reaction, 'id' | 'created_at'>>;
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Omit<MessageReaction, 'created_at'>;
        Update: Partial<Omit<MessageReaction, 'id' | 'created_at'>>;
      };
    };
  };
}
