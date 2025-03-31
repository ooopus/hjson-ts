/**
 * Parse Options type definitions
 *
 * This module defines the interfaces and types related to Hjson's parsing options.
 * These options control how Hjson text is parsed into JavaScript/TypeScript objects.
 *
 * @module
 */

import { DSF } from './dsf';

/**
 * Hjson parse options
 * 
 * Options to customize the parsing behavior of Hjson. These options affect how
 * Hjson text is interpreted and converted into JavaScript/TypeScript objects.
 *
 * @example
 * ```typescript
 * const options: ParseOptions = {
 *   keepWhitespaceAndComments: true,
 *   legacyRoot: false,
 *   dsf: [hexDSF, dateDSF]
 * };
 * const result = Hjson.parse(hjsonText, options);
 * ```
 */
export interface ParseOptions {
  /** 
   * Keep whitespace and comments
   * 
   * When true, preserves whitespace and comments in the parsed output.
   * This is useful if you want to edit an Hjson file and save it while
   * preserving the original formatting and documentation.
   * 
   * @default false
   */
  keepWhitespaceAndComments?: boolean;

  /** 
   * Domain Specific Format modules
   * 
   * Array of custom format handlers that extend Hjson's parsing capabilities.
   * Each DSF module can parse strings into specific data types (e.g., dates,
   * hexadecimal numbers, etc.).
   */
  dsf?: DSF[];

  /** 
   * Legacy root braces support
   * 
   * When true (default), allows parsing of Hjson content without root braces.
   * Set to false to enforce stricter JSON-like syntax that requires root braces.
   * 
   * @default true
   */
  legacyRoot?: boolean;
}