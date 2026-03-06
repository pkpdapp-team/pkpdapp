/*
Language: DiffSL
Description: Language definition for DiffSL, a DSL for specifying systems of ODEs.
Website: https://martinjrobins.github.io/diffsl/
Category: scientific
*/

import { HLJSApi } from "highlight.js";

export default function diffsl(hljs: HLJSApi) {
  // real = digits ~ ("." ~ digits?)? ~ ("e" ~ sign? ~ digits)?
  const NUMBER_MODE = {
    scope: "number",
    begin: /\b\d+(\.\d*)?([eE][+-]?\d+)?\b/,
  };

  // Arithmetic operators (+, -, *, /), assignment (=), range separators (.., :)
  const OPERATOR_MODE = {
    scope: "operator",
    begin: /\+|-|\*|\/|=|\.\.|:/,
  };

  // Function call: name(args)
  const CALL_MODE = {
    scope: "title.function",
    begin: /\b[a-zA-Z][a-zA-Z0-9]*(?=\s*\()/,
  };

  // Indices specifier inside a tensor element: (0:2, 0:3):
  const INDICES_MODE = {
    scope: "meta",
    begin: /\(/,
    end: /\)\s*:/,
    contains: [NUMBER_MODE, OPERATOR_MODE],
  };

  // Label (named element): name = expression inside a tensor body
  const LABEL_MODE = {
    scope: "variable",
    begin: /\b[a-zA-Z][a-zA-Z0-9]*(?=\s*=)/,
  };

  const TENSOR_BODY_MODES = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    INDICES_MODE,
    LABEL_MODE,
    CALL_MODE,
    NUMBER_MODE,
    OPERATOR_MODE,
  ];

  // Tensor declaration: name_ij { ... }
  // name_ij = name ~ ("_" ~ name)?   where name = [a-zA-Z][a-zA-Z0-9]*
  const TENSOR_MODE = {
    begin: [/\b[a-zA-Z][a-zA-Z0-9]*(_[a-zA-Z][a-zA-Z0-9]*)?\b/, /\s*\{/],
    beginScope: { 1: "section", 2: "punctuation" },
    end: /\}/,
    endScope: "punctuation",
    contains: TENSOR_BODY_MODES,
  };

  // Inputs declaration: in = [name, name, ...]
  const INPUTS_MODE = {
    begin: [/\bin\b/, /\s*=\s*/, /\[/],
    beginScope: { 1: "keyword", 2: "operator", 3: "punctuation" },
    end: /\]/,
    endScope: "punctuation",
    contains: [
      {
        scope: "variable",
        begin: /\b[a-zA-Z][a-zA-Z0-9]*\b/,
      },
    ],
  };

  return {
    name: "DiffSL",
    aliases: ["diffsl"],
    case_insensitive: false,
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      INPUTS_MODE,
      TENSOR_MODE,
      NUMBER_MODE,
      OPERATOR_MODE,
    ],
  };
}
