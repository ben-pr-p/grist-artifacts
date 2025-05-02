import { describe, expect, it } from "vitest";
import { extractPendingStructuredComponents } from "./ai.server";

describe("extractPendingStructuredComponents", () => {
  it("should correctly identify a complete artifact with closing tag", () => {
    const text = `<grist_artifact_full identifier="record-cards" type="application/vnd.ant.react" title="Component">
import React from 'react';
export default () => <div>Test</div>;
</grist_artifact_full>`;

    const components = extractPendingStructuredComponents(text);
    expect(components).toBeDefined();
    expect(components?.grist_artifact_full).toBeDefined();
    expect(components?.grist_artifact_full?.isComplete).toBe(true);
    expect(components?.grist_artifact_full?.content).toContain(
      "export default () => <div>Test</div>"
    );
  });

  it("should correctly identify an incomplete artifact without closing tag", () => {
    const text = `<grist_artifact_full identifier="record-cards" type="application/vnd.ant.react" title="Component">
import React from 'react';
export default () => <div>Test</div>;`;

    const components = extractPendingStructuredComponents(text);
    expect(components).toBeDefined();
    expect(components?.grist_artifact_full).toBeDefined();
    expect(components?.grist_artifact_full?.isComplete).toBe(false);
    expect(components?.grist_artifact_full?.content).toContain(
      "import React from"
    );
  });

  it("should correctly handle multiple different artifact types", () => {
    const text = `Here's a component:
<grist_artifact_full identifier="record-cards" type="application/vnd.ant.react" title="Component">
import React from 'react';
export default () => <div>Test</div>;
</grist_artifact_full>

And here's an update:
<grist_artifact_update identifier="update-component" type="application/vnd.ant.react">
This is an update that's still being generated`;

    const components = extractPendingStructuredComponents(text);
    expect(components).toBeDefined();

    // Full artifact should be complete
    expect(components?.grist_artifact_full).toBeDefined();
    expect(components?.grist_artifact_full?.isComplete).toBe(true);

    // Update artifact should be incomplete
    expect(components?.grist_artifact_update).toBeDefined();
    expect(components?.grist_artifact_update?.isComplete).toBe(false);
  });

  it("should correctly extract artifact purpose", () => {
    const text = `Here's a component purpose:
<grist_artifact_purpose type="application/vnd.ant.text">
This component displays a user's profile information with a clean, modern interface.
</grist_artifact_purpose>

And here's the component:
<grist_artifact_full identifier="profile" type="application/vnd.ant.react" title="Profile Component">
import React from 'react';
export default () => <div>Profile Display</div>;
</grist_artifact_full>`;

    const components = extractPendingStructuredComponents(text);
    expect(components).toBeDefined();

    // Artifact purpose should be complete
    expect(components?.grist_artifact_purpose).toBeDefined();
    expect(components?.grist_artifact_purpose?.isComplete).toBe(true);
    expect(components?.grist_artifact_purpose?.content).toContain(
      "clean, modern interface"
    );

    // Full artifact should also be complete
    expect(components?.grist_artifact_full).toBeDefined();
    expect(components?.grist_artifact_full?.isComplete).toBe(true);
  });

  it("should return undefined for text with no artifacts", () => {
    const text = `This is just regular text with no artifacts.`;
    const components = extractPendingStructuredComponents(text);
    expect(components).toBeUndefined();
  });
});
