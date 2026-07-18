import { SYSTEM_ID } from "../constants";

export const ROLL_CHAT_TEMPLATE = `
<div class="battleframe-roll-card" data-ruleset-id="{{rulesetId}}">
  <span class="battleframe-roll-card__formula">{{formula}}</span>
  <span class="battleframe-roll-card__total">{{total}}</span>
  <span class="battleframe-roll-card__flavor">{{flavor}}</span>
</div>
`.trim();

declare global {
  const Handlebars: {
    compile(template: string): (data: Record<string, unknown>) => string;
  };

  class ChatMessage {
    static create(data: Record<string, unknown>): Promise<ChatMessage>;
  }
}

export interface RollChatCardData {
  formula: string;
  total: number;
  rulesetId?: string;
  flavor?: string;
  /**
   * The evaluated Roll itself, attached to the message as `rolls`.
   *
   * Not decoration, and not for the template -- `renderRollChatCard` never
   * reads it. Foundry needs the Roll *object* on the message to know the
   * message rolled dice: it is what drives the breakdown tooltip, what roll
   * modes gate on, and what Dice So Nice hooks to animate. The design's dice
   * service is thin precisely so that comes free (design line 134, "Thin
   * *because* thin = Dice So Nice works free") -- but free only if the Roll
   * travels with the message. Rendering `formula`/`total` into `content` and
   * posting that alone yields a card that reads correctly and animates
   * nothing, with no error anywhere.
   *
   * The field name is DOC-CONFIRMED: Foundry's official v10 migration article
   * states the ChatMessage `rolls` field became "an array of Roll objects
   * instead of a single roll" and deprecated the singular `roll` -- and that
   * shape carries through v14. So `rolls: [roll]` is the correct create-data
   * key, and `dice.test.ts` pins it against an accidental rename to `roll`.
   * What remains genuinely live-only is whether Dice So Nice (a third-party
   * module) then animates off it -- confirm that under the existing "Dice So
   * Nice animates Battleframe rolls" HUMAN REVIEW item, since these tests mock
   * ChatMessage and cannot exercise a real module. The original silent-failure
   * warning stood only while the field name itself was unverified; it no longer
   * is.
   */
  roll?: unknown;
}

export function renderRollChatCard(data: RollChatCardData): string {
  const template = Handlebars.compile(ROLL_CHAT_TEMPLATE);

  return template({
    formula: data.formula,
    total: data.total,
    rulesetId: data.rulesetId ?? SYSTEM_ID,
    flavor: data.flavor ?? "",
  });
}

export async function postRollToChat(data: RollChatCardData): Promise<void> {
  if (typeof ChatMessage === "undefined") {
    return;
  }

  const content = renderRollChatCard(data);

  await ChatMessage.create({
    content,
    flavor: data.flavor,
    ...(data.roll === undefined ? {} : { rolls: [data.roll] }),
  });
}
