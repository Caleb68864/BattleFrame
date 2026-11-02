import { SYSTEM_ID } from "../constants";

declare global {
  class ChatMessage {
    static create(data: Record<string, unknown>): Promise<ChatMessage>;
    static getSpeaker(options?: Record<string, unknown>): Record<string, unknown>;
  }
}

/** The part of an evaluated Foundry `Roll` that posts itself to chat. */
export interface PostableRoll {
  toMessage(messageData?: Record<string, unknown>): Promise<unknown>;
}

export interface RollChatData {
  roll: PostableRoll;
  rulesetId?: string;
  flavor?: string;
}

/**
 * Posts an evaluated Roll with Foundry's own `Roll#toMessage`.
 *
 * This replaces a bespoke `formula / total / flavor` card. Foundry renders the
 * message from the Roll, which gives the native expandable per-die breakdown,
 * honours the roller's roll mode, and carries the Roll on the message's `rolls`
 * so Dice So Nice has something to animate. The ruleset id stays on a flag, since
 * it no longer has a card to live on.
 */
export async function postRollToChat(data: RollChatData): Promise<void> {
  if (typeof ChatMessage === "undefined") {
    return;
  }

  await data.roll.toMessage({
    speaker: ChatMessage.getSpeaker?.(),
    flags: { [SYSTEM_ID]: { rulesetId: data.rulesetId ?? SYSTEM_ID } },
    ...(data.flavor === undefined ? {} : { flavor: data.flavor }),
  });
}
