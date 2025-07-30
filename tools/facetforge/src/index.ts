#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import type { ChunkPlan, FunctionChunk } from './chunker.js';
import { ChunkPlanner } from './chunker.js';
import { ManifestBuilder } from './manifest.js';
import type { AnalysisResult } from './parser.js';
import { StaticExtractor } from './parser.js';
import type { CollisionReport, SelectorMap } from './selector.js';
import { SelectorCalculator } from './selector.js';

const program = new Command();

program
  .name('facetforge')
  .description('PayRox FacetForge - Intelligent contract analysis and chunking')
  .version('1.0.0');

program
  .command('analyze <contractPath>')
  .description('Analyze a Solidity contract and extract function information')
  .option(
    '-o, --output <file>',
    'Output file for analysis results',
    'analysis.json'
  )
  .option('-v, --verbose', 'Verbose output')
  .action(
    async (
      contractPath: string,
      options: { output: string; verbose?: boolean }
    ) => {
      try {
        console.log(`Analyzing contract: ${contractPath}`);

        const extractor = new StaticExtractor();
        const analysis = await extractor.extractFromFile(contractPath);

        if (options.verbose) {
          console.log('Analysis Results:');
          console.log(`- Functions found: ${analysis.functions.length}`);
          console.log(`- State variables: ${analysis.stateVariables.length}`);
          console.log(`- Events: ${analysis.events.length}`);
          console.log(`- Modifiers: ${analysis.modifiers.length}`);
        }

        fs.writeFileSync(options.output, JSON.stringify(analysis, null, 2));
        console.log(`Analysis saved to: ${options.output}`);
      } catch (error) {
        console.error('Analysis failed:', (error as Error).message);
        process.exit(1);
      }
    }
  );

program
  .command('chunk <contractPath>')
  .description('Plan optimal chunking strategy for a contract')
  .option('-s, --max-size <bytes>', 'Maximum chunk size in bytes', '24576')
  .option(
    '-o, --output <file>',
    'Output file for chunk plan',
    'chunk-plan.json'
  )
  .option(
    '--strategy <type>',
    'Chunking strategy (function|feature|gas)',
    'function'
  )
  .action(
    async (
      contractPath: string,
      options: {
        maxSize: string;
        output: string;
        strategy: 'function' | 'feature' | 'gas';
      }
    ) => {
      try {
        console.log(`Planning chunks for: ${contractPath}`);

        const extractor = new StaticExtractor();
        const analysis = await extractor.extractFromFile(contractPath);

        const planner = new ChunkPlanner({
          maxChunkSize: parseInt(options.maxSize),
          strategy: options.strategy,
        });

        const chunkPlan = planner.planChunks(analysis);

        console.log(`Generated ${chunkPlan.chunks.length} chunks:`);
        chunkPlan.chunks.forEach((chunk, i) => {
          console.log(
            `  Chunk ${i + 1}: ${chunk.functions.length} functions, ~${
              chunk.estimatedSize
            } bytes`
          );
        });

        fs.writeFileSync(options.output, JSON.stringify(chunkPlan, null, 2));
        console.log(`Chunk plan saved to: ${options.output}`);
      } catch (error) {
        console.error('Chunking failed:', (error as Error).message);
        process.exit(1);
      }
    }
  );

program
  .command('selectors <contractPath>')
  .description('Calculate function selectors and detect collisions')
  .option(
    '-o, --output <file>',
    'Output file for selector map',
    'selectors.json'
  )
  .option(
    '--check-collisions',
    'Check for selector collisions with common standards'
  )
  .action(
    async (
      contractPath: string,
      options: {
        output: string;
        checkCollisions?: boolean;
      }
    ) => {
      try {
        console.log(`Calculating selectors for: ${contractPath}`);

        const extractor = new StaticExtractor();
        const analysis = await extractor.extractFromFile(contractPath);

        const calculator = new SelectorCalculator();
        const selectorMap = calculator.calculateSelectors(analysis.functions);

        if (options.checkCollisions) {
          const collisions = calculator.detectCollisions(selectorMap);
          if (Object.keys(collisions).length > 0) {
            console.log('Selector collisions detected:');
            Object.entries(collisions).forEach(([selector, functions]) => {
              console.log(`  ${selector}: ${functions.join(', ')}`);
            });
          } else {
            console.log('No selector collisions found');
          }
        }

        fs.writeFileSync(options.output, JSON.stringify(selectorMap, null, 2));
        console.log(`Selectors saved to: ${options.output}`);
      } catch (error) {
        console.error('Selector calculation failed:', (error as Error).message);
        process.exit(1);
      }
    }
  );

program
  .command('manifest <contractPath>')
  .description('Build complete deployment manifest')
  .option(
    '-o, --output <file>',
    'Output manifest file',
    'deployment.manifest.json'
  )
  .option('--network <name>', 'Target network', 'hardhat')
  .option('--factory <address>', 'Factory contract address')
  .option('--dispatcher <address>', 'Dispatcher contract address')
  .action(
    async (
      contractPath: string,
      options: {
        output: string;
        network: string;
        factory?: string;
        dispatcher?: string;
      }
    ) => {
      try {
        console.log(`Building manifest for: ${contractPath}`);

        const extractor = new StaticExtractor();
        const analysis = await extractor.extractFromFile(contractPath);

        const planner = new ChunkPlanner();
        const chunkPlan = planner.planChunks(analysis);

        const calculator = new SelectorCalculator();
        const selectorMap = calculator.calculateSelectors(analysis.functions);

        const builder = new ManifestBuilder({
          network: options.network,
          factory: options.factory,
          dispatcher: options.dispatcher,
        });

        const manifest = builder.buildManifest({
          analysis,
          chunkPlan,
          selectorMap,
        });

        fs.writeFileSync(options.output, JSON.stringify(manifest, null, 2));
        console.log(`Manifest saved to: ${options.output}`);
        console.log(
          `Manifest contains ${manifest.routes.length} routes across ${chunkPlan.chunks.length} chunks`
        );
      } catch (error) {
        console.error('Manifest building failed:', (error as Error).message);
        process.exit(1);
      }
    }
  );

program
  .command('validate <manifestPath>')
  .description('Validate a deployment manifest')
  .option('--strict', 'Enable strict validation mode')
  .action(async (manifestPath: string, options: { strict?: boolean }) => {
    try {
      console.log(`Validating manifest: ${manifestPath}`);

      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      const builder = new ManifestBuilder();
      const validation = builder.validateManifest(manifest, options.strict);

      if (validation.valid) {
        console.log('Manifest validation passed');
        if (validation.warnings && validation.warnings.length > 0) {
          console.log('Warnings:');
          validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
      } else {
        console.log('Manifest validation failed:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Validation failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('report <contractPath>')
  .description('Generate comprehensive analysis report')
  .option('-o, --output <file>', 'Output report file', 'report.md')
  .option('--format <type>', 'Report format (markdown|json|html)', 'markdown')
  .action(
    async (
      contractPath: string,
      options: {
        output: string;
        format: 'markdown' | 'json' | 'html';
      }
    ) => {
      try {
        console.log(`Generating report for: ${contractPath}`);

        const extractor = new StaticExtractor();
        const analysis = await extractor.extractFromFile(contractPath);

        const planner = new ChunkPlanner();
        const chunkPlan = planner.planChunks(analysis);

        const calculator = new SelectorCalculator();
        const selectorMap = calculator.calculateSelectors(analysis.functions);
        const collisions = calculator.detectCollisions(selectorMap);

        let report: string;
        switch (options.format) {
          case 'json':
            report = JSON.stringify(
              {
                analysis,
                chunkPlan,
                selectorMap,
                collisions,
              },
              null,
              2
            );
            break;
          case 'markdown':
            report = generateMarkdownReport({
              analysis,
              chunkPlan,
              selectorMap,
              collisions,
            });
            break;
          case 'html':
            report = generateHtmlReport({
              analysis,
              chunkPlan,
              selectorMap,
              collisions,
            });
            break;
          default:
            throw new Error(`Unsupported format: ${options.format}`);
        }

        fs.writeFileSync(options.output, report);
        console.log(`Report saved to: ${options.output}`);
      } catch (error) {
        console.error('Report generation failed:', (error as Error).message);
        process.exit(1);
      }
    }
  );

interface ReportData {
  analysis: AnalysisResult;
  chunkPlan: ChunkPlan;
  selectorMap: SelectorMap;
  collisions: CollisionReport;
}

function generateMarkdownReport(data: ReportData): string {
  const { analysis, chunkPlan, collisions } = data;

  let report = `# Contract Analysis Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `## Overview\n`;
  report += `- Functions: ${analysis.functions.length}\n`;
  report += `- State Variables: ${analysis.stateVariables.length}\n`;
  report += `- Events: ${analysis.events.length}\n`;
  report += `- Modifiers: ${analysis.modifiers.length}\n`;
  report += `- Planned Chunks: ${chunkPlan.chunks.length}\n\n`;

  if (Object.keys(collisions).length > 0) {
    report += `## Selector Collisions\n`;
    Object.entries(collisions).forEach(([selector, functions]) => {
      report += `- **${selector}**: ${(functions as string[]).join(', ')}\n`;
    });
    report += `\n`;
  }

  report += `## Chunk Plan\n`;
  chunkPlan.chunks.forEach((chunk: FunctionChunk, i: number) => {
    report += `### Chunk ${i + 1}\n`;
    report += `- Functions: ${chunk.functions.length}\n`;
    report += `- Estimated Size: ${chunk.estimatedSize} bytes\n`;
    report += `- Functions: ${chunk.functions.map(f => f.name).join(', ')}\n\n`;
  });

  return report;
}

function generateHtmlReport(data: ReportData): string {
  // Basic HTML template - could be enhanced with proper styling
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Contract Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .section { margin-bottom: 30px; }
        .warning { background: #fff3cd; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Contract Analysis Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>

    <div class="section">
        <h2>Overview</h2>
        <ul>
            <li>Functions: ${data.analysis.functions.length}</li>
            <li>State Variables: ${data.analysis.stateVariables.length}</li>
            <li>Events: ${data.analysis.events.length}</li>
            <li>Modifiers: ${data.analysis.modifiers.length}</li>
            <li>Planned Chunks: ${data.chunkPlan.chunks.length}</li>
        </ul>
    </div>

    ${
      Object.keys(data.collisions).length > 0
        ? `
    <div class="section">
        <h2>Selector Collisions</h2>
        <div class="warning">
            ${Object.entries(data.collisions)
              .map(
                ([selector, functions]) =>
                  `<p><strong>${selector}:</strong> ${(
                    functions as string[]
                  ).join(', ')}</p>`
              )
              .join('')}
        </div>
    </div>
    `
        : ''
    }

    <div class="section">
        <h2>Chunk Plan</h2>
        ${data.chunkPlan.chunks
          .map(
            (chunk: FunctionChunk, i: number) => `
            <h3>Chunk ${i + 1}</h3>
            <ul>
                <li>Functions: ${chunk.functions.length}</li>
                <li>Estimated Size: ${chunk.estimatedSize} bytes</li>
                <li>Functions: ${chunk.functions
                  .map(f => f.name)
                  .join(', ')}</li>
            </ul>
        `
          )
          .join('')}
    </div>
</body>
</html>
  `;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
