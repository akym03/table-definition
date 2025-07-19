# CLAUDE.md

このファイルは、このリポジトリでコードを作業する際にClaude Code (claude.ai/code)にガイダンスを提供します。

## プロジェクト概要

これは、MySQLまたはPostgreSQLデータベースからテーブル定義を抽出し、Excel形式でエクスポートするTypeScriptベースのデータベーススキーマ定義エクスポートツールです。プロジェクトは関心の分離を明確にしたクリーンアーキテクチャの原則に従っています。

## 開発コマンド

### ビルドと実行

- `pnpm build` - TypeScriptをJavaScriptにコンパイル
- `pnpm dev` - tsxを使用して開発モードでアプリケーションを実行
- `pnpm start` - コンパイルされたアプリケーションを実行
- `pnpm clean` - distディレクトリを削除

### コード品質

- `pnpm type-check` - ファイルを出力せずにTypeScriptの型チェックを実行
- `pnpm lint` - ソースファイルでESLintを実行
- `pnpm format` - Prettierでコードをフォーマット

### テスト

- `pnpm test` - ウォッチモードでテストを実行
- `pnpm test:run` - テストを一度実行
- `pnpm test:ui` - UIでテストを実行
- `pnpm test:coverage` - カバレッジレポート付きでテストを実行
- `pnpm test:debug` - デバッグモードでテストを実行
- `pnpm test:debug-watch` - デバッグモードでウォッチ付きテストを実行

### データベーステスト

- `docker compose up -d` - MySQLとPostgreSQLのテストコンテナーを起動
- `docker compose down` - コンテナーを停止・削除

## アーキテクチャ

### クリーンアーキテクチャの階層

1. **ドメイン層** (`src/domain/`)
   - エンティティ: コアビジネスオブジェクト（Name、Column、Table、Database、ReferentialConstraint）
   - リポジトリ: データアクセスの抽象インターフェイス
   - サービス: ビジネスロジックとバリデーション

2. **アプリケーション層** (`src/application/`)
   - ユースケース: アプリケーション固有のビジネスルール
   - DTO: ユースケースの入出力用データ転送オブジェクト

3. **インフラストラクチャ層** (`src/infrastructure/`)
   - MySQLとPostgreSQLのデータベースリポジトリ
   - Excelエクスポート実装
   - 設定管理

4. **インターフェイス層** (`src/interface/`)
   - コマンドラインインターフェイス用CLIコントローラー

### 主要コンポーネント

- **DatabaseRepositoryFactory**: 設定に基づいて適切なデータベースリポジトリを作成
- **ExportDatabaseDefinitionUseCase**: データベース定義エクスポートのメインビジネスロジック
- **AppConfig**: 環境ベースの設定管理
- **DatabaseConnectionConfig**: データベース接続設定タイプ

## 主要設計原則

- **ドキュメントファースト手法**: 実装前の包括的システム設計
- **TDD（テスト駆動開発）**: t_wadaが提唱するTDDアプローチを採用

## データベースサポート

アプリケーションはMySQLとPostgreSQLの両方のデータベースをサポートします

- MySQL: `mysql2`パッケージを使用
- PostgreSQL: `pg`パッケージを使用

事前に初期化されたスキーマを持つテストデータベースがDocker Composeで利用可能です。

## テスト戦略

- Vitestを使用したユニットテスト
- データベースリポジトリの統合テスト
- テストカバレッジレポートが利用可能
- IDE統合用のデバッグ設定

## パスエイリアス

プロジェクトはインポートで`src/`ディレクトリのエイリアスとして`@/`を使用します。

## 環境変数

主要な環境変数（AppConfig.tsを参照）：

- `DEFAULT_OUTPUT_PATH`: デフォルトのExcel出力パス
- `TEMPLATE_PATH`: Excelテンプレートファイルパス
- `PREFER_LOGICAL_NAMES`: 物理名より論理名を優先するかどうか
- `INCLUDE_CONSTRAINTS`: 参照整合性制約を含めるかどうか

## CLI使用方法

アプリケーションは以下のコマンドライン引数を受け入れます：

- `-o, --output`: 出力ファイルパス
- `-t, --template`: テンプレートファイルパス
- `--tables`: エクスポートするテーブルのカンマ区切りリスト
- `--logical-names`: 論理名を優先
- `--no-constraints`: 制約を除外
- `-h, --help`: ヘルプを表示
