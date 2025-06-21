import {
  Table,
  getPhysicalName as getTablePhysicalName,
  getLogicalName as getTableLogicalName,
  getTableDisplayName,
  getReferencedTables,
  getReferentialConstraints,
} from './Table'
import { ReferentialConstraint } from './ReferentialConstraint'

/**
 * データベースを表現するエンティティ
 */
export interface Database {
  readonly name: string
  readonly version: string
  readonly charset: string
  readonly collation: string
  readonly tables: Table[]
}

/**
 * Databaseオブジェクトを作成
 */
export function createDatabase(
  name: string,
  version: string,
  charset: string,
  collation: string,
  tables: Table[]
): Database {
  return {
    name,
    version,
    charset,
    collation,
    tables,
  }
}

/**
 * 特定のテーブルを物理名で取得
 */
export function getTableByPhysicalName(
  database: Database,
  physicalName: string
): Table | undefined {
  return database.tables.find((table) => getTablePhysicalName(table) === physicalName)
}

/**
 * 特定のテーブルを論理名で取得
 */
export function getTableByLogicalName(database: Database, logicalName: string): Table | undefined {
  return database.tables.find((table) => getTableLogicalName(table) === logicalName)
}

/**
 * データベース全体の参照整合性制約を取得
 */
export function getAllReferentialConstraints(database: Database): ReferentialConstraint[] {
  const constraints: ReferentialConstraint[] = []

  database.tables.forEach((table) => {
    constraints.push(...getReferentialConstraints(table))
  })

  return constraints
}

/**
 * 参照整合性制約の循環参照をチェック
 */
export function checkCircularReferences(database: Database): boolean {
  const result = findCircularReferences(database)
  return result.hasCircularReference
}

/**
 * 循環参照を検出し、関与するテーブルを特定
 */
export function findCircularReferences(database: Database): CircularReferenceResult {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const circularPaths: string[][] = []

  for (const table of database.tables) {
    const tableName = getTablePhysicalName(table)
    if (!visited.has(tableName)) {
      const path: string[] = []
      if (detectCircularReference(database, tableName, visited, recursionStack, path)) {
        circularPaths.push([...path])
      }
    }
  }

  return {
    hasCircularReference: circularPaths.length > 0,
    circularPaths,
    involvedTables: getInvolvedTablesWithNames(database, circularPaths),
  }
}

function detectCircularReference(
  database: Database,
  tableName: string,
  visited: Set<string>,
  recursionStack: Set<string>,
  currentPath: string[]
): boolean {
  visited.add(tableName)
  recursionStack.add(tableName)
  currentPath.push(tableName)

  const table = getTableByPhysicalName(database, tableName)
  if (table) {
    const referencedTables = getReferencedTables(table)
    for (const referencedTable of referencedTables) {
      if (!visited.has(referencedTable)) {
        if (
          detectCircularReference(database, referencedTable, visited, recursionStack, currentPath)
        ) {
          return true
        }
      } else if (recursionStack.has(referencedTable)) {
        // 循環参照を発見
        const cycleStartIndex = currentPath.indexOf(referencedTable)
        const cyclePath = currentPath.slice(cycleStartIndex)
        cyclePath.push(referencedTable) // 循環を完成
        currentPath.length = 0
        currentPath.push(...cyclePath)
        return true
      }
    }
  }

  recursionStack.delete(tableName)
  currentPath.pop()
  return false
}

/**
 * 関与するテーブルの物理名と論理名の情報を取得
 */
function getInvolvedTablesWithNames(database: Database, circularPaths: string[][]): TableInfo[] {
  const involvedTableNames = new Set<string>()
  circularPaths.forEach((path) => {
    path.forEach((tableName) => involvedTableNames.add(tableName))
  })

  return Array.from(involvedTableNames).map((physicalName) => {
    const table = getTableByPhysicalName(database, physicalName)
    return {
      physicalName,
      logicalName: table ? getTableLogicalName(table) : physicalName,
      displayName: table ? getTableDisplayName(table) : physicalName,
    }
  })
}

/**
 * 循環参照チェック結果
 */
export interface CircularReferenceResult {
  hasCircularReference: boolean
  circularPaths: string[][]
  involvedTables: TableInfo[]
}

/**
 * テーブル情報
 */
export interface TableInfo {
  physicalName: string
  logicalName: string
  displayName: string
}
