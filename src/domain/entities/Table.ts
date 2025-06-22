import { Name, createName, hasLogicalName, getDisplayName } from '@/domain/entities/Name'
import {
  Column,
  getPhysicalName as getColumnPhysicalName,
  getLogicalName as getColumnLogicalName,
  hasForeignKey,
} from './Column'
import { ReferentialConstraint } from '@/domain/entities/ReferentialConstraint'

/**
 * データベーステーブルを表現するエンティティ
 */
export interface Table {
  readonly name: Name
  readonly schema: string
  readonly columns: Column[]
  readonly referentialConstraints: ReferentialConstraint[]
}

/**
 * Tableオブジェクトを作成
 */
export function createTable(
  physicalName: string,
  comment: string | null,
  schema: string,
  columns: Column[],
  referentialConstraints: ReferentialConstraint[] = []
): Table {
  return {
    name: createName(physicalName, comment),
    schema,
    columns,
    referentialConstraints,
  }
}

/**
 * 物理名を取得
 */
export function getPhysicalName(table: Table): string {
  return table.name.physicalName
}

/**
 * 論理名を取得
 */
export function getLogicalName(table: Table): string {
  return table.name.logicalName
}

/**
 * 表示名を取得
 */
export function getTableDisplayName(table: Table): string {
  return getDisplayName(table.name)
}

/**
 * コメントを取得
 */
export function getComment(table: Table): string {
  return table.name.comment
}

/**
 * 主キーカラムを取得
 */
export function getPrimaryKeyColumns(table: Table): Column[] {
  return table.columns.filter((column) => column.isPrimaryKey)
}

/**
 * 外部キー制約を持つカラムを取得
 */
export function getForeignKeyColumns(table: Table): Column[] {
  return table.columns.filter((column) => hasForeignKey(column))
}

/**
 * 特定のカラムを物理名で取得
 */
export function getColumnByPhysicalName(table: Table, physicalName: string): Column | undefined {
  return table.columns.find((column) => getColumnPhysicalName(column) === physicalName)
}

/**
 * 特定のカラムを論理名で取得
 */
export function getColumnByLogicalName(table: Table, logicalName: string): Column | undefined {
  return table.columns.find((column) => getColumnLogicalName(column) === logicalName)
}

/**
 * このテーブルが参照している他のテーブルを取得
 */
export function getReferencedTables(table: Table): string[] {
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
 * このテーブルに対する参照整合性制約を取得
 */
export function getReferentialConstraints(table: Table): ReferentialConstraint[] {
  const constraints: ReferentialConstraint[] = []

  // カラムレベルの制約
  table.columns.forEach((column) => {
    if (column.foreignKeyConstraint) {
      constraints.push(column.foreignKeyConstraint)
    }
  })

  // テーブルレベルの制約
  constraints.push(...table.referentialConstraints)

  return constraints
}

/**
 * テーブルの完全な定義を取得
 */
export function getDefinition(table: Table): string {
  return `${table.schema}.${getPhysicalName(table)}`
}

/**
 * 論理名付きの定義を取得
 */
export function getDefinitionWithLogicalName(table: Table): string {
  const definition = getDefinition(table)
  if (hasLogicalName(table.name)) {
    return `${definition} -- ${getLogicalName(table)}`
  }
  return definition
}
