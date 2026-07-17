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
  await ChatMessage.create({ content, flavor: data.flavor });
}
