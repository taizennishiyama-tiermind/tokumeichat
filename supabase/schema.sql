-- =====================================================
-- 匿名リアルタイムチャット - Supabase スキーマ
-- =====================================================
-- このSQLをSupabase SQL Editorで実行してください

-- 既存テーブルの削除（必要な場合のみ）
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- =====================================================
-- messages テーブル
-- =====================================================
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  host_name TEXT,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- room_id でのクエリを高速化するインデックス
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_room_timestamp ON messages(room_id, timestamp);

-- =====================================================
-- reactions テーブル (ルーム全体へのリアクション)
-- =====================================================
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('like', 'idea', 'question', 'confused')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  room_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- room_id でのクエリを高速化するインデックス
CREATE INDEX idx_reactions_room_id ON reactions(room_id);

-- =====================================================
-- message_reactions テーブル (個別メッセージへのリアクション)
-- =====================================================
CREATE TABLE message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('like', 'idea', 'question', 'confused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_message_reactions_room_id ON message_reactions(room_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);

-- =====================================================
-- Row Level Security (RLS) の設定
-- =====================================================

-- RLSを有効化
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- messages テーブルのポリシー
CREATE POLICY "誰でもメッセージを閲覧できる" ON messages
  FOR SELECT USING (true);

CREATE POLICY "誰でもメッセージを作成できる" ON messages
  FOR INSERT WITH CHECK (true);

-- reactions テーブルのポリシー
CREATE POLICY "誰でもリアクションを閲覧できる" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "誰でもリアクションを追加できる" ON reactions
  FOR INSERT WITH CHECK (true);

-- message_reactions テーブルのポリシー
CREATE POLICY "誰でもメッセージリアクションを閲覧できる" ON message_reactions
  FOR SELECT USING (true);

CREATE POLICY "誰でもメッセージリアクションを追加できる" ON message_reactions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- Realtime を有効化
-- =====================================================
-- Supabase Dashboard > Database > Replication で設定するか、
-- 以下のSQLを実行してください

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- =====================================================
-- 完了メッセージ
-- =====================================================
-- スキーマのセットアップが完了しました！
--
-- 次のステップ:
-- 1. Supabase Dashboard > Settings > API から URL と anon key を取得
-- 2. .env.local ファイルに環境変数を設定
-- 3. npm run dev でアプリを起動
