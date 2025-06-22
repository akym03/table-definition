import { Database } from '@/domain/entities/Database'

/**
 * Excel出力リポジトリのインターフェース
 */
export interface ExcelRepository {
  /**
   * データベース定義をExcelファイルに書き出し
   */
  exportToExcel(database: Database, outputPath: string): Promise<void>

  /**
   * テンプレートファイルが存在するかチェック
   */
  hasTemplate(): boolean

  /**
   * テンプレートファイルのパスを取得
   */
  getTemplatePath(): string
}
