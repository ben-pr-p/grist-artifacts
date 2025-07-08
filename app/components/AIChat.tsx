import { Send } from "lucide-react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { orpcFetchQuery } from "@/lib/orpcFetch.client";
import {
  describeGristStructure,
  recursiveTrimToThreeArrayMembers,
  useTableList,
} from "@/lib/grist.client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { artifactPurposeAtom, userCodeAtom } from "@/lib/atoms.client";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/chat/expandable-chat";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useToast } from "@/components/ui/use-toast";

const _chatMessagesAtom = atom<
  {
    role: "user" | "assistant" | "system";
    content: string;
    loading?: boolean;
  }[]
>([
  {
    role: "assistant",
    content: "How can I help you today?",
  },
]);
const chatMessagesAtom = atom<
  {
    role: "user" | "assistant" | "system";
    content: string;
    loading?: boolean;
  }[],
  [{ role: "user" | "assistant" | "system"; content: string }],
  void
>(
  (get) => get(_chatMessagesAtom),
  (get, set, update) => {
    const currentMessages = get(_chatMessagesAtom);
    const newValue = [...currentMessages, update];
    set(_chatMessagesAtom, newValue);
    return newValue;
  }
);
const clearChatMessagesAtom = atom(null, (get, set) => {
  set(_chatMessagesAtom, []);
});

export function AIChat(props: {
  data: Record<string, unknown>[];
  onUserCodeChange: (code: string) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [chatMessages, appendChatMessage] = useAtom(chatMessagesAtom);
  const [artifactPurpose] = useAtom(artifactPurposeAtom);
  const userCode = useAtomValue(userCodeAtom);
  const clearChatMessages = useSetAtom(clearChatMessagesAtom);
  const tableList = useTableList();
  const [waitingForResponseToStart, setWaitingForResponseToStart] =
    useState(false);
  const [artifactApplied, setArtifactApplied] = useState(false);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);
  const [inProgressStreamingMessage, setInProgressStreamingMessage] = useState<{
    fullResponse: string;
    nextPart: string;
    finishedArtifact: string | undefined;
    pendingArtifact: string | undefined;
    artifactPurpose: string | undefined;
  } | null>(null);
  const [waitingForResponseToFinish, setWaitingForResponseToFinish] =
    useState(false);

  const chatPrefixes =
    artifactPurpose || userCode
      ? [
          {
            role: "assistant" as const,
            content: `Here is previous context from other sessions.\n\n <grist_artifact_purpose>${artifactPurpose}</grist_artifact_purpose>\n\n <grist_artifact_code>${userCode}</grist_artifact_code>`,
          },
        ]
      : [];

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: "user" as const, content: message };
    appendChatMessage(userMessage);
    setMessage("");

    const nextMessages = [...chatMessages, userMessage];

    setWaitingForResponseToStart(true);
    setWaitingForResponseToFinish(true);
    // Reset artifact applied flag for a new response
    setArtifactApplied(false);

    const responseStream = await orpcFetchQuery.ai.nextMessage.call({
      messages: [...chatPrefixes, ...nextMessages],
      structureDescription: describeGristStructure(
        recursiveTrimToThreeArrayMembers(props.data),
        props.data.length,
        tableList.map((table) => ({
          tableId: table.tableId as string,
          sampleRecords: recursiveTrimToThreeArrayMembers(table.sampleRecords),
        }))
      ),
      currentArtifact: userCode || undefined,
    });

    setWaitingForResponseToStart(false);

    // Flag to track artifact application within the loop
    let localArtifactApplied = false;

    try {
      for await (const chunk of responseStream) {
        // Detect if an artifact is being generated (pendingArtifact exists)
        if (chunk.pendingArtifact && !generatingArtifact) {
          setGeneratingArtifact(true);
        }

        // Create a modified chunk for displaying in the chat
        // If generating artifact, don't show the artifact content
        const displayChunk = {
          ...chunk,
          fullResponse: generatingArtifact
            ? chunk.fullResponse.replace(
                /<grist_artifact_full[\s\S]*?(?:<\/grist_artifact_full>|$)/,
                "🔄 [Writing updated component...]"
              )
            : chunk.fullResponse,
        };

        setInProgressStreamingMessage(displayChunk);

        // Only update the code once per request and show toast notification
        if (chunk.finishedArtifact && !localArtifactApplied) {
          props.onUserCodeChange(chunk.finishedArtifact);
          localArtifactApplied = true;
          setArtifactApplied(true);
          setGeneratingArtifact(false); // Stop showing "writing" indicator as soon as artifact is finished

          toast({
            title: "Code Updated",
            description: "AI generated code has been applied to the editor",
            duration: 3000, // 3 seconds
            variant: "default",
          });
        }

        // Update artifact purpose if it's available
        if (chunk.artifactPurpose) {
          // Handle artifact purpose update if needed
        }
      }
    } finally {
      // Always reset waiting state and artifact applied state when done or on error
      setWaitingForResponseToFinish(false);
      // Reset artifact applied state for the next message
      setArtifactApplied(false);
      setGeneratingArtifact(false);
    }
  };

  const chatMessagesWithInProgressStreamingMessage = inProgressStreamingMessage
    ? [
        ...chatMessages,
        { role: "assistant" as const, content: inProgressStreamingMessage },
      ]
    : chatMessages;

  const messagesMaybeWithLoadingMessage = waitingForResponseToStart
    ? [
        ...chatMessages,
        { role: "assistant" as const, content: "Thinking...", loading: true },
      ]
    : chatMessagesWithInProgressStreamingMessage;

  return (
    <ExpandableChat size="lg" position="bottom-left">
      <ExpandableChatHeader className="flex items-center p-2 border-b">
        <h2 className="text-sm font-medium">AI Assistant</h2>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1"
            onClick={() => clearChatMessages()}
          >
            Clear Chat
          </Button>
        </div>
      </ExpandableChatHeader>

      <ExpandableChatBody className="flex-1 overflow-y-auto p-3">
        <ChatMessageList>
          {messagesMaybeWithLoadingMessage.map((msg, index) => (
            <ChatBubble
              key={index}
              variant={msg.role === "user" ? "sent" : "received"}
            >
              {msg.role === "assistant" && <ChatBubbleAvatar />}
              <ChatBubbleMessage>
                <pre className="whitespace-pre-wrap font-sans">
                  {typeof msg.content === "string"
                    ? msg.content
                    : msg.content.fullResponse}
                </pre>
                {(("loading" in msg && msg.loading) ||
                  (typeof msg.content !== "string" &&
                    msg.content.fullResponse.includes(
                      "[Writing updated component...]"
                    ))) && (
                  <div className="flex items-center justify-center pt-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {typeof msg.content !== "string" &&
                  msg.content.fullResponse.includes(
                    "🔄 [Writing updated component...]"
                  ) && (
                    <div className="flex items-center gap-2 text-sm text-blue-500 pt-2 italic">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Writing component code... This won't appear in the final
                      response.
                    </div>
                  )}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </ExpandableChatBody>

      <ExpandableChatFooter className="p-3 border-t flex gap-2">
        <Input
          disabled={waitingForResponseToFinish}
          placeholder="Ask the AI assistant..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSendMessage}
          disabled={waitingForResponseToFinish || !message.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </ExpandableChatFooter>
    </ExpandableChat>
  );
}
