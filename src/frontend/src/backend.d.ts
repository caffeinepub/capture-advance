import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Signal {
    id: bigint;
    rsi: number;
    direction: Direction;
    timeframe: Timeframe;
    ema9: number;
    ema21: number;
    confidenceScore: bigint;
    timestamp: bigint;
    candlePattern: string;
    outcome?: SignalOutcome;
}
export interface Settings {
    signalSensitivity: Sensitivity;
    selectedTimeframe: Timeframe;
}
export enum Direction {
    buy = "buy",
    sell = "sell"
}
export enum Sensitivity {
    conservative = "conservative",
    aggressive = "aggressive",
    normal = "normal"
}
export enum SignalOutcome {
    win = "win",
    loss = "loss"
}
export enum Timeframe {
    d1 = "d1",
    h1 = "h1",
    m1 = "m1",
    m5 = "m5",
    w1 = "w1",
    m15 = "m15"
}
export interface backendInterface {
    getAllSignals(): Promise<Array<Signal>>;
    getLastSignals(limit: bigint): Promise<Array<Signal>>;
    getSettings(): Promise<Settings | null>;
    getSignalById(signalId: bigint): Promise<Signal | null>;
    getSignalsByTimeframe(timeframe: Timeframe): Promise<Array<Signal>>;
    saveSignal(direction: Direction, timeframe: Timeframe, confidenceScore: bigint, ema9: number, ema21: number, rsi: number, candlePattern: string): Promise<void>;
    saveSignalOutcome(signalId: bigint, outcome: SignalOutcome): Promise<void>;
    updateSettings(selectedTimeframe: Timeframe, signalSensitivity: Sensitivity): Promise<void>;
}
