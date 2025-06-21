/**
 * 論理名と物理名を管理するValue Object
 */
export interface Name {
  readonly logicalName: string
  readonly physicalName: string
  readonly comment: string
}

/**
 * Nameオブジェクトを作成
 */
export function createName(physicalName: string, comment: string | null = null): Name {
  if (comment && comment.trim().length > 0) {
    const parts = comment.trim().split(/\s+/, 2)
    const logicalName = parts[0] || physicalName
    const finalComment = parts.length > 1 ? parts.slice(1).join(' ') : ''

    return {
      physicalName,
      logicalName,
      comment: finalComment,
    }
  }

  return {
    physicalName,
    logicalName: physicalName,
    comment: '',
  }
}

/**
 * 論理名を持っているかどうかを判定
 */
export function hasLogicalName(name: Name): boolean {
  return name.logicalName !== name.physicalName
}

/**
 * コメントを持っているかどうかを判定
 */
export function hasComment(name: Name): boolean {
  return name.comment.length > 0
}

/**
 * 表示用の名前を取得（論理名優先）
 */
export function getDisplayName(name: Name): string {
  return hasLogicalName(name) ? name.logicalName : name.physicalName
}

/**
 * 完全な文字列表現を取得
 */
export function nameToString(name: Name): string {
  if (hasLogicalName(name) && hasComment(name)) {
    return `${name.logicalName} (${name.physicalName}) - ${name.comment}`
  } else if (hasLogicalName(name)) {
    return `${name.logicalName} (${name.physicalName})`
  } else if (hasComment(name)) {
    return `${name.physicalName} - ${name.comment}`
  } else {
    return name.physicalName
  }
}
