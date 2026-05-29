import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SkillUpdate = {
  file: string;
  section: string;
  action: "append" | "replace";
  content: string;
};

const updatesPath = process.argv[2] ?? "qa-results/skill-updates.json";

function assertSafeSkillPath(file: string) {
  const normalized = file.replaceAll("\\", "/");

  if (!normalized.startsWith(".factory/skills/") || normalized.includes("..")) {
    throw new Error(`Unsafe skill update path: ${file}`);
  }

  return path.resolve(process.cwd(), normalized);
}

function parseUpdates(raw: string): SkillUpdate[] {
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("skill-updates.json must contain an array");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Update ${index} must be an object`);
    }

    const update = item as Partial<SkillUpdate>;

    if (
      typeof update.file !== "string" ||
      typeof update.section !== "string" ||
      (update.action !== "append" && update.action !== "replace") ||
      typeof update.content !== "string"
    ) {
      throw new Error(`Update ${index} has an invalid schema`);
    }

    return update as SkillUpdate;
  });
}

function updateSection(markdown: string, update: SkillUpdate) {
  const headingPattern = new RegExp(`(^#{1,6}\\s+${escapeRegExp(update.section)}\\s*$)`, "m");
  const headingMatch = markdown.match(headingPattern);

  if (!headingMatch || headingMatch.index === undefined) {
    throw new Error(`Section "${update.section}" not found in ${update.file}`);
  }

  const headingEnd = headingMatch.index + headingMatch[0].length;
  const nextHeadingPattern = /^#{1,6}\s+/gm;
  nextHeadingPattern.lastIndex = headingEnd;
  const nextHeading = nextHeadingPattern.exec(markdown);
  const sectionEnd = nextHeading?.index ?? markdown.length;

  if (update.action === "append") {
    const before = markdown.slice(0, sectionEnd).trimEnd();
    const after = markdown.slice(sectionEnd);
    return `${before}\n\n${update.content.trim()}\n${after}`;
  }

  return `${markdown.slice(0, headingEnd).trimEnd()}\n\n${update.content.trim()}\n${markdown.slice(sectionEnd)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  if (!existsSync(updatesPath)) {
    console.log(`No QA skill updates found at ${updatesPath}; skipping.`);
    return;
  }

  const updates = parseUpdates(await readFile(updatesPath, "utf8"));

  if (updates.length === 0) {
    console.log("QA skill updates file was empty; skipping.");
    return;
  }

  for (const update of updates) {
    const filePath = assertSafeSkillPath(update.file);
    const current = await readFile(filePath, "utf8");
    const next = updateSection(current, update);
    await writeFile(filePath, next, "utf8");
    console.log(`Applied QA skill update to ${update.file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
