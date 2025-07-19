# Excelテンプレート仕様書

## 概要

このドキュメントは、ERMasterのExcelテンプレート形式を参考にしたデータベース定義エクスポート機能の実装仕様を定義します。

## 目的

- MySQLまたはPostgreSQLのデータベース定義を構造化されたExcel形式で出力
- ERMasterとの互換性を保ちながら、独自の拡張機能を提供
- 日本語環境での使用を前提とした設計

## テンプレートファイル構成

### 1. ワークシート構造

ERMasterテンプレートファイルは以下のワークシートで構成されます：

#### 制御用シート
- **表示** - 表示設定シート
- **words** - テンプレート変数定義シート（ERMasterが自動参照）
- **loops** - ループ定義シート（ERMasterが自動参照）

#### テンプレートシート
各シートはERMasterによって複製・データ置換されます：

1. **history_template** - 変更履歴シート
2. **sheet_index_template** - シート一覧シート  
3. **ER図** - ERダイアグラム表示シート
4. **table_template** - 個別テーブル定義シート（テーブルごとに複製）
5. **index_template** - 個別インデックス定義シート（インデックスごとに複製）
6. **sequence_template** - 個別シーケンス定義シート（シーケンスごとに複製）
7. **view_template** - 個別ビュー定義シート（ビューごとに複製）
8. **trigger_template** - 個別トリガー定義シート（トリガーごとに複製）
9. **column_template** - 個別カラム定義シート（カラムごとに複製）
10. **category_template** - カテゴリ別テーブル一覧シート（カテゴリごとに複製）

#### 一覧系テンプレートシート
11. **all_tables_template** - 全テーブル一覧シート
12. **all_indices_template** - 全インデックス一覧シート
13. **all_sequences_template** - 全シーケンス一覧シート
14. **all_view_template** - 全ビュー一覧シート
15. **all_trigger_template** - 全トリガー一覧シート

### 2. テンプレートファイル配置

- ファイル名: `database-definition-template.xlsx`
- 配置場所: `src/infrastructure/excel/templates/`
- 形式: Excel 2007以降 (.xlsx)

## ERMaster形式のテンプレート変数（マーカー）

JavaプログラムとExcelテンプレートファイルの解析結果に基づいて、ERMaster形式では`$`で始まるマーカーを使用してデータの置換位置を指定します。

### 1. テーブル関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$LTN` | テーブル名（論理名） | テーブルの論理名を表示 | `ユーザー` |
| `$PTN` | テーブル名（物理名） | テーブルの物理名を表示 | `users` |
| `$TDSC` | テーブル説明 | テーブルの説明文を表示 | `システムユーザー情報` |
| `$TCON` | テーブル制約 | テーブルの制約情報を表示 | `PRIMARY KEY (id)` |

### 2. カラム関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$LCN` | カラム名（論理名） | カラムの論理名を表示 | `ユーザーID` |
| `$PCN` | カラム名（物理名） | カラムの物理名を表示 | `user_id` |
| `$TYP` | データ型 | カラムのデータ型を表示 | `INT` |
| `$LEN` | データ長 | カラムの長さを表示 | `11` |
| `$DEC` | 小数点以下桁数 | 小数点以下の桁数を表示 | `2` |
| `$CDSC` | カラム説明 | カラムの説明文を表示 | `一意識別子` |
| `$ORD` | カラム順序 | カラムの並び順を表示 | `1` |

### 3. 制約関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$PK` | 主キー | 主キーの場合は○、そうでなければ空 | `○` |
| `$NN` | NOT NULL制約 | NOT NULL制約がある場合は○ | `○` |
| `$UK` | UNIQUE制約 | UNIQUE制約がある場合は○ | `○` |
| `$FK` | 外部キー | 外部キーの場合は○、そうでなければ空 | `○` |
| `$INC` | オートインクリメント | AUTO_INCREMENTの場合は○ | `○` |
| `$DEF` | デフォルト値 | カラムのデフォルト値を表示 | `NULL` |

### 4. 外部キー関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$RFT` | 参照テーブル | 外部キーが参照するテーブル名 | `users` |
| `$RFC` | 参照カラム | 外部キーが参照するカラム名 | `id` |
| `$LRFT` | 参照テーブル（論理名） | 参照テーブルの論理名 | `ユーザー` |
| `$LRFC` | 参照カラム（論理名） | 参照カラムの論理名 | `ユーザーID` |
| `$PRFT` | 参照テーブル（物理名） | 参照テーブルの物理名 | `users` |
| `$PRFC` | 参照カラム（物理名） | 参照カラムの物理名 | `id` |
| `$LRFTC` | 参照テーブル.カラム（論理名） | 論理名での参照情報 | `ユーザー.ユーザーID` |
| `$PRFTC` | 参照テーブル.カラム（物理名） | 物理名での参照情報 | `users.id` |
| `$LFKN` | 外部キー名（論理名） | 外部キー制約の論理名 | `ユーザー参照` |
| `$PFKN` | 外部キー名（物理名） | 外部キー制約の物理名 | `fk_user_id` |

### 5. インデックス関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$PIDX` | インデックス（物理名） | インデックスの物理名を表示 | `idx_user_email` |
| `$LIDX` | インデックス（論理名） | インデックスの論理名を表示 | `メールインデックス` |
| `$PIN` | インデックス名（物理名） | インデックス名の物理名 | `idx_user_email` |
| `$IDSC` | インデックス説明 | インデックスの説明文 | `メール検索用` |
| `$ITYP` | インデックスタイプ | インデックスの種類 | `BTREE` |
| `$IU` | ユニークインデックス | ユニークインデックスの場合は○ | `○` |

### 6. シーケンス関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$PSN` | シーケンス名（物理名） | シーケンスの物理名 | `user_id_seq` |
| `$SDSC` | シーケンス説明 | シーケンスの説明文 | `ユーザーID採番` |
| `$STR` | 開始値 | シーケンスの開始値 | `1` |
| `$MIN` | 最小値 | シーケンスの最小値 | `1` |
| `$MAX` | 最大値 | シーケンスの最大値 | `9999999999` |
| `$CYC` | 繰り返し | 繰り返し設定 | `NO` |
| `$CACHE` | キャッシュ値 | キャッシュサイズ | `1` |

### 7. ビュー関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$LVN` | ビュー名（論理名） | ビューの論理名 | `ユーザー一覧` |
| `$PVN` | ビュー名（物理名） | ビューの物理名 | `user_list_view` |
| `$VDSC` | ビュー説明 | ビューの説明文 | `アクティブユーザー一覧` |
| `$SQL` | SQL文 | ビューのSQL定義 | `SELECT * FROM users WHERE active = 1` |

### 8. トリガー関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$PTGN` | トリガー名（物理名） | トリガーの物理名 | `user_update_trigger` |
| `$TGDSC` | トリガー説明 | トリガーの説明文 | `更新日時自動設定` |

### 9. 複合制約関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$PCUK` | 複合一意キー（物理名） | 複合一意制約の物理名 | `uk_user_email_type` |
| `$LCUK` | 複合一意キー（論理名） | 複合一意制約の論理名 | `メール種別一意` |

### 10. シート制御関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$SHTN` | シート名 | 生成されるシートの名前 | `テーブル定義` |
| `$SHTT` | シートタイプ | シートの種類 | `table` |
| `$NAM` | 名前 | 汎用的な名前フィールド | `users` |
| `$DSC` | 説明 | 汎用的な説明フィールド | `ユーザー情報` |

### 11. 日付・フォーマット関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$DATE` | 日付 | エクスポート日時 | `2024-01-15` |
| `$CON` | 内容 | 変更内容 | `テーブル追加` |
| `$FMT` | フォーマット | 日付フォーマット指定 | `yyyy/MM/dd` |

### 12. ERダイアグラム関連マーカー

| マーカー | 役割 | 説明 | 例 |
|---------|------|------|-----|
| `$ER(1000, 800)` | ERダイアグラム挿入 | 指定サイズでERダイアグラムを挿入 | 画像として挿入 |

## テンプレート変数定義（従来形式との対応）

ERMaster形式のマーカーを従来のテンプレート変数形式にマッピング：

### 1. データベース情報変数

| 変数名 | ERMasterマーカー | 役割 | 期待する値 | 例 |
|--------|-----------------|------|------------|-----|
| `{{database.name}}` | `$NAM` | データベース名 | 文字列 | `test_database` |
| `{{database.description}}` | `$DSC` | データベースの説明 | 文字列（オプション） | `商品管理システムDB` |
| `{{database.exportDate}}` | `$DATE` | エクスポート日時 | 日付文字列 | `2024-01-15 14:30:00` |

### 2. テーブル一覧変数

| 変数名 | ERMasterマーカー | 役割 | 期待する値 | 例 |
|--------|-----------------|------|------------|-----|
| `{{table.no}}` | `$ORD` | テーブル連番 | 数値 | `1` |
| `{{table.physicalName}}` | `$PTN` | テーブル物理名 | 文字列 | `users` |
| `{{table.logicalName}}` | `$LTN` | テーブル論理名 | 文字列 | `ユーザー` |
| `{{table.description}}` | `$TDSC` | テーブル説明 | 文字列（オプション） | `システムユーザー情報` |
| `{{table.primaryKey}}` | `$PK` | 主キー列名 | 文字列（カンマ区切り） | `id` |

### 3. テーブル詳細変数

| 変数名 | ERMasterマーカー | 役割 | 期待する値 | 例 |
|--------|-----------------|------|------------|-----|
| `{{column.no}}` | `$ORD` | 列番号 | 数値 | `1` |
| `{{column.physicalName}}` | `$PCN` | 列物理名 | 文字列 | `user_id` |
| `{{column.logicalName}}` | `$LCN` | 列論理名 | 文字列 | `ユーザーID` |
| `{{column.dataType}}` | `$TYP` | データ型 | 文字列 | `INT` |
| `{{column.length}}` | `$LEN` | データ長 | 数値（オプション） | `11` |
| `{{column.scale}}` | `$DEC` | 小数点以下桁数 | 数値（オプション） | `2` |
| `{{column.nullable}}` | `$NN` | NOT NULL制約 | 文字列（○/×） | `○` |
| `{{column.primaryKey}}` | `$PK` | 主キー | 文字列（○/×） | `○` |
| `{{column.foreignKey}}` | `$FK` | 外部キー | 文字列（○/×） | `×` |
| `{{column.unique}}` | `$UK` | ユニーク制約 | 文字列（○/×） | `○` |
| `{{column.autoIncrement}}` | `$INC` | オートインクリメント | 文字列（○/×） | `○` |
| `{{column.defaultValue}}` | `$DEF` | デフォルト値 | 文字列（オプション） | `NULL` |
| `{{column.description}}` | `$CDSC` | 列説明 | 文字列（オプション） | `一意識別子` |

### 4. インデックス一覧変数

| 変数名 | ERMasterマーカー | 役割 | 期待する値 | 例 |
|--------|-----------------|------|------------|-----|
| `{{index.no}}` | `$ORD` | インデックス連番 | 数値 | `1` |
| `{{index.tableName}}` | `$PTN` | テーブル名 | 文字列 | `users` |
| `{{index.indexName}}` | `$PIN` | インデックス名（物理名） | 文字列 | `idx_users_email` |
| `{{index.indexType}}` | `$ITYP` | インデックス種類 | 文字列 | `BTREE` |
| `{{index.unique}}` | `$IU` | ユニーク制約 | 文字列（○/×） | `○` |
| `{{index.description}}` | `$IDSC` | インデックス説明 | 文字列（オプション） | `メール検索用` |

### 5. 外部キー一覧変数

| 変数名 | ERMasterマーカー | 役割 | 期待する値 | 例 |
|--------|-----------------|------|------------|-----|
| `{{foreignKey.no}}` | `$ORD` | 外部キー連番 | 数値 | `1` |
| `{{foreignKey.constraintName}}` | `$PFKN` | 制約名（物理名） | 文字列 | `fk_orders_user_id` |
| `{{foreignKey.sourceTable}}` | `$PTN` | 参照元テーブル | 文字列 | `orders` |
| `{{foreignKey.sourceColumn}}` | `$PCN` | 参照元列 | 文字列 | `user_id` |
| `{{foreignKey.targetTable}}` | `$PRFT` | 参照先テーブル（物理名） | 文字列 | `users` |
| `{{foreignKey.targetColumn}}` | `$PRFC` | 参照先列（物理名） | 文字列 | `id` |
| `{{foreignKey.referenceInfo}}` | `$PRFTC` | 参照情報（テーブル.列） | 文字列 | `users.id` |

### 6. 条件分岐変数

| 変数名 | 役割 | 期待する値 | 例 |
|--------|------|------------|-----|
| `{{#if includeConstraints}}` | 制約情報表示条件 | 真偽値 | `true` |
| `{{#if preferLogicalNames}}` | 論理名優先表示条件 | 真偽値 | `true` |
| `{{#if hasDescription}}` | 説明欄有無条件 | 真偽値 | `true` |
| `{{#if isNullable}}` | NULL許可条件 | 真偽値 | `false` |
| `{{#if isPrimaryKey}}` | 主キー条件 | 真偽値 | `true` |
| `{{#if isForeignKey}}` | 外部キー条件 | 真偽値 | `false` |
| `{{#if isUnique}}` | ユニーク制約条件 | 真偽値 | `true` |

### 7. 繰り返し処理変数

| 変数名 | 役割 | 期待する値 | 例 |
|--------|------|------------|-----|
| `{{#each tables}}` | テーブル一覧の繰り返し | 配列 | `[table1, table2, ...]` |
| `{{#each columns}}` | 列一覧の繰り返し | 配列 | `[column1, column2, ...]` |
| `{{#each indexes}}` | インデックス一覧の繰り返し | 配列 | `[index1, index2, ...]` |
| `{{#each foreignKeys}}` | 外部キー一覧の繰り返し | 配列 | `[fk1, fk2, ...]` |

### 8. ヘルパー関数

| 関数名 | 役割 | 期待する値 | 例 |
|--------|------|------------|-----|
| `{{formatDate date}}` | 日付フォーマット | 日付文字列 | `2024-01-15 14:30:00` |
| `{{formatBoolean bool}}` | 真偽値フォーマット | ○/× | `○` |
| `{{join array separator}}` | 配列結合 | 文字列 | `id,name,email` |
| `{{default value fallback}}` | デフォルト値設定 | 文字列 | `値または-` |
| `{{truncate text length}}` | 文字列切り詰め | 文字列 | `長いテキスト...` |

## データ構造定義

### 1. ExcelTemplateData

```typescript
interface ExcelTemplateData {
  // データベース全体の情報
  database: {
    name: string;
    version?: string;
    description?: string;
    exportDate: Date;
    exportedBy?: string;
  };
  
  // テーブル一覧
  tables: ExcelTableData[];
  
  // インデックス一覧
  indexes: ExcelIndexData[];
  
  // 外部キー制約一覧
  foreignKeys: ExcelForeignKeyData[];
}
```

### 2. ExcelTableData

```typescript
interface ExcelTableData {
  physicalName: string;
  logicalName: string;
  description?: string;
  columns: ExcelColumnData[];
  primaryKey?: string[];
  indexes: ExcelIndexData[];
  foreignKeys: ExcelForeignKeyData[];
  rowCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 3. ExcelColumnData

```typescript
interface ExcelColumnData {
  physicalName: string;
  logicalName: string;
  dataType: string;
  length?: number;
  precision?: number;
  scale?: number;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
  description?: string;
  ordinalPosition: number;
}
```

### 4. ExcelIndexData

```typescript
interface ExcelIndexData {
  tableName: string;
  indexName: string;
  isUnique: boolean;
  columns: string[];
  indexType?: string; // BTREE, HASH, etc.
  cardinality?: number;
}
```

### 5. ExcelForeignKeyData

```typescript
interface ExcelForeignKeyData {
  constraintName: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  onUpdate?: string; // CASCADE, SET NULL, RESTRICT, etc.
  onDelete?: string; // CASCADE, SET NULL, RESTRICT, etc.
}
```

## 設定項目

### 1. 基本設定

- **論理名優先表示**: 論理名が存在する場合は論理名を優先表示
- **制約情報表示**: 外部キー制約の表示/非表示
- **対象テーブル指定**: 特定のテーブルのみをエクスポート

### 2. 環境変数

```typescript
// AppConfig.ts に追加
static getExcelTemplateConfig() {
  return {
    templatePath: process.env.TEMPLATE_PATH || 
      './src/infrastructure/excel/templates/database-definition-template.xlsx',
    preferLogicalNames: process.env.PREFER_LOGICAL_NAMES === 'true',
    includeConstraints: process.env.INCLUDE_CONSTRAINTS !== 'false',
    maxRowsPerSheet: parseInt(process.env.MAX_ROWS_PER_SHEET || '1000000'),
    dateFormat: process.env.DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss'
  };
}
```

## 実装要件

### 1. 必須機能

- [ ] テンプレートファイルの読み込み
- [ ] データベース情報の取得と変換
- [ ] 各ワークシートへのデータ出力
- [ ] 動的テーブル詳細シート生成
- [ ] スタイル適用
- [ ] ファイル保存

### 2. 拡張機能

- [ ] 複数テンプレートサポート
- [ ] カスタムスタイル設定
- [ ] 大量データ対応（シート分割）
- [ ] 進捗表示
- [ ] エラーハンドリング

### 3. パフォーマンス要件

- 1000テーブル以下のデータベースで5分以内での出力完了
- メモリ使用量：500MB以下
- 同時実行：対応不要（単一プロセス）

### 4. 属性を追加

エンティティの不足プロパティを追加する必要があります：

#### Database エンティティ
- [ ] `description?: string` - データベースの説明
- [ ] `exportDate?: Date` - エクスポート日時
- [ ] `exportedBy?: string` - エクスポート実行者
- [ ] `indexes: DbIndex[]` - データベース全体のインデックス一覧
- [ ] `createdAt?: Date` - データベース作成日時
- [ ] `updatedAt?: Date` - データベース更新日時

#### Table エンティティ
- [ ] `rowCount?: number` - テーブル行数
- [ ] `createdAt?: Date` - テーブル作成日時
- [ ] `updatedAt?: Date` - テーブル更新日時
- [x] `indexes: DbIndex[]` - テーブルのインデックス一覧（実装済み）

#### Column エンティティ
- [ ] `ordinalPosition: number` - 列の順序番号

#### ReferentialConstraint エンティティ
- [ ] `sourceColumns: string[]` - 参照元列（複数列対応）
- [ ] `referencedColumns: string[]` - 参照先列（複数列対応）

#### 新規エンティティ
- [x] `DbIndex` - インデックス情報（実装済み）
- [ ] `ExportContext` - エクスポート時の設定情報

#### ExportContext エンティティ（新規作成予定）
```typescript
interface ExportContext {
  readonly exportDate: Date;
  readonly exportedBy?: string;
  readonly includeConstraints: boolean;
  readonly preferLogicalNames: boolean;
  readonly targetTables?: string[];
  readonly outputPath: string;
  readonly templatePath?: string;
}
```

## テスト要件

### 1. 単体テスト

- データ変換ロジックのテスト
- スタイル適用のテスト
- エラーハンドリングのテスト

### 2. 統合テスト

- MySQL/PostgreSQLからの実際のデータ取得
- 完全なExcelファイル生成
- 生成されたファイルの妥当性検証

### 3. パフォーマンステスト

- 大量データでの処理時間測定
- メモリ使用量測定
- 異常ケースでの動作確認

## 制限事項

1. **Excelシート名制限**: 31文字以内、特殊文字使用不可
2. **最大行数**: 1,048,576行（Excel制限）
3. **最大列数**: 16,384列（Excel制限）
4. **ファイルサイズ**: 推奨100MB以下
5. **同時実行**: 非対応

## 今後の拡張予定

1. **PDF出力対応**: Excelと同等のレイアウトでPDF出力
2. **Web UI**: ブラウザベースの設定・プレビュー機能
3. **スケジュール出力**: 定期的な自動出力機能
4. **差分出力**: 前回出力との差分表示
5. **多言語対応**: 英語、中国語テンプレート
