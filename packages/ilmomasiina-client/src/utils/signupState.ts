export enum SignupState {
  disabled = "disabled",
  /** The event has a signup, but its dates are not known yet. */
  coming = "coming",
  not_opened = "not_opened",
  open = "open",
  closed = "closed",
}

export type SignupStateInfo =
  | { state: SignupState.disabled }
  | { state: SignupState.coming }
  | { state: SignupState.not_opened; opens: Date }
  | { state: SignupState.open; closes: Date }
  | { state: SignupState.closed; closed: Date };

export function signupState(starts: string | null, closes: string | null, coming = false): SignupStateInfo {
  if (starts === null || closes === null) {
    return { state: coming ? SignupState.coming : SignupState.disabled };
  }

  const signupOpens = new Date(starts);
  const signupCloses = new Date(closes);
  const now = new Date();

  if (now < signupOpens) {
    return { state: SignupState.not_opened, opens: signupOpens };
  }

  if (now < signupCloses) {
    return { state: SignupState.open, closes: signupCloses };
  }

  return { state: SignupState.closed, closed: signupCloses };
}
