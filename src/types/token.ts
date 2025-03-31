/**
 * Token type definitions
 *
 * This module defines the interfaces and types related to Hjson's tokenization process.
 * These types are used during parsing and stringification to represent different
 * elements of the Hjson syntax.
 *
 * @module
 */

/**
 * Token types for Hjson parser/stringifier
 * 
 * Represents different token types used in parsing and stringifying Hjson.
 * Each token type is represented as a tuple of two strings, typically containing
 * the opening and closing parts of the token.
 *
 * @example
 * ```typescript
 * const tokens: Token = {
 *   obj: ['{', '}'],
 *   str: ['"', '"'],
 *   num: ['', ''],
 *   lit: ['', '']
 * };
 * ```
 */
export interface TokenEntry {
  length: number;
  0: string;
  1: string;
  2?: number; // Start token original length
  3?: number; // End token original length
}

export interface Token {
  /** Object tokens: opening and closing braces */
  obj: TokenEntry;

  /** Array tokens: opening and closing brackets */
  arr: TokenEntry;

  /** Unquoted key tokens */
  key: TokenEntry;

  /** Quoted key tokens */
  qkey: TokenEntry;

  /** Colon separator tokens */
  col: TokenEntry;

  /** Comment tokens */
  com: TokenEntry;

  /** Unquoted string tokens */
  str: TokenEntry;

  /** Quoted string tokens */
  qstr: TokenEntry;

  /** Multiline string tokens */
  mstr: TokenEntry;

  /** Number tokens */
  num: TokenEntry;

  /** Literal tokens (true, false, null) */
  lit: TokenEntry;

  /** Domain Specific Format tokens */
  dsf: TokenEntry;

  /** Escape sequence tokens */
  esc: TokenEntry;

  /** Unicode escape sequence tokens */
  uni: TokenEntry;

  /** Remainder tokens */
  rem: TokenEntry;

  /** 
   * Index signature for additional token types
   * Allows for extension of token types while maintaining type safety
   */
  [key: string]: TokenEntry;
}