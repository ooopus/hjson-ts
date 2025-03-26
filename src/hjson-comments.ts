/**
 * Hjson comments handling module
 * Provides functionality for extracting, merging and managing comments in Hjson
 */

import * as common from './hjson-common';

/**
 * Creates a comment object with before, after and extra comments
 * @param b Before comment
 * @param a After comment
 * @param x Extra comment
 */
function makeComment(b?: string, a?: string, x?: string): any {
  let c: any;
  if (b) c = { b: b };
  if (a) (c = c || {}).a = a;
  if (x) (c = c || {}).x = x;
  return c;
}

/**
 * Extracts comments from a value and its nested structure
 * @param value The value to extract comments from
 * @param root Whether this is the root value
 */
export function extractComments(value: any, root?: boolean): any {
  if (value === null || typeof value !== 'object') return;
  
  const comments = common.getComment(value);
  if (comments) common.removeComment(value);

  let i: number,
      length: number; // Loop variables
      
  let hasComments: boolean = false,
      res: any;
  
  if (Array.isArray(value)) {
    res = { a: {} };
    for (let i = 0, length = value.length; i < length; i++) {
      if (saveComment(res.a, i, comments?.a?.[i], extractComments(value[i]))) {
        hasComments = true;
      }
    }
    if (!hasComments && comments?.e) {
      res.e = makeComment(comments.e[0], comments.e[1]);
      hasComments = true;
    }
  } else {
    res = { s: {} };

    // Get key order (comments and current)
    let keys: string[];
    const currentKeys = Object.keys(value);
    
    // Merge comment keys with current keys while preserving order
    if (comments && comments.o) {
      keys = [];
      comments.o.concat(currentKeys).forEach((key: string) => {
        if (Object.prototype.hasOwnProperty.call(value, key) && keys.indexOf(key) < 0) {
          keys.push(key);
        }
      });
    } else {
      keys = currentKeys;
    }
    
    res.o = keys;

    // Extract comments
    for (i = 0, length = keys.length; i < length; i++) {
      const key = keys[i];
      if (saveComment(res.s, key, comments?.c?.[key], extractComments(value[key]))) {
        hasComments = true;
      }
    }
    
    if (!hasComments && comments?.e) {
      res.e = makeComment(comments.e[0], comments.e[1]);
      hasComments = true;
    }
  }

  if (root && comments?.r) {
    res.r = makeComment(comments.r[0], comments.r[1]);
    hasComments = true;
  }

  return hasComments ? res : undefined;
}

/**
 * Saves a comment to the result object
 * @param res Result object to save to
 * @param key Key to save under
 * @param ck Comment key
 * @param c Comment value
 */
function saveComment(res: any, key: string | number, ck: any, c: any): boolean {
  if (!res || !ck && !c) return false;

  res[key] = c || {};
  if (ck) {
    if (ck[0]) res[key].b = ck[0];
    if (ck[1]) res[key].a = ck[1];
    if (ck[2]) res[key].x = ck[2];
  }
  return true;
}

/**
 * Merges comments from source into target value
 * @param comments Source comments
 * @param value Target value
 */
export function mergeComments(comments: any, value: any): void {
  if (!comments) return;
  
  const dropped: any[] = [];
  merge(comments, value, dropped, []);

  // Add orphaned comments to footer
  if (dropped.length > 0) {
    let text = rootComment(value, null, 1);
    text += "\n# Orphaned comments:\n";
    dropped.forEach((c) => {
      text += ("# " + c.path.join('/') + ": " + mergeStr(c.b, c.a, c.e)).replace("\n", "\\n ") + "\n";
    });
    rootComment(value, text, 1);
  }
}

/**
 * Merges multiple strings with semicolon separator
 */
function mergeStr(...args: any[]): string {
  let res = "";
  args.forEach((c) => {
    if (c && c.trim() !== "") {
      if (res) res += "; ";
      res += c.trim();
    }
  });
  return res;
}

/**
 * Creates a dropped comment object
 */
function droppedComment(path: any[], c: any): any {
  const res = makeComment(c.b, c.a);
  res.path = path;
  return res;
}

/**
 * Drops all comments and adds them to dropped array
 */
function dropAll(comments: any, dropped: any[], path: any[]): void {
  if (!comments) return;

  let i: number, length: number;

  if (comments.a) {
    for (i = 0, length = comments.a.length; i < length; i++) {
      const kpath = path.slice().concat([i]);
      const c = comments.a[i];
      if (c) {
        dropped.push(droppedComment(kpath, c));
        dropAll(c.x, dropped, kpath);
      }
    }
  } else if (comments.o) {
    comments.o.forEach((key: string) => {
      const kpath = path.slice().concat([key]);
      const c = comments.s[key];
      if (c) {
        dropped.push(droppedComment(kpath, c));
        dropAll(c.x, dropped, kpath);
      }
    });
  }

  if (comments.e)
    dropped.push(droppedComment(path, comments.e));
}

/**
 * Merges comments recursively
 */
function merge(comments: any, value: any, dropped: any[], path: any[]): void {
  if (!comments) return;
  if (value === null || typeof value !== 'object') {
    dropAll(comments, dropped, path);
    return;
  }

  const setComments = common.createComment(value, common.getComment(value) || {});

  if (path.length === 0 && comments.r)
    setComments.r = [comments.r.b, comments.r.a];

  if (Array.isArray(value)) {
    setComments.a = setComments.a || [];
    const a = comments.a || {};
    let i: number = -1;
    for (const key in a) {
      if (Object.prototype.hasOwnProperty.call(a, key)) {
        i = parseInt(key);
        const c = comments.a[key];
        if (c) {
          const kpath = path.slice().concat([i]);
          if (i < value.length) {
            setComments.a[i] = [c.b, c.a];
            merge(c.x, value[i], dropped, kpath);
          } else {
            dropped.push(droppedComment(kpath, c));
            dropAll(c.x, dropped, kpath);
          }
        }
      }
    }
    if (i === 0 && comments.e) setComments.e = [comments.e.b, comments.e.a];
  } else {
    (comments.o || []).forEach((key: string) => {
      const kpath = path.slice().concat([key]);
      const c = comments.s[key];
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        setComments.o?.push(key);
        if (c) {
          if (!setComments.c) setComments.c = {};
          setComments.c[key] = [c.b, c.a];
          merge(c.x, value[key], dropped, kpath);
        }
      } else if (c) {
        dropped.push(droppedComment(kpath, c));
        dropAll(c.x, dropped, kpath);
      }
    });
    if (comments.e) setComments.e = [comments.e.b, comments.e.a];
  }
}

/**
 * Gets or sets root comment
 * @param value Target value
 * @param setText Text to set
 * @param header Header index
 */
function rootComment(value: any, setText: string | null, header: number): string {
  const comment = common.createComment(value, common.getComment(value));
  if (!comment.r) comment.r = ["", ""];
  if (setText !== undefined) comment.r[header] = common.forceComment(setText || "");
  return comment.r[header] || "";
}

/**
 * Export module functions
 */
export default {
  extract: (value: any) => extractComments(value, true),
  merge: mergeComments,
  header: (value: any, setText?: string) => rootComment(value, setText || "", 0),
  footer: (value: any, setText?: string) => rootComment(value, setText || "", 1),
};