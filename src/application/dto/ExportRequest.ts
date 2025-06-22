/**
 * エクスポートリクエストDTO
 */
export interface ExportRequest {
  /**
   * 出力ファイルパス
   */
  outputPath: string

  /**
   * テンプレートファイルパス（オプション）
   */
  templatePath?: string

  /**
   * エクスポート対象のテーブル名（指定しない場合は全テーブル）
   */
  targetTables?: string[]

  /**
   * 論理名を優先して出力するか
   */
  preferLogicalNames?: boolean

  /**
   * 参照整合性制約を含めるか
   */
  includeConstraints?: boolean
}

/**
 * エクスポート結果DTO
 */
export interface ExportResult {
  /**
   * 成功したかどうか
   */
  success: boolean

  /**
   * 出力ファイルパス
   */
  outputPath: string

  /**
   * エクスポートしたテーブル数
   */
  exportedTableCount: number

  /**
   * エラーメッセージ（失敗時）
   */
  errorMessage?: string

  /**
   * 警告メッセージ
   */
  warnings: string[]
}
