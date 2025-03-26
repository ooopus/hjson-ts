# Hjson-TS, the Human JSON

[![NPM version](https://img.shields.io/npm/v/hjson-ts.svg?style=flat-square)](https://www.npmjs.com/package/hjson-ts)

A configuration file format for humans. Relaxed syntax, fewer mistakes, more comments.

## TypeScript Implementation

This is a TypeScript implementation of the Hjson format, based on the original [hjson-js](https://github.com/hjson/hjson-js) project. It provides full type safety and modern ES module support.

## Install from npm

```shell
npm install hjson-ts
```

## Usage

```typescript
import Hjson from 'hjson-ts';

// Parse Hjson
const data = Hjson.parse(hjsonText);

// Convert to Hjson
const hjsonText = Hjson.stringify(data);
```
