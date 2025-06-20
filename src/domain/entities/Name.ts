/**
 * 論理名と物理名を管理するValue Object
 */
export class Name {
  public readonly logicalName: string
  public readonly physicalName: string
  public readonly comment: string

  constructor(physicalName: string, comment: string | null = null) {
    this.physicalName = physicalName

    if (comment && comment.trim().length > 0) {
      const parts = comment.trim().split(/\s+/, 2)
      this.logicalName = parts[0] || physicalName
      this.comment = parts.length > 1 ? parts.slice(1).join(' ') : ''
    } else {
      this.logicalName = physicalName
      this.comment = ''
    }
  }

  /**
   * 論理名を持っているかどうかを判定
   */
  hasLogicalName(): boolean {
    return this.logicalName !== this.physicalName
  }

  /**
   * コメントを持っているかどうかを判定
   */
  hasComment(): boolean {
    return this.comment.length > 0
  }

  /**
   * 表示用の名前を取得（論理名優先）
   */
  getDisplayName(): string {
    return this.hasLogicalName() ? this.logicalName : this.physicalName
  }

  /**
   * 完全な文字列表現を取得
   */
  toString(): string {
    if (this.hasLogicalName() && this.hasComment()) {
      return `${this.logicalName} (${this.physicalName}) - ${this.comment}`
    } else if (this.hasLogicalName()) {
      return `${this.logicalName} (${this.physicalName})`
    } else if (this.hasComment()) {
      return `${this.physicalName} - ${this.comment}`
    } else {
      return this.physicalName
    }
  }
}
