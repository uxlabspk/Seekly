import React from "react";
import { Box, Text } from "ink";

const COLORS = {
  primary: "#6C5CE7",
  success: "#00B894",
  warning: "#FDCB6E",
  error: "#E17055",
  dim: "#636E72",
  bold: "#DFE6E9",
  accent: "#00CEC9",
};

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = "Seekly" }) => (
  <Box paddingX={1}>
    <Text bold color={COLORS.primary}>
      {title}
    </Text>
  </Box>
);

interface StatusLineProps {
  label: string;
  status: "done" | "active" | "pending" | "error";
  detail?: string;
}

const STATUS_ICONS = {
  done: "✓",
  active: "●",
  pending: "○",
  error: "✗",
};

const STATUS_COLORS = {
  done: COLORS.success,
  active: COLORS.accent,
  pending: COLORS.dim,
  error: COLORS.error,
};

export const StatusLine: React.FC<StatusLineProps> = ({ label, status, detail }) => (
  <Box>
    <Text color={STATUS_COLORS[status]}>{STATUS_ICONS[status]} </Text>
    <Text>{label}</Text>
    {detail && <Text color={COLORS.dim}> {detail}</Text>}
  </Box>
);

interface ProgressProps {
  question: string;
  sources: number;
  elapsed: string;
  state: string;
}

export const Progress: React.FC<ProgressProps> = ({ question, sources, elapsed, state }) => (
  <Box flexDirection="column" padding={1}>
    <Header />
    <Box marginY={1}>
      <Text bold>{question}</Text>
    </Box>
    <Box flexDirection="column" gap={0}>
      <StatusLine label="Planning" status={isStatePast(state, "PLANNING") ? "done" : state === "PLANNING" ? "active" : "pending"} />
      <StatusLine label="Web search" status={isStatePast(state, "SEARCHING") ? "done" : state === "SEARCHING" ? "active" : "pending"} detail={`${sources} sources`} />
      <StatusLine label="Evidence extraction" status={isStatePast(state, "EXTRACTING") ? "done" : state === "RETRIEVING" ? "active" : "pending"} />
      <StatusLine label="Verification" status={isStatePast(state, "VERIFYING") ? "done" : state === "VERIFYING" ? "active" : "pending"} />
      <StatusLine label="Synthesis" status={isStatePast(state, "SYNTHESIZING") ? "done" : state === "SYNTHESIZING" ? "active" : "pending"} />
    </Box>
    <Box marginTop={1}>
      <Text color={COLORS.dim}>Elapsed {elapsed}</Text>
    </Box>
  </Box>
);

const STATE_ORDER = [
  "IDLE", "UNDERSTANDING", "PLANNING", "SEARCHING", "RETRIEVING",
  "EXTRACTING", "ANALYZING", "VERIFYING", "SYNTHESIZING",
  "CITATION_AUDIT", "FINAL_REVIEW", "COMPLETED",
];

function isStatePast(current: string, target: string): boolean {
  return STATE_ORDER.indexOf(current) > STATE_ORDER.indexOf(target);
}

export { COLORS };
