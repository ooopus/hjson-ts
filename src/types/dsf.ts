/**
 * Domain Specific Format (DSF) type definitions
 *
 * This module defines the interfaces and types related to Hjson's Domain Specific Format (DSF)
 * functionality. DSF allows for custom parsing and stringification of specific data formats.
 *
 * @module
 */

/**
 * Domain Specific Format interface
 * 
 * Represents a custom format handler that can parse strings into specific data types
 * and stringify those data types back into strings. DSFs are used to extend Hjson's
 * capabilities for handling specialized data formats.
 *
 * @example
 * ```typescript
 * const hexDSF: DSF = {
 *   name: 'hex',
 *   description: 'Handles hexadecimal number formats',
 *   parse: (value: string) => {
 *     const match = /^0x[0-9A-Fa-f]+$/.exec(value);
 *     return match ? parseInt(value, 16) : undefined;
 *   },
 *   stringify: (value: number) => {
 *     return Number.isInteger(value) ? `0x${value.toString(16)}` : undefined;
 *   }
 * };
 * ```
 */
export interface DSF {
  /** 
   * Name of the DSF module
   * Used for identification and error reporting
   */
  name: string;

  /** 
   * Description of the DSF's purpose and functionality
   * Helps developers understand when and how to use this DSF
   */
  description: string;

  /** 
   * Parses a string value into the target data type
   * @param value The string value to parse
   * @returns The parsed value or undefined if parsing fails
   */
  parse: (value: string) => unknown;

  /** 
   * Converts a value back into its string representation
   * @param value The value to stringify
   * @returns The stringified value or undefined if the value cannot be stringified
   */
  stringify: (value: any) => string | undefined;
}