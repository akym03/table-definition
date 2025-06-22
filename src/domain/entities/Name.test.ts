import { describe, it, expect } from 'vitest'
import {
  createName,
  hasLogicalName,
  hasComment,
  getDisplayName,
  nameToString,
} from '@/domain/entities/Name'

describe('Name', () => {
  describe('createName', () => {
    it('should create a Name with only physical name', () => {
      const name = createName('test_table')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })

    it('should create a Name with logical name from comment', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('テストテーブル')
      expect(name.comment).toBe('')
    })

    it('should create a Name with logical name and comment', () => {
      const name = createName('test_table', 'テストテーブル これはテストです')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('テストテーブル')
      expect(name.comment).toBe('これはテストです')
    })

    it('should handle empty comment', () => {
      const name = createName('test_table', '')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })

    it('should handle null comment', () => {
      const name = createName('test_table', null)
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })
  })

  describe('hasLogicalName', () => {
    it('should return false when logical name is same as physical name', () => {
      const name = createName('test_table')
      expect(hasLogicalName(name)).toBe(false)
    })

    it('should return true when logical name is different from physical name', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(hasLogicalName(name)).toBe(true)
    })
  })

  describe('hasComment', () => {
    it('should return false when comment is empty', () => {
      const name = createName('test_table')
      expect(hasComment(name)).toBe(false)
    })

    it('should return true when comment exists', () => {
      const name = createName('test_table', 'テストテーブル これはコメントです')
      expect(hasComment(name)).toBe(true)
    })
  })

  describe('getDisplayName', () => {
    it('should return physical name when no logical name', () => {
      const name = createName('test_table')
      expect(getDisplayName(name)).toBe('test_table')
    })

    it('should return logical name when available', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(getDisplayName(name)).toBe('テストテーブル')
    })
  })

  describe('nameToString', () => {
    it('should return physical name only', () => {
      const name = createName('test_table')
      expect(nameToString(name)).toBe('test_table')
    })

    it('should return logical name with physical name', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(nameToString(name)).toBe('テストテーブル (test_table)')
    })

    it('should return physical name with comment', () => {
      const name = createName('test_table', ' これはコメントです')
      expect(nameToString(name)).toBe('これはコメントです (test_table)')
    })

    it('should return full format with logical name and comment', () => {
      const name = createName('test_table', 'テストテーブル これはコメントです')
      expect(nameToString(name)).toBe('テストテーブル (test_table) - これはコメントです')
    })
  })
})
