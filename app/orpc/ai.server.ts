import { z } from "zod";
import { base } from "./base.server";
import { generateText, streamText } from "ai";
import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";

import { SYSTEM_PROMPT } from "@/lib/ai.server";
import { env } from "@/env.server";

export const aiRouter = base.router({
  nextMessage: base
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          })
        ),
        structureDescription: z.string(),
        currentArtifact: z.string().optional(),
      })
    )
    .handler(async function* ({ input, context, lastEventId }) {
      try {
        const allMessages = input.messages;
        const structureDescription = input.structureDescription;
        const originalArtifact = input.currentArtifact || "";

        const anthropic = createAnthropic({
          apiKey: env.ANTHROPIC_API_KEY,
        });

        const openrouter = createOpenRouter({
          apiKey: env.OPENROUTER_API_KEY,
        });

        const renderedSystemPrompt = SYSTEM_PROMPT(structureDescription);

        const allMessagesWithSystem = [
          {
            role: "system" as const,
            content: renderedSystemPrompt,
          },
          ...allMessages,
        ];

        const { textStream } = await streamText({
          model: anthropic("claude-sonnet-4-20250514"),
          messages: allMessagesWithSystem,
        });

        let accumulatedText = "";
        let allUpdatesApplied: ArtifactUpdate[] = [];

        for await (const chunk of textStream) {
          accumulatedText += chunk;

          const components =
            extractPendingStructuredComponents(accumulatedText);

          // Handle full artifact replacement
          const finishedArtifactFull = components?.grist_artifact_full
            ?.isComplete
            ? components.grist_artifact_full.content
            : undefined;

          // Handle partial updates
          let currentArtifact = originalArtifact;
          if (
            components?.grist_artifact_updates &&
            components.grist_artifact_updates.length > 0
          ) {
            // Get only the complete updates that we haven't applied yet
            const newCompleteUpdates = components.grist_artifact_updates.filter(
              (update) =>
                update.isComplete &&
                !allUpdatesApplied.some(
                  (applied) =>
                    applied.instruction === update.instruction &&
                    applied.updateDescription === update.updateDescription
                )
            );

            if (newCompleteUpdates.length > 0) {
              // Apply each new update sequentially to the current artifact
              for (const update of newCompleteUpdates) {
                try {
                  const updatedCode = await applyUpdate(
                    openrouter,
                    update.instruction,
                    currentArtifact,
                    update.updateDescription
                  );
                  currentArtifact = updatedCode;
                  allUpdatesApplied.push(update);
                } catch (error) {
                  console.error("Failed to apply update:", error);
                }
              }
            }
          }

          // Always include the pending component regardless of completion status
          const pendingArtifactFull = components?.grist_artifact_full
            ? components.grist_artifact_full.content
            : undefined;

          // Include artifact purpose as well
          const artifactPurpose = components?.grist_artifact_purpose
            ? components.grist_artifact_purpose.content
            : undefined;

          yield {
            fullResponse: accumulatedText,
            nextPart: chunk,
            finishedArtifact:
              finishedArtifactFull ||
              (allUpdatesApplied.length > 0 ? currentArtifact : undefined),
            pendingArtifact: pendingArtifactFull,
            artifactPurpose: artifactPurpose,
          };
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    }),
});

export interface ExtractedArtifact {
  content: string;
  isComplete: boolean;
}

export interface ArtifactUpdate {
  instruction: string;
  updateDescription: string;
  isComplete: boolean;
}

export interface ExtractedComponents {
  grist_artifact_full?: ExtractedArtifact;
  grist_artifact_updates?: ArtifactUpdate[];
  grist_artifact_purpose?: ExtractedArtifact;
}

export function extractPendingStructuredComponents(
  text: string
): ExtractedComponents | undefined {
  const result: ExtractedComponents = {};

  // Extract grist_artifact_full
  const fullArtifactRegex =
    /<grist_artifact_full[^>]*>([\s\S]*?)(?:<\/grist_artifact_full>|$)/;
  const fullArtifactMatch = text.match(fullArtifactRegex);
  if (fullArtifactMatch) {
    const content = fullArtifactMatch[1];
    const hasClosingTag = text.includes("</grist_artifact_full>");

    result.grist_artifact_full = {
      content: content,
      isComplete: hasClosingTag,
    };
  }

  // Extract all grist_artifact_update blocks
  const updateArtifactRegex =
    /<grist_artifact_update[^>]*>([\s\S]*?)<\/grist_artifact_update>/g;
  const updateMatches = Array.from(text.matchAll(updateArtifactRegex));

  if (updateMatches.length > 0) {
    result.grist_artifact_updates = updateMatches.map((match) => {
      const content = match[1];

      // Parse instruction and updateDescription from nested tags
      const instructionMatch = content.match(
        /<instruction>([\s\S]*?)<\/instruction>/
      );
      const updateDescriptionMatch = content.match(
        /<update_description>([\s\S]*?)<\/update_description>/
      );

      return {
        instruction: instructionMatch ? instructionMatch[1] : "",
        updateDescription: updateDescriptionMatch
          ? updateDescriptionMatch[1]
          : "",
        isComplete: true, // Only matched complete blocks
      };
    });
  }

  // Also check for incomplete update blocks
  const incompleteUpdateRegex = /<grist_artifact_update[^>]*>([\s\S]*?)$/;
  const incompleteMatch = text.match(incompleteUpdateRegex);
  if (
    incompleteMatch &&
    !text.includes("</grist_artifact_update>", incompleteMatch.index)
  ) {
    const content = incompleteMatch[1];
    const instructionMatch = content.match(
      /<instruction>([\s\S]*?)(?:<\/instruction>|$)/
    );
    const updateDescriptionMatch = content.match(
      /<update_description>([\s\S]*?)(?:<\/update_description>|$)/
    );

    if (!result.grist_artifact_updates) {
      result.grist_artifact_updates = [];
    }
    result.grist_artifact_updates.push({
      instruction: instructionMatch ? instructionMatch[1] : "",
      updateDescription: updateDescriptionMatch
        ? updateDescriptionMatch[1]
        : "",
      isComplete: false,
    });
  }

  // Extract grist_artifact_purpose
  const purposeArtifactRegex =
    /<grist_artifact_purpose[^>]*>([\s\S]*?)(?:<\/grist_artifact_purpose>|$)/;
  const purposeArtifactMatch = text.match(purposeArtifactRegex);
  if (purposeArtifactMatch) {
    const content = purposeArtifactMatch[1];
    const hasClosingTag = text.includes("</grist_artifact_purpose>");

    result.grist_artifact_purpose = {
      content: content,
      isComplete: hasClosingTag,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Instructions for code generation for thing to apply to morph model
 * 
    Use this tool to make an edit to an existing file.
    This will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
    When writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.

    For example:

    // ... existing code ...
    FIRST_EDIT
    // ... existing code ...
    SECOND_EDIT
    // ... existing code ...
    THIRD_EDIT
    // ... existing code ...

    You should still bias towards repeating as few lines of the original file as possible to convey the change.
    But, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.
    DO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.
    If you plan on deleting a section, you must provide context before and after to delete it. If the initial code is ```code \n Block 1 \n Block 2 \n Block 3 \n code```, and you want to remove Block 2, you would output ```// ... existing code ... \n Block 1 \n  Block 3 \n // ... existing code ...```.
    Make sure it is clear what the edit should be, and where it should be applied.
    ALWAYS make all edits to a file in a single edit_file instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.
 */
async function applyUpdate(
  openrouter: OpenRouterProvider,
  instruction: string,
  currentCode: string,
  updateDescription: string
) {
  const userMessage = `
    <instruction>
      ${instruction}
    </instruction>
    <code>
      ${currentCode}
    </code>
    <update>
      ${updateDescription}
    </update>`;

  const updatedCode = await generateText({
    model: openrouter("morph/morph-v3-fast") as any,
    messages: [{ role: "user", content: userMessage }],
  });

  return updatedCode.text;
}
