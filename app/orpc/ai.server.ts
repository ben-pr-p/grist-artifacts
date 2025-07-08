import { z } from "zod";
import { base } from "./base.server";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/ai.server";
import { env } from "@/env.server";

function applyArtifactUpdates(
  currentArtifact: string,
  updates: ArtifactUpdate[]
): { success: boolean; artifact: string; error?: string } {
  let updatedArtifact = currentArtifact;
  
  for (const update of updates) {
    if (!update.isComplete || !update.oldText || !update.newText) {
      continue; // Skip incomplete updates
    }
    
    // Check if the old text exists in the artifact
    if (!updatedArtifact.includes(update.oldText)) {
      return {
        success: false,
        artifact: currentArtifact,
        error: `Text not found: "${update.oldText.substring(0, 50)}..."`
      };
    }
    
    // Apply the update
    updatedArtifact = updatedArtifact.replace(update.oldText, update.newText);
  }
  
  return {
    success: true,
    artifact: updatedArtifact
  };
}

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

        const renderedSystemPrompt = SYSTEM_PROMPT(structureDescription);

        const { textStream } = await streamText({
          model: anthropic("claude-4-sonnet-20250514"),
          messages: allMessages,
          system: renderedSystemPrompt,
          maxTokens: 64000,
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
          if (components?.grist_artifact_updates && components.grist_artifact_updates.length > 0) {
            // Get only the complete updates that we haven't applied yet
            const newCompleteUpdates = components.grist_artifact_updates.filter(
              update => update.isComplete && 
              !allUpdatesApplied.some(applied => 
                applied.oldText === update.oldText && 
                applied.newText === update.newText
              )
            );

            if (newCompleteUpdates.length > 0) {
              // Apply all updates (both previously applied and new ones) to the original artifact
              allUpdatesApplied = [...allUpdatesApplied, ...newCompleteUpdates];
              const updateResult = applyArtifactUpdates(originalArtifact, allUpdatesApplied);
              
              if (updateResult.success) {
                currentArtifact = updateResult.artifact;
              } else {
                console.error("Failed to apply updates:", updateResult.error);
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
            finishedArtifact: finishedArtifactFull || (allUpdatesApplied.length > 0 ? currentArtifact : undefined),
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
  oldText: string;
  newText: string;
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
    result.grist_artifact_updates = updateMatches.map(match => {
      const content = match[1];
      
      // Parse old_text and new_text from the content
      const oldTextMatch = content.match(/<old_text>([\s\S]*?)<\/old_text>/);
      const newTextMatch = content.match(/<new_text>([\s\S]*?)<\/new_text>/);
      
      return {
        oldText: oldTextMatch ? oldTextMatch[1] : "",
        newText: newTextMatch ? newTextMatch[1] : "",
        isComplete: true // Only matched complete blocks
      };
    });
  }
  
  // Also check for incomplete update blocks
  const incompleteUpdateRegex = /<grist_artifact_update[^>]*>([\s\S]*?)$/;
  const incompleteMatch = text.match(incompleteUpdateRegex);
  if (incompleteMatch && !text.includes("</grist_artifact_update>", incompleteMatch.index)) {
    const content = incompleteMatch[1];
    const oldTextMatch = content.match(/<old_text>([\s\S]*?)(?:<\/old_text>|$)/);
    const newTextMatch = content.match(/<new_text>([\s\S]*?)(?:<\/new_text>|$)/);
    
    if (!result.grist_artifact_updates) {
      result.grist_artifact_updates = [];
    }
    result.grist_artifact_updates.push({
      oldText: oldTextMatch ? oldTextMatch[1] : "",
      newText: newTextMatch ? newTextMatch[1] : "",
      isComplete: false
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
