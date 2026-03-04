import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Direction,
  Sensitivity,
  type Settings,
  type Signal,
  SignalOutcome,
  Timeframe,
} from "../backend.d";
import { useActor } from "./useActor";

export type { Signal, Settings };
export { Direction, Timeframe, Sensitivity, SignalOutcome };

export function useGetLastSignals(limit = 5) {
  const { actor, isFetching } = useActor();
  return useQuery<Signal[]>({
    queryKey: ["signals", "last", limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLastSignals(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<Settings | null>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveSignal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      direction: Direction;
      timeframe: Timeframe;
      confidenceScore: number;
      ema9: number;
      ema21: number;
      rsi: number;
      candlePattern: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveSignal(
        params.direction,
        params.timeframe,
        BigInt(Math.round(params.confidenceScore)),
        params.ema9,
        params.ema21,
        params.rsi,
        params.candlePattern,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useSaveOutcome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      signalId: bigint;
      outcome: SignalOutcome;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveSignalOutcome(params.signalId, params.outcome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      selectedTimeframe: Timeframe;
      signalSensitivity: Sensitivity;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateSettings(
        params.selectedTimeframe,
        params.signalSensitivity,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
