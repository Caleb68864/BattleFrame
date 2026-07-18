export interface RulesetCompatibility {
  minimum: string;
  verified: string;
}

export interface RulesetDefinition {
  id: string;
  title: string;
  version: string;
  battleframeCompatibility: RulesetCompatibility;
  primary: boolean;
}

export interface RegisterSuccess {
  ok: true;
}

export interface RegisterFailure {
  ok: false;
  errors: string[];
}

export type RegisterResult = RegisterSuccess | RegisterFailure;

export interface ActivateSuccess {
  ok: true;
}

export interface ActivateFailure {
  ok: false;
  errors: string[];
}

export type ActivateResult = ActivateSuccess | ActivateFailure;
