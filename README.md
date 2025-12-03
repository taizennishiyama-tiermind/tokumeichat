# 匿名リアルタイムチャット

研修の疑問や意見をリアルタイムで共有できる匿名チャットアプリケーションです。

## 機能

- 匿名でのリアルタイムチャット
- ルーム作成・参加
- ホストモード（名前付き投稿）
- リアクション機能（👍💡🤔🍊）
- メンション機能
- ダークモード対応
- モバイルフレンドリー

## セットアップ

### 0. Node.js のインストール (まだの場合)

```bash
# Homebrew を使用する場合
brew install node

# または nvm を使用する場合
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc  # または ~/.bashrc
nvm install 20
nvm use 20
```

### 1. Supabase のセットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. `supabase/schema.sql` の内容を SQL Editor で実行
3. Settings > API から URL と anon key をコピー

### 2. 環境変数の設定

`.env.local` ファイルを作成:

```bash
cp .env.example .env.local
```

`.env.local` を編集して Supabase の認証情報を設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## デプロイ (Vercel)

### 方法1: Vercel CLIを使用

```bash
npm i -g vercel
vercel
```

### 方法2: GitHub連携

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## 開発

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド
npm run start   # 本番サーバー
npm run lint    # リント
```

## 技術スタック

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Hosting**: Vercel

## ディレクトリ構成

```
anonyChat-main/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   ├── globals.css        # グローバルスタイル
│   └── room/[roomId]/     # ルームページ
├── components/            # Reactコンポーネント
├── hooks/                 # カスタムフック
├── lib/                   # ユーティリティ
├── types/                 # TypeScript型定義
├── supabase/              # Supabaseスキーマ
└── public/                # 静的ファイル
```

## ライセンス

MIT
