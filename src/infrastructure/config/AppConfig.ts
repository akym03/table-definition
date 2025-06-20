/**
 * アプリケーション設定を管理するクラス
 */
export class AppConfig {
  /**
   * デフォルトのExcel出力パスを取得
   */
  static getDefaultOutputPath(): string {
    return process.env.DEFAULT_OUTPUT_PATH || './database-definition.xlsx'
  }

  /**
   * テンプレートファイルのパスを取得
   */
  static getTemplatePath(): string {
    return (
      process.env.TEMPLATE_PATH ||
      './src/infrastructure/excel/templates/database-definition-template.xlsx'
    )
  }

  /**
   * 論理名を優先するかどうかを取得
   */
  static preferLogicalNames(): boolean {
    return process.env.PREFER_LOGICAL_NAMES === 'true'
  }

  /**
   * 参照整合性制約を含めるかどうかを取得
   */
  static includeConstraints(): boolean {
    return process.env.INCLUDE_CONSTRAINTS !== 'false' // デフォルトはtrue
  }
}
