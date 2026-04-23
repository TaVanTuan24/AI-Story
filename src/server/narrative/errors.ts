export class NarrativeEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NarrativeEngineError";
  }
}

export class InvalidActionError extends NarrativeEngineError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidActionError";
  }
}

export class ContradictoryStateUpdateError extends NarrativeEngineError {
  constructor(message: string) {
    super(message);
    this.name = "ContradictoryStateUpdateError";
  }
}
