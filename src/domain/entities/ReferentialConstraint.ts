/**
 * 参照整合性制約を表現するエンティティ
 */
export interface ReferentialConstraint {
  readonly constraintName: string
  readonly sourceTable: string
  readonly sourceColumn: string
  readonly referencedTable: string
  readonly referencedColumn: string
  readonly onDelete: ConstraintAction
  readonly onUpdate: ConstraintAction
  readonly isEnabled: boolean
}

/**
 * ReferentialConstraintオブジェクトを作成
 */
export function createReferentialConstraint(
  constraintName: string,
  sourceTable: string,
  sourceColumn: string,
  referencedTable: string,
  referencedColumn: string,
  onDelete: ConstraintAction,
  onUpdate: ConstraintAction,
  isEnabled: boolean = true
): ReferentialConstraint {
  return {
    constraintName,
    sourceTable,
    sourceColumn,
    referencedTable,
    referencedColumn,
    onDelete,
    onUpdate,
    isEnabled,
  }
}

/**
 * 制約の完全な定義を文字列で取得
 */
export function getConstraintDefinition(constraint: ReferentialConstraint): string {
  return `${constraint.sourceTable}.${constraint.sourceColumn} -> ${constraint.referencedTable}.${constraint.referencedColumn}`
}

/**
 * 制約が有効かどうかを判定
 */
export function isValidConstraint(constraint: ReferentialConstraint): boolean {
  return (
    constraint.constraintName.length > 0 &&
    constraint.sourceTable.length > 0 &&
    constraint.sourceColumn.length > 0 &&
    constraint.referencedTable.length > 0 &&
    constraint.referencedColumn.length > 0
  )
}

/**
 * 参照整合性制約のアクション
 */
export enum ConstraintAction {
  CASCADE = 'CASCADE',
  RESTRICT = 'RESTRICT',
  SET_NULL = 'SET NULL',
  SET_DEFAULT = 'SET DEFAULT',
  NO_ACTION = 'NO ACTION',
}
