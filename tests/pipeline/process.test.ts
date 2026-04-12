import { describe, it, expect } from "vitest";
import { groupByThread } from "@/lib/pipeline/process";

interface TestEvent {
  channel_id: string;
  thread_id?: string | null;
  text: string;
  author: string;
  message_timestamp: string;
}

function makeEvent(
  channel_id: string,
  thread_id: string | null,
  text: string,
  author = "user",
  message_timestamp = "2024-01-01T00:00:00Z"
): TestEvent {
  return { channel_id, thread_id, text, author, message_timestamp };
}

describe("groupByThread", () => {
  it("groups events by thread_id with key format channelId:threadId", () => {
    const events = [
      makeEvent("C1", "T1", "message 1"),
      makeEvent("C1", "T1", "message 2"),
      makeEvent("C1", "T1", "message 3"),
    ];

    const groups = groupByThread(events);

    expect(Object.keys(groups)).toEqual(["C1:T1"]);
    expect(groups["C1:T1"]).toHaveLength(3);
  });

  it("groups non-threaded messages by channel with key format channelId:_", () => {
    const events = [
      makeEvent("C2", null, "msg a"),
      makeEvent("C2", null, "msg b"),
      makeEvent("C2", null, "msg c"),
    ];

    const groups = groupByThread(events);

    expect(Object.keys(groups)).toEqual(["C2:_"]);
    expect(groups["C2:_"]).toHaveLength(3);
  });

  it("groups undefined thread_id as channelId:_", () => {
    const events = [
      makeEvent("C3", undefined as unknown as null, "msg 1"),
      makeEvent("C3", undefined as unknown as null, "msg 2"),
      makeEvent("C3", undefined as unknown as null, "msg 3"),
    ];

    const groups = groupByThread(events);

    expect(groups["C3:_"]).toHaveLength(3);
  });

  it("separates events from different threads into different groups", () => {
    const events = [
      makeEvent("C1", "T1", "thread 1 msg 1"),
      makeEvent("C1", "T1", "thread 1 msg 2"),
      makeEvent("C1", "T1", "thread 1 msg 3"),
      makeEvent("C1", "T2", "thread 2 msg 1"),
      makeEvent("C1", "T2", "thread 2 msg 2"),
      makeEvent("C1", "T2", "thread 2 msg 3"),
    ];

    const groups = groupByThread(events);

    expect(groups["C1:T1"]).toHaveLength(3);
    expect(groups["C1:T2"]).toHaveLength(3);
  });

  it("filters out groups below minMessages threshold (minMessages=3)", () => {
    const events = [
      // Group with 3 messages — should pass
      makeEvent("C1", "T1", "msg 1"),
      makeEvent("C1", "T1", "msg 2"),
      makeEvent("C1", "T1", "msg 3"),
      // Group with 2 messages — should be filtered out
      makeEvent("C1", "T2", "msg 1"),
      makeEvent("C1", "T2", "msg 2"),
      // Group with 1 message — should be filtered out
      makeEvent("C2", null, "single msg"),
    ];

    const groups = groupByThread(events, 3);

    expect(Object.keys(groups)).toEqual(["C1:T1"]);
    expect(groups["C1:T1"]).toHaveLength(3);
    expect(groups["C1:T2"]).toBeUndefined();
    expect(groups["C2:_"]).toBeUndefined();
  });

  it("returns all groups when minMessages=1 (default)", () => {
    const events = [
      makeEvent("C1", "T1", "only msg"),
      makeEvent("C2", null, "solo"),
    ];

    const groups = groupByThread(events);

    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups["C1:T1"]).toHaveLength(1);
    expect(groups["C2:_"]).toHaveLength(1);
  });

  it("returns empty object when all groups are below threshold", () => {
    const events = [
      makeEvent("C1", "T1", "msg 1"),
      makeEvent("C1", "T1", "msg 2"),
    ];

    const groups = groupByThread(events, 3);

    expect(Object.keys(groups)).toHaveLength(0);
  });

  it("returns empty object for empty input", () => {
    const groups = groupByThread([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});
