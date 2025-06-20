import { DatabaseRepository } from '../../domain/repositories/DatabaseRepository'
import { ExcelRepository } from '../../domain/repositories/ExcelRepository'
import { DatabaseDefinitionService } from '../../domain/services/DatabaseDefinitionService'
import { ExportRequest, ExportResult } from '../dto/ExportRequest'
import { AppError } from '../../shared/errors/AppError'

/**
 * データベース定義エクスポートユースケース
 */
export class ExportDatabaseDefinitionUseCase {
  constructor(
    private readonly databaseRepository: DatabaseRepository,
    private readonly excelRepository: ExcelRepository,
    private readonly databaseDefinitionService: DatabaseDefinitionService
  ) {}

  /**
   * データベース定義をExcelファイルにエクスポート
   */
  async execute(request: ExportRequest): Promise<ExportResult> {
    try {
      // データベース接続テスト
      const isConnected = await this.databaseRepository.testConnection()
      if (!isConnected) {
        throw new AppError('データベースに接続できません')
      }

      // テーブル定義の取得
      const database = await this.databaseRepository.retrieveTableDefinitions()

      // 対象テーブルのフィルタリング
      if (request.targetTables && request.targetTables.length > 0) {
        database.tables = database.tables.filter(
          (table) =>
            request.targetTables!.includes(table.getPhysicalName()) ||
            request.targetTables!.includes(table.getLogicalName())
        )
      }

      // データベース定義の妥当性チェック
      const validation = this.databaseDefinitionService.validateDatabase(database)
      if (!validation.isValid) {
        throw new AppError(`データベース定義に問題があります: ${validation.errors.join(', ')}`)
      }

      // Excel出力
      await this.excelRepository.exportToExcel(database, request.outputPath)

      // 結果の返却
      return {
        success: true,
        outputPath: request.outputPath,
        exportedTableCount: database.tables.length,
        warnings: validation.warnings,
      }
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          outputPath: request.outputPath,
          exportedTableCount: 0,
          errorMessage: error.message,
          warnings: [],
        }
      }

      return {
        success: false,
        outputPath: request.outputPath,
        exportedTableCount: 0,
        errorMessage: `予期しないエラーが発生しました: ${error}`,
        warnings: [],
      }
    } finally {
      // データベース接続のクリーンアップ
      await this.databaseRepository.close()
    }
  }
}
