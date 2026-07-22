export interface RentMaikarPlugin {
  id: string;
  name: string;
  enabled: boolean;
  initialize(): Promise<void>;
  deactivate(): Promise<void>;
  processEvent(event: { type: string; payload: unknown } & Record<string, unknown>): Promise<void>;
}
