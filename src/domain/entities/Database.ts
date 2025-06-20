import { Table } from './Table'
import { ReferentialConstraint } from './ReferentialConstraint'

/**
 * データベースを表現するエンティティ
 */
export class Database {
  constructor(
    public readonly name: string,
    public readonly version: string,
    public readonly charset: string,
    public readonly collation: string,
    public readonly tables: Table[]
  ) {}

  /**
   * 特定のテーブルを物理名で取得
   */
  getTableByPhysicalName(physicalName: string): Table | undefined {
    return this.tables.find((table) => table.getPhysicalName() === physicalName)
  }

  /**
   * 特定のテーブルを論理名で取得
   */
  getTableByLogicalName(logicalName: string): Table | undefined {
    return this.tables.find((table) => table.getLogicalName() === logicalName)
  }

  /**
   * データベース全体の参照整合性制約を取得
   */
  getAllReferentialConstraints(): ReferentialConstraint[] {
    const constraints: ReferentialConstraint[] = []

    this.tables.forEach((table) => {
      constraints.push(...table.getReferentialConstraints())
    })

    return constraints
  }

  /**
   * 参照整合性制約の循環参照をチェック
   */
  checkCircularReferences(): boolean {
    const result = this.findCircularReferences()
    return result.hasCircularReference
  }

  /**
   * 循環参照を検出し、関与するテーブルを特定
   */
  findCircularReferences(): CircularReferenceResult {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const circularPaths: string[][] = []

    for (const table of this.tables) {
      const tableName = table.getPhysicalName()
      if (!visited.has(tableName)) {
        const path: string[] = []
        if (this.detectCircularReference(tableName, visited, recursionStack, path)) {
          circularPaths.push([...path])
        }
      }
    }

    return {
      hasCircularReference: circularPaths.length > 0,
      circularPaths,
      involvedTables: this.getInvolvedTablesWithNames(circularPaths),
    }
  }

  private detectCircularReference(
    tableName: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[]
  ): boolean {
    visited.add(tableName)
    recursionStack.add(tableName)
    currentPath.push(tableName)

    const table = this.getTableByPhysicalName(tableName)
    if (table) {
      const referencedTables = table.getReferencedTables()
      for (const referencedTable of referencedTables) {
        if (!visited.has(referencedTable)) {
          if (this.detectCircularReference(referencedTable, visited, recursionStack, currentPath)) {
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
  private getInvolvedTablesWithNames(circularPaths: string[][]): TableInfo[] {
    const involvedTableNames = new Set<string>()
    circularPaths.forEach((path) => {
      path.forEach((tableName) => involvedTableNames.add(tableName))
    })

    return Array.from(involvedTableNames).map((physicalName) => {
      const table = this.getTableByPhysicalName(physicalName)
      return {
        physicalName,
        logicalName: table?.getLogicalName() || physicalName,
        displayName: table?.getDisplayName() || physicalName,
      }
    })
  }
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
