import React from "react";
import { Box, Text } from "ink";
import { marked } from "marked";
import { COLORS } from "../theme/index.js";

interface MarkdownProps {
  content: string;
}

interface MdToken {
  type: string;
  text?: string;
  tokens?: MdToken[];
  depth?: number;
  items?: MdToken[];
  token?: MdToken;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  if (!content?.trim()) return <Text color={COLORS.dim}>No output generated.</Text>;
  const tokens = marked.lexer(content) as MdToken[];
  return <>{tokens.map((token, i) => <TokenBlock key={i} token={token} />)}</>;
};

function TokenBlock({ token }: { token: MdToken }): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const depth = token.depth ?? 1;
      const color = depth === 1 ? COLORS.primary : depth === 2 ? COLORS.accent : COLORS.bold;
      return (
        <Box marginTop={depth <= 2 ? 1 : 0} marginBottom={0}>
          <Text bold color={color}>
            {"#".repeat(depth)} {token.text}
          </Text>
        </Box>
      );
    }
    case "paragraph":
      return (
        <Box marginBottom={0}>
          <Text>{renderInlineTokens(token.tokens)}</Text>
        </Box>
      );
    case "list":
      return (
        <Box flexDirection="column">
          {(token.items ?? []).map((item, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color={COLORS.dim}>• </Text>
              <Text>{renderInlineTokens(item.tokens)}</Text>
            </Box>
          ))}
        </Box>
      );
    case "blockquote":
      return (
        <Box paddingLeft={2}>
          <Text italic color={COLORS.dim}>{token.text}</Text>
        </Box>
      );
    case "code":
      return (
        <Box paddingX={1} marginTop={0} marginBottom={0}>
          <Text backgroundColor="#2d2d2d" color={COLORS.bold}>
            {token.text}
          </Text>
        </Box>
      );
    case "hr":
      return <Text color={COLORS.dim}>{"─".repeat(60)}</Text>;
    case "space":
      return null;
    default:
      return <Text>{token.text ?? ""}</Text>;
  }
}

function renderInlineTokens(tokens?: MdToken[]): React.ReactNode {
  if (!tokens) return null;
  return tokens.map((t, i) => {
    if (t.type === "strong") return <Text key={i} bold>{renderInlineTokens(t.tokens)}</Text>;
    if (t.type === "em") return <Text key={i} italic>{renderInlineTokens(t.tokens)}</Text>;
    if (t.type === "codespan") return <Text key={i} backgroundColor="#2d2d2d">{t.text}</Text>;
    if (t.type === "link") return <Text key={i} color={COLORS.accent} underline>{t.text}</Text>;
    return <Text key={i}>{t.text ?? ""}</Text>;
  });
}
