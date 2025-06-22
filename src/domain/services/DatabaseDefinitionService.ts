import {
  Database,
  CircularReferenceResult,
  findCircularReferences,
  getTableByPhysicalName,
} from '@/domain/entities/Database'
import {
  Table,
  getPrimaryKeyColumns,
  getForeignKeyColumns,
  getTableDisplayName,
} from '../entities/Table'
import { getColumnDisplayName } from '@/domain/entities/Column'

/**
 * データベース定義の妥当性をチェック
 */
export function validateDatabase(database: Database): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 循環参照のチェック
  const circularRefResult = findCircularReferences(database)
  if (circularRefResult.hasCircularReference) {
    const errorMessage = buildCircularReferenceErrorMessage(circularRefResult)
    errors.push(errorMessage)
  }

  // テーブルの妥当性チェック
  database.tables.forEach((table) => {
    const tableValidation = validateTable(table, database)
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
function buildCircularReferenceErrorMessage(result: CircularReferenceResult): string {
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
function validateTable(table: Table, database: Database): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 主キーの存在チェック
  const primaryKeys = getPrimaryKeyColumns(table)
  if (primaryKeys.length === 0) {
    warnings.push(`テーブル ${getTableDisplayName(table)} に主キーが定義されていません`)
  }

  // 外部キー制約の妥当性チェック
  const foreignKeys = getForeignKeyColumns(table)
  foreignKeys.forEach((column) => {
    if (column.foreignKeyConstraint) {
      const referencedTable = getTableByPhysicalName(
        database,
        column.foreignKeyConstraint.referencedTable
      )
      if (!referencedTable) {
        errors.push(
          `テーブル ${getTableDisplayName(table)} のカラム ${getColumnDisplayName(column)} が参照するテーブル ${column.foreignKeyConstraint.referencedTable} が存在しません`
        )
      } else {
        // 参照先カラムの存在チェック
        const referencedColumn = referencedTable.columns.find(
          (col) => col.name.physicalName === column.foreignKeyConstraint!.referencedColumn
        )
        if (!referencedColumn) {
          errors.push(
            `テーブル ${getTableDisplayName(table)} のカラム ${getColumnDisplayName(column)} が参照するカラム ${getTableDisplayName(referencedTable)}.${column.foreignKeyConstraint.referencedColumn} が存在しません`
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
export function analyzeDependencies(database: Database): DependencyAnalysis {
  const dependencies = new Map<string, string[]>()
  const reverseDependencies = new Map<string, string[]>()

  // 依存関係の構築
  database.tables.forEach((table) => {
    const tableName = table.name.physicalName
    const referencedTables = getReferencedTables(table)

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
    topologicalOrder: getTopologicalOrder(dependencies),
  }
}

function getReferencedTables(table: Table): string[] {
  const referencedTables = new Set<string>()

  // カラムの外部キー制約から
  table.columns.forEach((column) => {
    if (column.foreignKeyConstraint) {
      referencedTables.add(column.foreignKeyConstraint.referencedTable)
    }
  })

  // テーブルレベルの参照整合性制約から
  table.referentialConstraints.forEach((constraint) => {
    referencedTables.add(constraint.referencedTable)
  })

  return Array.from(referencedTables)
}

/**
 * トポロジカルソートによる依存関係順序の取得
 */
function getTopologicalOrder(dependencies: Map<string, string[]>): string[] {
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
