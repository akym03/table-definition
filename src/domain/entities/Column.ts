import { Name, createName, hasLogicalName, getDisplayName } from '@/domain/entities/Name'
import { ReferentialConstraint } from '@/domain/entities/ReferentialConstraint'

/**
 * データベースカラムを表現するエンティティ
 */
export interface Column {
  readonly name: Name
  readonly dataType: string
  readonly isNullable: boolean
  readonly defaultValue: string | null
  readonly maxLength: number | null
  readonly precision: number | null
  readonly scale: number | null
  readonly isPrimaryKey: boolean
  readonly isUnique: boolean
  readonly isAutoIncrement: boolean
  readonly foreignKeyConstraint: ReferentialConstraint | null
}

/**
 * Columnオブジェクトを作成
 */
export function createColumn(
  physicalName: string,
  comment: string | null,
  dataType: string,
  isNullable: boolean,
  defaultValue: string | null,
  maxLength: number | null,
  precision: number | null,
  scale: number | null,
  isPrimaryKey: boolean,
  isUnique: boolean,
  isAutoIncrement: boolean,
  foreignKeyConstraint: ReferentialConstraint | null = null
): Column {
  return {
    name: createName(physicalName, comment),
    dataType,
    isNullable,
    defaultValue,
    maxLength,
    precision,
    scale,
    isPrimaryKey,
    isUnique,
    isAutoIncrement,
    foreignKeyConstraint,
  }
}

/**
 * 物理名を取得
 */
export function getPhysicalName(column: Column): string {
  return column.name.physicalName
}

/**
 * 論理名を取得
 */
export function getLogicalName(column: Column): string {
  return column.name.logicalName
}

/**
 * 表示名を取得
 */
export function getColumnDisplayName(column: Column): string {
  return getDisplayName(column.name)
}

/**
 * コメントを取得
 */
export function getComment(column: Column): string {
  return column.name.comment
}

/**
 * 外部キー制約があるかどうかを判定
 */
export function hasForeignKey(column: Column): boolean {
  return column.foreignKeyConstraint !== null
}

/**
 * カラム定義の完全な文字列表現を取得
 */
export function getColumnDefinition(column: Column): string {
  let definition = `${getPhysicalName(column)} ${column.dataType}`

  if (column.maxLength) {
    definition += `(${column.maxLength})`
  } else if (column.precision && column.scale) {
    definition += `(${column.precision}, ${column.scale})`
  }

  if (!column.isNullable) {
    definition += ' NOT NULL'
  }

  if (column.defaultValue) {
    definition += ` DEFAULT ${column.defaultValue}`
  }

  if (column.isAutoIncrement) {
    definition += ' AUTO_INCREMENT'
  }

  return definition
}

/**
 * 論理名付きの定義を取得
 */
export function getDefinitionWithLogicalName(column: Column): string {
  const definition = getColumnDefinition(column)
  if (hasLogicalName(column.name)) {
    return `${definition} -- ${getLogicalName(column)}`
  }
  return definition
}
