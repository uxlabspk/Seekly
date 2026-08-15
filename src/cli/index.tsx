#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { App } from "./app.js";

const program = new Command();

program
  .name("seekly")
  .description("Local-first, evidence-backed CLI research agent")
  .version("0.1.0");

program
  .command("research")
  .description("Research a question")
  .argument("[question]", "Research question")
  .option("-d, --depth <depth>", "Research depth: quick, standard, deep", "standard")
  .option("-o, --output <file>", "Output file path")
  .action((question?: string, opts?: { output?: string }) => {
    const { waitUntilExit } = render(
      React.createElement(App, { question, outputFile: opts?.output })
    );
    waitUntilExit();
  });

program
  .command("doctor")
  .description("Diagnose Seekly configuration")
  .action(async () => {
    const { getConfig } = await import("../config/config.js");
    const { LlamaCppProvider } = await import("../model/llama-cpp.js");
    const config = getConfig();

    console.log("Seekly Doctor\n");
    console.log(`Node: ${process.version}`);
    console.log(`Model URL: ${config.modelUrl}`);
    console.log(`Model Name: ${config.modelName}`);
    console.log(`Database: ${config.databasePath}`);
    console.log(`Search Provider: ${config.searchProvider}`);
    console.log(`Offline: ${config.offline}`);
    console.log(`Citation Style: ${config.citationStyle}`);

    const provider = new LlamaCppProvider({ baseUrl: config.modelUrl });
    const healthy = await provider.healthCheck();
    console.log(`\nllama.cpp: ${healthy ? "✓ Connected" : "✗ Not available"}`);

    if (!healthy) {
      console.log(`\nExpected at: ${config.modelUrl}`);
      console.log("Start your llama.cpp server:");
      console.log(`  llama-server -m ./models/model.gguf --port 8080`);
    }
  });

program
  .command("history")
  .description("Show research history")
  .action(async () => {
    const { getAllSessions } = await import("../storage/repositories/session.js");
    const sessions = getAllSessions();
    if (sessions.length === 0) {
      console.log("No research sessions found.");
      return;
    }
    for (const s of sessions) {
      console.log(`${s.sessionId.slice(0, 8)}  ${s.status.padEnd(12)}  ${s.question.slice(0, 60)}`);
    }
  });

// Default: launch interactive mode
if (process.argv.length <= 2) {
  const { waitUntilExit } = render(React.createElement(App));
  waitUntilExit();
} else {
  program.parse();
}
