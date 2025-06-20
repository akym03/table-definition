import { Database, CircularReferenceResult } from '../entities/Database'
import { Table } from '../entities/Table'

/**
 * データベース定義に関するドメインサービス
 */
export class DatabaseDefinitionService {
  /**
   * データベース定義の妥当性をチェック
   */
  validateDatabase(database: Database): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 循環参照のチェック
    const circularRefResult = database.findCircularReferences()
    if (circularRefResult.hasCircularReference) {
      const errorMessage = this.buildCircularReferenceErrorMessage(circularRefResult)
      errors.push(errorMessage)
    }

    // テーブルの妥当性チェック
    database.tables.forEach((table) => {
      const tableValidation = this.validateTable(table, database)
      errors.push(...tableValidation.errors)
      warnings.push(...tableValidation.warnings)
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 循環参照エラーメッセージを構築
   */
  private buildCircularReferenceErrorMessage(result: CircularReferenceResult): string {
    const pathMessages = result.circularPaths.map((path) => {
      const pathWithNames = path.map((physicalName) => {
        const tableInfo = result.involvedTables.find((t) => t.physicalName === physicalName)
        return tableInfo ? tableInfo.displayName : physicalName
      })
      return pathWithNames.join(' → ')
    })

    if (result.circularPaths.length === 1) {
      return `参照整合性制約に循環参照が存在します: ${pathMessages[0]}`
    } else {
      const pathsText = pathMessages.map((path, index) => `${index + 1}. ${path}`).join(', ')
      return `参照整合性制約に複数の循環参照が存在します: ${pathsText}`
    }
  }

  /**
   * テーブル定義の妥当性をチェック
   */
  private validateTable(table: Table, database: Database): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 主キーの存在チェック
    const primaryKeys = table.getPrimaryKeyColumns()
    if (primaryKeys.length === 0) {
      warnings.push(`テーブル ${table.getDisplayName()} に主キーが定義されていません`)
    }

    // 外部キー制約の妥当性チェック
    const foreignKeys = table.getForeignKeyColumns()
    foreignKeys.forEach((column) => {
      if (column.foreignKeyConstraint) {
        const referencedTable = database.getTableByPhysicalName(
          column.foreignKeyConstraint.referencedTable
        )
        if (!referencedTable) {
          errors.push(
            `テーブル ${table.getDisplayName()} のカラム ${column.getDisplayName()} が参照するテーブル ${column.foreignKeyConstraint.referencedTable} が存在しません`
          )
        } else {
          // 参照先カラムの存在チェック
          const referencedColumn = referencedTable.getColumnByPhysicalName(
            column.foreignKeyConstraint.referencedColumn
          )
          if (!referencedColumn) {
            errors.push(
              `テーブル ${table.getDisplayName()} のカラム ${column.getDisplayName()} が参照するカラム ${referencedTable.getDisplayName()}.${column.foreignKeyConstraint.referencedColumn} が存在しません`
            )
          }
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 参照整合性制約の依存関係を分析
   */
  analyzeDependencies(database: Database): DependencyAnalysis {
    const dependencies = new Map<string, string[]>()
    const reverseDependencies = new Map<string, string[]>()

    // 依存関係の構築
    database.tables.forEach((table) => {
      const tableName = table.getPhysicalName()
      const referencedTables = table.getReferencedTables()

      dependencies.set(tableName, referencedTables)

      referencedTables.forEach((referencedTable) => {
        if (!reverseDependencies.has(referencedTable)) {
          reverseDependencies.set(referencedTable, [])
        }
        reverseDependencies.get(referencedTable)!.push(tableName)
      })
    })

    return {
      dependencies,
      reverseDependencies,
      topologicalOrder: this.getTopologicalOrder(dependencies),
    }
  }

  /**
   * トポロジカルソートによる依存関係順序の取得
   */
  private getTopologicalOrder(dependencies: Map<string, string[]>): string[] {
    const visited = new Set<string>()
    const result: string[] = []
    const visiting = new Set<string>()

    const visit = (node: string): void => {
      if (visiting.has(node)) {
        throw new Error(`テーブル間の参照整合性制約に循環依存が検出されました: ${node}`)
      }

      if (visited.has(node)) {
        return
      }

      visiting.add(node)

      const deps = dependencies.get(node) || []
      deps.forEach((dep) => visit(dep))

      visiting.delete(node)
      visited.add(node)
      result.push(node)
    }

    Array.from(dependencies.keys()).forEach((table) => {
      if (!visited.has(table)) {
        visit(table)
      }
    })

    return result
  }
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 依存関係分析結果
 */
export interface DependencyAnalysis {
  dependencies: Map<string, string[]>
  reverseDependencies: Map<string, string[]>
  topologicalOrder: string[]
}
