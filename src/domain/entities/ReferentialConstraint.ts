/**
 * 参照整合性制約を表現するエンティティ
 */
export class ReferentialConstraint {
  constructor(
    public readonly constraintName: string,
    public readonly sourceTable: string,
    public readonly sourceColumn: string,
    public readonly referencedTable: string,
    public readonly referencedColumn: string,
    public readonly onDelete: ConstraintAction,
    public readonly onUpdate: ConstraintAction,
    public readonly isEnabled: boolean = true
  ) {}

  /**
   * 制約の完全な定義を文字列で取得
   */
  getDefinition(): string {
    return `${this.sourceTable}.${this.sourceColumn} -> ${this.referencedTable}.${this.referencedColumn}`
  }

  /**
   * 制約が有効かどうかを判定
   */
  isValid(): boolean {
    return (
      this.constraintName.length > 0 &&
      this.sourceTable.length > 0 &&
      this.sourceColumn.length > 0 &&
      this.referencedTable.length > 0 &&
      this.referencedColumn.length > 0
    )
  }
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
