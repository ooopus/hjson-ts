/**
 * Comments type definitions
 *
 * This module defines the interfaces and types related to Hjson's comment handling.
 * These types are used to store and manage comments within Hjson documents while
 * preserving the document's structure and formatting.
 *
 * @module
 */

/**
 * Comment object structure
 * 
 * Defines the structure for storing comments in Hjson. This interface provides
 * a way to preserve comments and formatting information when parsing and
 * stringifying Hjson documents.
 *
 * @example
 * ```typescript
 * const comments: Comments = {
 *   b: '// Header comment',
 *   c: { key1: '// Property comment' },
 *   e: ['// Before end', '// After end'],
 *   o: ['key1', 'key2'],
 *   r: ['// Root before', '// Root after']
 * };
 * ```
 */
export interface Comments {
  /** 
   * Comments for array elements
   * 
   * A record mapping array indices to their associated comments.
   * Used to preserve comments that appear before or after array elements.
   */
  a?: Record<string, any>;

  /** 
   * Before comment
   * 
   * Stores comments that appear before a value or structure.
   * Typically used for documentation or section headers.
   */
  b?: string;

  /** 
   * Comments for object properties
   * 
   * A record mapping property names to their associated comments.
   * Used to preserve comments that appear before or after object properties.
   */
  c?: Record<string, any>;

  /** 
   * End comments
   * 
   * A tuple containing comments that appear at the end of a structure.
   * The first element is the comment before the closing brace/bracket,
   * and the second element is the comment after it.
   */
  e?: [string, string];

  /** 
   * Order of object properties
   * 
   * An array of property names that defines their order in the object.
   * Used to maintain the original property order when stringifying.
   */
  o?: string[];

  /** 
   * Storage for object property comments
   * 
   * Additional storage for comments associated with object properties.
   * Used when more complex comment preservation is needed.
   */
  s?: Record<string, any>;

  /** 
   * Extra comments
   * 
   * Stores additional comments that don't fit into other categories.
   * Used for preserving miscellaneous comments in the document.
   */
  x?: string;

  /** 
   * Root object comments
   * 
   * A tuple containing comments that appear at the root level.
   * The first element is the comment before the root object/array,
   * and the second element is the comment after it.
   */
  r?: [string, string];
}