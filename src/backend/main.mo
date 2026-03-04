import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import List "mo:core/List";

actor {
  // Types
  type Direction = { #buy; #sell };
  type Timeframe = { #m1; #m5; #m15; #h1; #d1; #w1 };
  type Sensitivity = { #conservative; #normal; #aggressive };
  type SignalOutcome = { #win; #loss };

  // Settings definition and comparison
  type Settings = {
    selectedTimeframe : Timeframe;
    signalSensitivity : Sensitivity;
  };

  module Settings {
    public func compare(settings1 : Settings, settings2 : Settings) : Order.Order {
      Timeframe.compare(settings1.selectedTimeframe, settings2.selectedTimeframe);
    };
  };

  module Timeframe {
    public func compare(timeframe1 : Timeframe, timeframe2 : Timeframe) : Order.Order {
      switch (timeframe1, timeframe2) {
        case (#m1, #m1) { #equal };
        case (#m1, _) { #less };
        case (_, #m1) { #greater };
        case (#m5, #m5) { #equal };
        case (#m5, _) { #less };
        case (_, #m5) { #greater };
        case (#m15, #m15) { #equal };
        case (#m15, _) { #less };
        case (_, #m15) { #greater };
        case (#h1, #h1) { #equal };
        case (#h1, _) { #less };
        case (_, #h1) { #greater };
        case (#d1, #d1) { #equal };
        case (#d1, _) { #less };
        case (_, #d1) { #greater };
        case (#w1, #w1) { #equal };
      };
    };
  };

  // Signal record definition and comparison
  type Signal = {
    id : Nat;
    timestamp : Int;
    direction : Direction;
    timeframe : Timeframe;
    confidenceScore : Nat;
    ema9 : Float;
    ema21 : Float;
    rsi : Float;
    candlePattern : Text;
    outcome : ?SignalOutcome;
  };

  module Signal {
    public func compare(signal1 : Signal, signal2 : Signal) : Order.Order {
      Nat.compare(signal1.id, signal2.id);
    };

    public func compareByConfidence(signal1 : Signal, signal2 : Signal) : Order.Order {
      Nat.compare(signal1.confidenceScore, signal2.confidenceScore);
    };
  };

  // Storage
  let signals = Map.empty<Nat, Signal>();
  var signalIdCounter = 0;

  var userSettings : ?Settings = null;

  // Public functions

  // Saving a new signal (all transient computation must be on the frontend)
  public shared ({ caller }) func saveSignal(
    direction : Direction,
    timeframe : Timeframe,
    confidenceScore : Nat,
    ema9 : Float,
    ema21 : Float,
    rsi : Float,
    candlePattern : Text
  ) : async () {
    if (confidenceScore > 100) { Runtime.trap("Confidence score must be between 0 and 100") };

    let newSignal : Signal = {
      id = signalIdCounter;
      timestamp = Time.now();
      direction;
      timeframe;
      confidenceScore;
      ema9;
      ema21;
      rsi;
      candlePattern;
      outcome = null;
    };

    signals.add(signalIdCounter, newSignal);
    signalIdCounter += 1;
  };

  // Saving outcome for a signal
  public shared ({ caller }) func saveSignalOutcome(signalId : Nat, outcome : SignalOutcome) : async () {
    switch (signals.get(signalId)) {
      case (?signal) {
        let updatedSignal = { signal with outcome = ?outcome };
        signals.add(signalId, updatedSignal);
      };
      case (null) { Runtime.trap("Signal not found") };
    };
  };

  // Update settings
  public shared ({ caller }) func updateSettings(selectedTimeframe : Timeframe, signalSensitivity : Sensitivity) : async () {
    let newSettings : Settings = {
      selectedTimeframe;
      signalSensitivity;
    };
    userSettings := ?newSettings;
  };

  // Get last N signals using limit on signals
  public query ({ caller }) func getLastSignals(limit : Nat) : async [Signal] {
    let allSignals = signals.values().toArray().sort(); // Sorted by ID
    let len = allSignals.size();

    if (len <= limit) {
      allSignals;
    } else if (limit <= 0) {
      [];
    } else {
      let start = if (len > limit) { len - limit } else { 0 };
      let resultArray = Array.tabulate(limit, func(i) { allSignals[i + start] });
      resultArray;
    };
  };

  // Get user settings
  public query ({ caller }) func getSettings() : async ?Settings {
    userSettings;
  };

  // Get signal by ID
  public query ({ caller }) func getSignalById(signalId : Nat) : async ?Signal {
    signals.get(signalId);
  };

  // Get all signals (should only be used for debugging and testing)
  public query ({ caller }) func getAllSignals() : async [Signal] {
    signals.values().toArray().sort();
  };

  // Get signals by timeframe
  public query ({ caller }) func getSignalsByTimeframe(timeframe : Timeframe) : async [Signal] {
    signals.values().toArray().sort().filter(
      func(signal) {
        signal.timeframe == timeframe;
      }
    );
  };
};
