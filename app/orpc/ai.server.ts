import { z } from "zod";
import { base } from "./base.server";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/lib/ai.server";
import ZodXml, { createUnparsedString } from "@/lib/zod-xml";

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
      })
    )
    .handler(async function* ({ input, context, lastEventId }) {
      const anthropicApiKey = context.ANTHROPIC_API_KEY;

      const allMessages = input.messages;
      const structureDescription = input.structureDescription;

      const anthropic = createAnthropic({
        apiKey: anthropicApiKey,
      });

      const renderedSystemPrompt = SYSTEM_PROMPT(structureDescription);

      const { textStream } = await streamText({
        model: anthropic("claude-3-7-sonnet-latest"),
        messages: allMessages,
        system: renderedSystemPrompt,
        maxTokens: 64000,
      });

      let accumulatedText = "";

      for await (const chunk of textStream) {
        accumulatedText += chunk;

        const components = extractPendingStructuredComponents(accumulatedText);
        
        // Only consider it finished if the component is complete (has closing tag)
        const finishedArtifactFull = components?.grist_artifact_full?.isComplete 
          ? components.grist_artifact_full.content 
          : undefined;
          
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
          finishedArtifact: finishedArtifactFull,
          pendingArtifact: pendingArtifactFull,
          artifactPurpose: artifactPurpose,
        };
      }
    }),
});

const ArtifactResponse = z.object({
  response: z
    .object({
      grist_artifact_full: z.string(),
      grist_artifact_update: z.string(),
      grist_artifact_purpose: z.string(),
    })
    .partial(),
});

export interface ExtractedArtifact {
  content: string;
  isComplete: boolean;
}

export interface ExtractedComponents {
  grist_artifact_full?: ExtractedArtifact;
  grist_artifact_update?: ExtractedArtifact;
  grist_artifact_purpose?: ExtractedArtifact;
}

export function extractPendingStructuredComponents(
  text: string
): ExtractedComponents | undefined {
  const result: ExtractedComponents = {};
  
  // Extract grist_artifact_full
  const fullArtifactRegex = /<grist_artifact_full[^>]*>([\s\S]*?)(?:<\/grist_artifact_full>|$)/;
  const fullArtifactMatch = text.match(fullArtifactRegex);
  if (fullArtifactMatch) {
    const content = fullArtifactMatch[1];
    const hasClosingTag = text.includes("</grist_artifact_full>");
    
    result.grist_artifact_full = {
      content: content,
      isComplete: hasClosingTag
    };
  }
  
  // Extract grist_artifact_update
  const updateArtifactRegex = /<grist_artifact_update[^>]*>([\s\S]*?)(?:<\/grist_artifact_update>|$)/;
  const updateArtifactMatch = text.match(updateArtifactRegex);
  if (updateArtifactMatch) {
    const content = updateArtifactMatch[1];
    const hasClosingTag = text.includes("</grist_artifact_update>");
    
    result.grist_artifact_update = {
      content: content,
      isComplete: hasClosingTag
    };
  }
  
  // Extract grist_artifact_purpose
  const purposeArtifactRegex = /<grist_artifact_purpose[^>]*>([\s\S]*?)(?:<\/grist_artifact_purpose>|$)/;
  const purposeArtifactMatch = text.match(purposeArtifactRegex);
  if (purposeArtifactMatch) {
    const content = purposeArtifactMatch[1];
    const hasClosingTag = text.includes("</grist_artifact_purpose>");
    
    result.grist_artifact_purpose = {
      content: content,
      isComplete: hasClosingTag
    };
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}
