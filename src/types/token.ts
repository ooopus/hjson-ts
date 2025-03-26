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
export interface Token {
  /** Object tokens: opening and closing braces */
  obj: [string, string];

  /** Array tokens: opening and closing brackets */
  arr: [string, string];

  /** Unquoted key tokens */
  key: [string, string];

  /** Quoted key tokens */
  qkey: [string, string];

  /** Colon separator tokens */
  col: [string, string];

  /** Comment tokens */
  com: [string, string];

  /** Unquoted string tokens */
  str: [string, string];

  /** Quoted string tokens */
  qstr: [string, string];

  /** Multiline string tokens */
  mstr: [string, string];

  /** Number tokens */
  num: [string, string];

  /** Literal tokens (true, false, null) */
  lit: [string, string];

  /** Domain Specific Format tokens */
  dsf: [string, string];

  /** Escape sequence tokens */
  esc: [string, string];

  /** Unicode escape sequence tokens */
  uni: [string, string];

  /** Remainder tokens */
  rem: [string, string];

  /** 
   * Index signature for additional token types
   * Allows for extension of token types while maintaining type safety
   */
  [key: string]: string[];
}