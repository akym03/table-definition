import { ExcelRepository } from '../../domain/repositories/ExcelRepository'
import { Database } from '../../domain/entities/Database'
import { Table } from '../../domain/entities/Table'
import { ExcelError } from '../../shared/errors/AppError'
import { hasLogicalName } from '../../domain/entities/Name'

import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs/promises'

/**
 * Excel出力リポジトリの実装
 */
export class ExcelRepositoryImpl implements ExcelRepository {
  constructor(private readonly templatePath: string) {}

  /**
   * データベース定義をExcelファイルに書き出し
   */
  async exportToExcel(database: Database, outputPath: string): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook()

      // テーブル一覧シートを作成
      const tablesSheet = workbook.addWorksheet('テーブル一覧')
      await this.createTablesSheet(tablesSheet, database)

      // 各テーブルの詳細シートを作成
      for (const table of database.tables) {
        const tableName = hasLogicalName(table.name)
          ? table.name.logicalName
          : table.name.physicalName
        const tableSheet = workbook.addWorksheet(tableName.substring(0, 31)) // Excel制限
        await this.createTableDetailSheet(tableSheet, table)
      }

      // ファイル出力
      await workbook.xlsx.writeFile(outputPath)
    } catch (error) {
      throw new ExcelError(`Excelファイルの作成に失敗しました: ${error}`)
    }
  }

  /**
   * テンプレートファイルが存在するかチェック
   */
  hasTemplate(): boolean {
    try {
      require('fs').existsSync(this.templatePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * テンプレートファイルのパスを取得
   */
  getTemplatePath(): string {
    return this.templatePath
  }

  /**
   * テーブル一覧シートを作成
   */
  private async createTablesSheet(sheet: ExcelJS.Worksheet, database: Database): Promise<void> {
    // ヘッダー行
    sheet.addRow(['物理名', '論理名', 'スキーマ', 'カラム数', 'コメント'])

    // データ行
    database.tables.forEach((table) => {
      sheet.addRow([
        table.name.physicalName,
        table.name.logicalName,
        table.schema,
        table.columns.length,
        table.name.comment,
      ])
    })

    // スタイル設定
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
  }

  /**
   * テーブル詳細シートを作成
   */
  private async createTableDetailSheet(sheet: ExcelJS.Worksheet, table: Table): Promise<void> {
    // テーブル情報
    sheet.addRow(['テーブル名（物理）', table.name.physicalName])
    sheet.addRow(['テーブル名（論理）', table.name.logicalName])
    sheet.addRow(['スキーマ', table.schema])
    sheet.addRow(['コメント', table.name.comment])
    sheet.addRow([]) // 空行

    // カラム情報ヘッダー
    sheet.addRow([
      '物理名',
      '論理名',
      'データ型',
      'NULL許可',
      'デフォルト値',
      '最大長',
      '精度',
      '小数点',
      'PK',
      'UK',
      '自動増分',
      'コメント',
    ])

    // カラムデータ
    table.columns.forEach((column) => {
      sheet.addRow([
        column.name.physicalName,
        column.name.logicalName,
        column.dataType,
        column.isNullable ? 'YES' : 'NO',
        column.defaultValue || '',
        column.maxLength || '',
        column.precision || '',
        column.scale || '',
        column.isPrimaryKey ? '○' : '',
        column.isUnique ? '○' : '',
        column.isAutoIncrement ? '○' : '',
        column.name.comment,
      ])
    })

    // スタイル設定
    const headerRow = sheet.getRow(6)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
  }
}
