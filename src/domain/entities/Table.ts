import { Name } from './Name'
import { Column } from './Column'
import { ReferentialConstraint } from './ReferentialConstraint'

/**
 * データベーステーブルを表現するエンティティ
 */
export class Table {
  public readonly name: Name

  constructor(
    physicalName: string,
    comment: string | null,
    public readonly schema: string,
    public readonly columns: Column[],
    public readonly referentialConstraints: ReferentialConstraint[] = []
  ) {
    this.name = new Name(physicalName, comment)
  }

  /**
   * 物理名を取得
   */
  getPhysicalName(): string {
    return this.name.physicalName
  }

  /**
   * 論理名を取得
   */
  getLogicalName(): string {
    return this.name.logicalName
  }

  /**
   * 表示名を取得
   */
  getDisplayName(): string {
    return this.name.getDisplayName()
  }

  /**
   * コメントを取得
   */
  getComment(): string {
    return this.name.comment
  }

  /**
   * 主キーカラムを取得
   */
  getPrimaryKeyColumns(): Column[] {
    return this.columns.filter((column) => column.isPrimaryKey)
  }

  /**
   * 外部キー制約を持つカラムを取得
   */
  getForeignKeyColumns(): Column[] {
    return this.columns.filter((column) => column.hasForeignKey())
  }

  /**
   * 特定のカラムを物理名で取得
   */
  getColumnByPhysicalName(physicalName: string): Column | undefined {
    return this.columns.find((column) => column.getPhysicalName() === physicalName)
  }

  /**
   * 特定のカラムを論理名で取得
   */
  getColumnByLogicalName(logicalName: string): Column | undefined {
    return this.columns.find((column) => column.getLogicalName() === logicalName)
  }

  /**
   * このテーブルが参照している他のテーブルを取得
   */
  getReferencedTables(): string[] {
    const referencedTables = new Set<string>()

    // カラムの外部キー制約から
    this.columns.forEach((column) => {
      if (column.foreignKeyConstraint) {
        referencedTables.add(column.foreignKeyConstraint.referencedTable)
      }
    })

    // テーブルレベルの参照整合性制約から
    this.referentialConstraints.forEach((constraint) => {
      referencedTables.add(constraint.referencedTable)
    })

    return Array.from(referencedTables)
  }

  /**
   * このテーブルに対する参照整合性制約を取得
   */
  getReferentialConstraints(): ReferentialConstraint[] {
    const constraints: ReferentialConstraint[] = []

    // カラムレベルの制約
    this.columns.forEach((column) => {
      if (column.foreignKeyConstraint) {
        constraints.push(column.foreignKeyConstraint)
      }
    })

    // テーブルレベルの制約
    constraints.push(...this.referentialConstraints)

    return constraints
  }

  /**
   * テーブルの完全な定義を取得
   */
  getDefinition(): string {
    return `${this.schema}.${this.getPhysicalName()}`
  }

  /**
   * 論理名付きの定義を取得
   */
  getDefinitionWithLogicalName(): string {
    const definition = this.getDefinition()
    if (this.name.hasLogicalName()) {
      return `${definition} -- ${this.getLogicalName()}`
    }
    return definition
  }
}
