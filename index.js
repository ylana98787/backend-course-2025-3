#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const path = require('path');

program
  .option('-i, --input <path>', 'input file (JSON)')   // not requiredOption - we'll check manually to show exact message
  .option('-o, --output <path>', 'output file (optional)')
  .option('-d, --display', 'display result in console')
  .parse(process.argv);

const options = program.opts();

// --- check required input manually to show required error text ---
if (!options.input) {
  console.error("Please, specify input file");
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), options.input);
if (!fs.existsSync(inputPath)) {
  console.error("Cannot find input file");
  process.exit(1);
}

// Read file
let raw;
try {
  raw = fs.readFileSync(inputPath, 'utf8');
} catch (err) {
  console.error("Cannot find input file");
  process.exit(1);
}

// Try to parse JSON. Support:
// 1) normal JSON array: [ {...}, {...} ]
// 2) NDJSON (one JSON object per line)
// 3) pseudo-array where file begins with [ and ends with ] but objects are on separate lines without commas
function tryParseFlexible(rawText) {
  const trimmed = rawText.trim();
  // 1) Attempt full JSON.parse first (covers normal array and single object)
  try {
    const parsed = JSON.parse(trimmed);
    // normalize to array of objects
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch (err) {
    // fallthrough to NDJSON-like parsing
  }

  // 2) Attempt NDJSON / one-object-per-line parsing.
  //    We'll split by newline, clean each line, remove leading '[' or trailing ']' and trailing commas.
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    throw new Error('Invalid JSON format');
  }

  // Remove leading '[' token or remove leading '[' from first line if present
  if (lines[0] === '[') lines.shift();
  else lines[0] = lines[0].replace(/^\[+/, '');

  // Remove trailing ']' token or trailing ']' from last line if present
  const lastIdx = lines.length - 1;
  if (lines[lastIdx] === ']') lines.pop();
  else if (lines.length > 0) lines[lastIdx] = lines[lastIdx].replace(/\]+$/, '');

  const objects = [];

  // Try to parse each line as a complete JSON object.
  // We'll remove a trailing comma if present (common when someone pasted array entries without commas).
  for (let rawLine of lines) {
    if (!rawLine) continue;
    // Remove trailing comma that could separate elements but was lost in formatting
    rawLine = rawLine.replace(/,$/, '').trim();
    if (!rawLine) continue;
    try {
      const obj = JSON.parse(rawLine);
      objects.push(obj);
      continue;
    } catch (err) {
      // If parsing fails, we could try to accumulate multi-line objects, but that complicates logic.
      // For this project we assume each JSON object is on a single line (your sample looks like that).
      throw new Error('Invalid JSON format');
    }
  }

  if (objects.length === 0) throw new Error('Invalid JSON format');
  return objects;
}

let dataArray;
try {
  dataArray = tryParseFlexible(raw);
} catch (err) {
  console.error("Invalid JSON format");
  process.exit(1);
}

// Now we have an array of objects in dataArray
const resultString = JSON.stringify(dataArray, null, 2);

// If output path provided -> write file
if (options.output) {
  const outputPath = path.resolve(process.cwd(), options.output);
  try {
    fs.writeFileSync(outputPath, resultString, 'utf8');
  } catch (err) {
    console.error("Error writing to output file:", err.message);
    process.exit(1);
  }
}

// If --display -> log to console
if (options.display) {
  console.log(resultString);
}

// If neither --output nor --display -> do nothing (as required)
