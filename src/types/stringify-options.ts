/**
 * Stringify Options type definitions
 *
 * This module defines the interfaces and types related to Hjson's stringification options.
 * These options control how JavaScript/TypeScript objects are converted into Hjson text.
 *
 * @module
 */

import { DSF } from './dsf';

/**
 * Hjson stringify options
 * 
 * Options to customize the stringification behavior of Hjson. These options affect how
 * JavaScript/TypeScript objects are converted into Hjson text format.
 *
 * @example
 * ```typescript
 * const options: StringifyOptions = {
 *   keepWhitespaceAndComment: true,
 *   bracesSameLine: true,
 *   quotes: 'strings',
 *   space: 2
 * };
 * const hjsonText = Hjson.stringify(value, options);
 * ```
 */
export interface StringifyOptions {
  /** 
   * Keep whitespace and comments
   * 
   * When true, preserves whitespace and comments in the stringified output.
   * This is useful for maintaining formatting and documentation when
   * round-tripping Hjson content.
   * 
   * @default false
   */
  keepWhitespaceAndComment?: boolean;

  /** 
   * Condense output
   * 
   * Controls how many items should be on one line before breaking into multiple lines.
   * A value of 0 means no condensing (each item on its own line).
   * 
   * @default 0
   */
  condense?: number;

  /** 
   * Braces same line
   * 
   * When true, opening braces are placed on the same line as their key name.
   * When false, opening braces are placed on a new line.
   * 
   * @default false
   */
  bracesSameLine?: boolean;

  /** 
   * Quote style
   * 
   * Controls how strings are displayed in the output:
   * - 'min': minimal quotes (only when necessary)
   * - 'keys': quote all object keys
   * - 'strings': quote all string values
   * - 'all': quote both keys and string values
   * 
   * Note: Setting separator implies 'strings' quote style.
   * 
   * @default 'min'
   */
  quotes?: 'min' | 'keys' | 'strings' | 'all' | 'always';

  /** 
   * Add separators
   * 
   * When true, adds commas between array elements and object properties.
   * Note: This setting implies quotes='strings'.
   * 
   * @default false
   */
  separator?: boolean;

  /** 
   * Multiline string mode
   * 
   * Controls how multiline strings are formatted:
   * - 'std': strings with newlines use multiline format
   * - 'no-tabs': like 'std' but disallows tabs
   * - 'off': use JSON string format
   * 
   * Note: Setting quotes option implies 'off'.
   * 
   * @default 'std'
   */
  multiline?: 'std' | 'no-tabs' | 'off';

  /** 
   * End of line character
   * 
   * Specifies the character sequence used for line endings.
   * If not specified, uses the value set by setEndOfLine().
   */
  eol?: string;

  /** 
   * Sort object properties
   * 
   * When true, object properties are sorted alphabetically.
   * When false, properties maintain their original order.
   * 
   * @default false
   */
  sortProps?: boolean;

  /** 
   * Domain Specific Format modules
   * 
   * Array of custom format handlers that extend Hjson's stringification capabilities.
   * Each DSF module can stringify specific data types into custom string formats.
   */
  dsf?: DSF[];

  /** 
   * Indentation
   * 
   * Controls the indentation of nested structures:
   * - If number: specifies the number of spaces
   * - If string: uses the string for indentation (e.g., '\t' for tabs)
   */
  space?: string | number;

  /** 
   * Emit color codes
   * 
   * When true, includes ANSI color codes in the output.
   * Useful for terminal display but should be disabled for file output.
   * 
   * @default false
   */
  colors?: boolean;

  /** 
   * Emit root braces
   * 
   * When true, includes braces around the root object.
   * When false, omits root braces for a more concise output.
   * 
   * @default true
   */
  emitRootBraces?: boolean;
}