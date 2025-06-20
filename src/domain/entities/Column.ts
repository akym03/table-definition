import { Name } from './Name'
import { ReferentialConstraint } from './ReferentialConstraint'

/**
 * データベースカラムを表現するエンティティ
 */
export class Column {
  public readonly name: Name

  constructor(
    physicalName: string,
    comment: string | null,
    public readonly dataType: string,
    public readonly isNullable: boolean,
    public readonly defaultValue: string | null,
    public readonly maxLength: number | null,
    public readonly precision: number | null,
    public readonly scale: number | null,
    public readonly isPrimaryKey: boolean,
    public readonly isUnique: boolean,
    public readonly isAutoIncrement: boolean,
    public readonly foreignKeyConstraint: ReferentialConstraint | null = null
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
   * 外部キー制約があるかどうかを判定
   */
  hasForeignKey(): boolean {
    return this.foreignKeyConstraint !== null
  }

  /**
   * カラム定義の完全な文字列表現を取得
   */
  getDefinition(): string {
    let definition = `${this.getPhysicalName()} ${this.dataType}`

    if (this.maxLength) {
      definition += `(${this.maxLength})`
    } else if (this.precision && this.scale) {
      definition += `(${this.precision}, ${this.scale})`
    }

    if (!this.isNullable) {
      definition += ' NOT NULL'
    }

    if (this.defaultValue) {
      definition += ` DEFAULT ${this.defaultValue}`
    }

    if (this.isAutoIncrement) {
      definition += ' AUTO_INCREMENT'
    }

    return definition
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
