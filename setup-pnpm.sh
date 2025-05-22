#!/bin/bash

# pnpmがインストールされているか確認
if ! command -v pnpm &> /dev/null
then
    echo "pnpmがインストールされていません。インストールします..."
    npm install -g pnpm
fi

# 依存関係のインストール
echo "依存パッケージをインストールしています..."
pnpm install

# Tailwind CSSの設定
echo "Tailwind CSSを設定しています..."
pnpm exec tailwindcss init -p

# ビルド
echo "プロジェクトをビルドしています..."
pnpm build

echo "環境構築が完了しました！"
echo "Chromeで拡張機能をインストールするには："
echo "1. chrome://extensions/ を開く"
echo "2. デベロッパーモードを有効にする"
echo "3. 「パッケージ化されていない拡張機能を読み込む」をクリック"
echo "4. dist ディレクトリを選択" 