/**
 * RegexParser.ts — Recursive descent parser for regular expressions.
 *
 * Converts a regex pattern string into an Abstract Syntax Tree (AST).
 *
 * Supported syntax:
 *   - Literal characters: a, b, 0, 1, etc.
 *   - Union:        r1 | r2
 *   - Kleene star:  r*
 *   - One-or-more:  r+
 *   - Optional:     r?
 *   - Grouping:     (r)
 *   - Concatenation: implicit (ab = a·b)
 *   - Epsilon:      ε or \e
 *
 * Operator precedence (highest → lowest):
 *   1. Parenthesized groups / atoms
 *   2. Postfix: *, +, ?
 *   3. Concatenation (implicit)
 *   4. Union: |
 *
 * Grammar (informal):
 *   expr     → concat ( '|' concat )*
 *   concat   → postfix+
 *   postfix  → atom ( '*' | '+' | '?' )*
 *   atom     → CHAR | 'ε' | '(' expr ')'
 */

// ─── AST Node Types ──────────────────────────────────────────

export type RegexNodeType =
  | 'LITERAL'
  | 'EPSILON'
  | 'CONCAT'
  | 'UNION'
  | 'STAR'
  | 'PLUS'
  | 'OPTIONAL';

export interface RegexNode {
  type: RegexNodeType;
  /** For LITERAL nodes: the character value */
  value?: string;
  /** Left operand for CONCAT / UNION */
  left?: RegexNode;
  /** Right operand for CONCAT / UNION */
  right?: RegexNode;
  /** Operand for STAR / PLUS / OPTIONAL */
  operand?: RegexNode;
}

// ─── Token Types ─────────────────────────────────────────────

type TokenType =
  | 'CHAR'
  | 'UNION'
  | 'STAR'
  | 'PLUS'
  | 'QUESTION'
  | 'LPAREN'
  | 'RPAREN'
  | 'EPSILON'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── Tokenizer ───────────────────────────────────────────────

function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    switch (ch) {
      case '|':
        tokens.push({ type: 'UNION', value: ch, position: i });
        break;
      case '*':
        tokens.push({ type: 'STAR', value: ch, position: i });
        break;
      case '+':
        tokens.push({ type: 'PLUS', value: ch, position: i });
        break;
      case '?':
        tokens.push({ type: 'QUESTION', value: ch, position: i });
        break;
      case '(':
        tokens.push({ type: 'LPAREN', value: ch, position: i });
        break;
      case ')':
        tokens.push({ type: 'RPAREN', value: ch, position: i });
        break;
      case 'ε':
        tokens.push({ type: 'EPSILON', value: 'ε', position: i });
        break;
      case '\\':
        // Escape sequence
        i++;
        if (i >= pattern.length) {
          throw new RegexParseError('Unexpected end of pattern after \\', i - 1);
        }
        if (pattern[i] === 'e') {
          tokens.push({ type: 'EPSILON', value: 'ε', position: i - 1 });
        } else {
          // Treat as literal escaped character
          tokens.push({ type: 'CHAR', value: pattern[i], position: i });
        }
        break;
      case ' ':
      case '\t':
        // Skip whitespace
        break;
      default:
        tokens.push({ type: 'CHAR', value: ch, position: i });
        break;
    }
    i++;
  }

  tokens.push({ type: 'EOF', value: '', position: i });
  return tokens;
}

// ─── Parse Error ─────────────────────────────────────────────

export class RegexParseError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'RegexParseError';
    this.position = position;
  }
}

// ─── Recursive Descent Parser ────────────────────────────────

export function parseRegex(pattern: string): RegexNode {
  if (pattern.trim().length === 0) {
    return { type: 'EPSILON' };
  }

  const tokens = tokenize(pattern);
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function advance(): Token {
    const token = tokens[pos];
    pos++;
    return token;
  }

  function expect(type: TokenType): Token {
    const token = peek();
    if (token.type !== type) {
      throw new RegexParseError(
        `Expected ${type} but got ${token.type} ('${token.value}')`,
        token.position
      );
    }
    return advance();
  }

  // expr → concat ( '|' concat )*
  function parseExpr(): RegexNode {
    let left = parseConcat();

    while (peek().type === 'UNION') {
      advance(); // consume '|'
      const right = parseConcat();
      left = { type: 'UNION', left, right };
    }

    return left;
  }

  // concat → postfix+
  function parseConcat(): RegexNode {
    let left = parsePostfix();

    // Continue concatenation while the next token can start an atom
    while (
      peek().type === 'CHAR' ||
      peek().type === 'EPSILON' ||
      peek().type === 'LPAREN'
    ) {
      const right = parsePostfix();
      left = { type: 'CONCAT', left, right };
    }

    return left;
  }

  // postfix → atom ( '*' | '+' | '?' )*
  function parsePostfix(): RegexNode {
    let node = parseAtom();

    while (
      peek().type === 'STAR' ||
      peek().type === 'PLUS' ||
      peek().type === 'QUESTION'
    ) {
      const op = advance();
      switch (op.type) {
        case 'STAR':
          node = { type: 'STAR', operand: node };
          break;
        case 'PLUS':
          node = { type: 'PLUS', operand: node };
          break;
        case 'QUESTION':
          node = { type: 'OPTIONAL', operand: node };
          break;
      }
    }

    return node;
  }

  // atom → CHAR | EPSILON | '(' expr ')'
  function parseAtom(): RegexNode {
    const token = peek();

    switch (token.type) {
      case 'CHAR': {
        advance();
        return { type: 'LITERAL', value: token.value };
      }
      case 'EPSILON': {
        advance();
        return { type: 'EPSILON' };
      }
      case 'LPAREN': {
        advance(); // consume '('
        const inner = parseExpr();
        expect('RPAREN'); // consume ')'
        return inner;
      }
      default:
        throw new RegexParseError(
          `Unexpected token '${token.value}' (${token.type})`,
          token.position
        );
    }
  }

  const ast = parseExpr();

  // Ensure we consumed everything
  if (peek().type !== 'EOF') {
    const remaining = peek();
    throw new RegexParseError(
      `Unexpected token '${remaining.value}' after end of expression`,
      remaining.position
    );
  }

  return ast;
}

/**
 * Pretty-prints a regex AST back into a readable string.
 * Useful for debugging and display in the UI.
 */
export function astToString(node: RegexNode): string {
  switch (node.type) {
    case 'LITERAL':
      return node.value ?? '?';
    case 'EPSILON':
      return 'ε';
    case 'CONCAT':
      return `${astToString(node.left!)}${astToString(node.right!)}`;
    case 'UNION':
      return `(${astToString(node.left!)}|${astToString(node.right!)})`;
    case 'STAR':
      return `${wrapIfComplex(node.operand!)}*`;
    case 'PLUS':
      return `${wrapIfComplex(node.operand!)}+`;
    case 'OPTIONAL':
      return `${wrapIfComplex(node.operand!)}?`;
    default:
      return '?';
  }
}

function wrapIfComplex(node: RegexNode): string {
  if (node.type === 'CONCAT' || node.type === 'UNION') {
    return `(${astToString(node)})`;
  }
  return astToString(node);
}
