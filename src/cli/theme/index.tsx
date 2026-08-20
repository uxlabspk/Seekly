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
  muted: "#B2BEC3",
  surface: "#2D3436",
};

const DIVIDER = "─".repeat(56);

interface HeaderProps {
  title?: string;
  version?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = "Seekly", version = "0.1.0" }) => (
  <Box flexDirection="column">
    <Box justifyContent="center" width="100%">
      <Text bold color={COLORS.primary}>
        {"⬡ "}
      </Text>
      <Text bold color={COLORS.bold}>
        {title}
      </Text>
      <Text color={COLORS.dim}>
        {" v"}{version}
      </Text>
    </Box>
    <Box justifyContent="center" width="100%">
      <Text color={COLORS.dim}>{DIVIDER}</Text>
    </Box>
  </Box>
);

interface StatusLineProps {
  label: string;
  status: "done" | "active" | "pending" | "error" | "skip";
  detail?: string;
}

const STATUS_ICONS = {
  done: "✓",
  active: "◆",
  pending: "○",
  error: "✗",
  skip: "–",
};

const STATUS_COLORS = {
  done: COLORS.success,
  active: COLORS.accent,
  pending: COLORS.dim,
  error: COLORS.error,
  skip: COLORS.muted,
};

export const StatusLine: React.FC<StatusLineProps> = ({ label, status, detail }) => (
  <Box>
    <Text color={STATUS_COLORS[status]}>{STATUS_ICONS[status]} </Text>
    <Text color={status === "done" ? COLORS.bold : status === "active" ? COLORS.bold : COLORS.dim}>
      {label}
    </Text>
    {detail && <Text color={COLORS.muted}> {detail}</Text>}
  </Box>
);

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, width = 30 }) => {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return (
    <Box>
      <Text color={COLORS.dim}>[</Text>
      <Text color={COLORS.accent}>{"█".repeat(filled)}</Text>
      <Text color={COLORS.surface}>{"░".repeat(empty)}</Text>
      <Text color={COLORS.dim}>]</Text>
      <Text color={COLORS.muted}> {Math.round(ratio * 100)}%</Text>
    </Box>
  );
};

interface ProgressProps {
  question: string;
  sources: number;
  elapsed: string;
  state: string;
}

const STEPS = [
  { key: "PLANNING", label: "Planning" },
  { key: "SEARCHING", label: "Searching" },
  { key: "RETRIEVING", label: "Retrieving" },
  { key: "EXTRACTING", label: "Extracting" },
  { key: "VERIFYING", label: "Verifying" },
  { key: "SYNTHESIZING", label: "Synthesizing" },
];

export const Progress: React.FC<ProgressProps> = ({ question, sources, elapsed, state }) => {
  const currentStep = STEPS.findIndex((s) => s.key === state);
  const completedSteps = currentStep >= 0 ? currentStep : STEPS.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <Box marginTop={1} marginBottom={1}>
        <Text bold color={COLORS.bold}>
          {question}
        </Text>
      </Box>
      <Box flexDirection="column" gap={0}>
        {STEPS.map((step, i) => {
          let status: StatusLineProps["status"] = "pending";
          if (i < completedSteps) status = "done";
          else if (i === currentStep) status = "active";
          const detail = step.key === "SEARCHING" && sources > 0 ? `${sources} sources` : undefined;
          return <StatusLine key={step.key} label={step.label} status={status} detail={detail} />;
        })}
      </Box>
      <Box marginTop={1}>
        <ProgressBar current={completedSteps} total={STEPS.length} />
        <Text color={COLORS.dim}>  {elapsed}</Text>
      </Box>
    </Box>
  );
};

export { COLORS };
