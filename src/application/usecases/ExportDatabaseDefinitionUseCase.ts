import { DatabaseRepository } from '../../domain/repositories/DatabaseRepository'
import { ExcelRepository } from '../../domain/repositories/ExcelRepository'
import { validateDatabase } from '../../domain/services/DatabaseDefinitionService'
import { ExportRequest, ExportResult } from '../dto/ExportRequest'
import { AppError } from '../../shared/errors/AppError'
import { getPhysicalName, getLogicalName } from '../../domain/entities/Table'

/**
 * データベース定義をExcelファイルにエクスポート
 */
export async function exportDatabaseDefinition(
  databaseRepository: DatabaseRepository,
  excelRepository: ExcelRepository,
  request: ExportRequest
): Promise<ExportResult> {
  try {
    // データベース接続テスト
    const isConnected = await databaseRepository.testConnection()
    if (!isConnected) {
      throw new AppError('データベースに接続できません')
    }

    // テーブル定義の取得
    const database = await databaseRepository.retrieveTableDefinitions()

    // 対象テーブルのフィルタリング
    if (request.targetTables && request.targetTables.length > 0) {
      const filteredTables = database.tables.filter(
        (table) =>
          request.targetTables!.includes(getPhysicalName(table)) ||
          request.targetTables!.includes(getLogicalName(table))
      )

      const filteredDatabase = {
        ...database,
        tables: filteredTables,
      }

      // データベース定義の妥当性チェック
      const validation = validateDatabase(filteredDatabase)
      if (!validation.isValid) {
        throw new AppError(`データベース定義に問題があります: ${validation.errors.join(', ')}`)
      }

      // Excel出力
      await excelRepository.exportToExcel(filteredDatabase, request.outputPath)

      // 結果の返却
      return {
        success: true,
        outputPath: request.outputPath,
        exportedTableCount: filteredDatabase.tables.length,
        warnings: validation.warnings,
      }
    } else {
      // データベース定義の妥当性チェック
      const validation = validateDatabase(database)
      if (!validation.isValid) {
        throw new AppError(`データベース定義に問題があります: ${validation.errors.join(', ')}`)
      }

      // Excel出力
      await excelRepository.exportToExcel(database, request.outputPath)

      // 結果の返却
      return {
        success: true,
        outputPath: request.outputPath,
        exportedTableCount: database.tables.length,
        warnings: validation.warnings,
      }
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
    await databaseRepository.close()
  }
}
