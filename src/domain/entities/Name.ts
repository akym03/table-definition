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
    const trimmedComment = comment.trim()
    const firstSpaceIndex = trimmedComment.search(/\s/)

    if (firstSpaceIndex > 0) {
      const logicalName = trimmedComment.substring(0, firstSpaceIndex)
      const finalComment = trimmedComment.substring(firstSpaceIndex).trim()

      return {
        physicalName,
        logicalName,
        comment: finalComment,
      }
    } else {
      // 空白文字がない場合、全体を論理名として扱う
      return {
        physicalName,
        logicalName: trimmedComment,
        comment: '',
      }
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
