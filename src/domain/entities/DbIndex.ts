/**
 * データベースインデックスを表現するエンティティ
 */
export interface DbIndex {
  readonly tableName: string
  readonly indexName: string
  readonly isUnique: boolean
  readonly columns: string[]
  readonly indexType: string
}

/**
 * DbIndexオブジェクトを作成
 */
export function createDbIndex(
  tableName: string,
  indexName: string,
  isUnique: boolean,
  columns: string[],
  indexType: string
): DbIndex {
  return {
    tableName,
    indexName,
    isUnique,
    columns,
    indexType,
  }
}

/**
 * インデックスの完全な定義を文字列で取得
 */
export function getIndexDefinition(index: DbIndex): string {
  const uniqueKeyword = index.isUnique ? 'UNIQUE ' : ''
  const typeKeyword = index.indexType ? ` USING ${index.indexType}` : ''
  const columnsStr = index.columns.join(', ')

  return `${uniqueKeyword}INDEX ${index.indexName} ON ${index.tableName} (${columnsStr})${typeKeyword}`
}

/**
 * インデックスが有効かどうかを判定
 */
export function isValidIndex(index: DbIndex): boolean {
  return (
    index.tableName.length > 0 &&
    index.indexName.length > 0 &&
    index.columns.length > 0 &&
    index.columns.every((column) => column.length > 0)
  )
}

/**
 * 主キーインデックスかどうかを判定
 */
export function isPrimaryKeyIndex(index: DbIndex): boolean {
  return (
    index.indexName.toLowerCase() === 'primary' || index.indexName.toLowerCase().includes('pk_')
  )
}

/**
 * 外部キーインデックスかどうかを判定
 */
export function isForeignKeyIndex(index: DbIndex): boolean {
  return index.indexName.toLowerCase().includes('fk_')
}

/**
 * 複合インデックスかどうかを判定
 */
export function isCompositeIndex(index: DbIndex): boolean {
  return index.columns.length > 1
}

/**
 * インデックス種類の表示名を取得
 */
export function getIndexTypeDisplayName(indexType?: string): string {
  if (!indexType) {
    return 'BTREE'
  }

  switch (indexType.toLowerCase()) {
    case 'btree':
      return 'B-Tree'
    case 'hash':
      return 'Hash'
    case 'fulltext':
      return 'Full-Text'
    case 'spatial':
      return 'Spatial'
    default:
      return indexType.toUpperCase()
  }
}
