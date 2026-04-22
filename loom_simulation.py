"""
=============================================================================
  DIGITAL TWIN SIMULATION — TEXTILE LOOM IoT DATA GENERATOR
  Based on: digital_twin_data_report.pdf specification
  Author  : Industrial IoT Simulation Engine v2.0
=============================================================================
"""

import json
import csv
import math
import random
import logging
import time
import os
import sys
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import requests

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("loom_sim")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — GLOBAL CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
class Config:
    # Time
    SIM_START        = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    SIM_DAYS         = 30
    SAMPLE_INTERVAL  = 10            # seconds between records

    # Machines
    MACHINE_IDS      = ["loom_01", "loom_02", "loom_03"]
    NUM_MACHINES     = len(MACHINE_IDS)

    # Normal operating ranges
    SPEED_MIN        = 80            # RPM
    SPEED_MAX        = 150           # RPM
    TEMP_MIN         = 25.0          # °C
    TEMP_MAX         = 45.0          # °C
    HUM_MIN          = 40.0          # %
    HUM_MAX          = 80.0          # %
    VIB_NORMAL_MIN   = 0.01          # g
    VIB_NORMAL_MAX   = 0.10          # g

    # Production
    SAREES_PER_DAY_MIN = 4
    SAREES_PER_DAY_MAX = 8

    # Failure rates  (per machine per week)
    FAULT_RATE_MIN   = 5
    FAULT_RATE_MAX   = 10

    # Edge-case probabilities (per record)
    P_SENSOR_NULL    = 0.0005        # ~0.05%
    P_SPIKE          = 0.0008        # ~0.08%
    P_FLATLINE       = 0.0003        # ~0.03% chance to enter flatline mode
    FLATLINE_MAXLEN  = 180           # ticks (30 min)
    P_DATA_DELAY     = 0.0010        # ~0.1%

    # Monsoon window (day of year)
    MONSOON_START_DAY = 5
    MONSOON_END_DAY   = 18

    # Wear coefficient  (vibration increase per day)
    WEAR_RATE        = 0.001         # g per day added to baseline vib

    # LLM
    OLLAMA_URL       = "http://localhost:11434"
    OLLAMA_MODEL     = "gemma4:e4b"
    LLM_ENABLED      = True          # set False if Ollama not running

    # Output
    OUT_JSON         = "/mnt/user-data/outputs/dataset.json"
    OUT_CSV          = "/mnt/user-data/outputs/dataset.csv"
    OUT_PLOTS_DIR    = "/mnt/user-data/outputs"

    # Derived
    SAMPLES_PER_DAY  = 86400 // SAMPLE_INTERVAL
    TOTAL_TICKS      = SAMPLES_PER_DAY * SIM_DAYS
    TOTAL_RECORDS    = TOTAL_TICKS * NUM_MACHINES

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — LLM CLIENT (Ollama)
# ─────────────────────────────────────────────────────────────────────────────
class LLMClient:
    """Thin wrapper around Ollama's REST API.  Falls back silently if unavailable."""

    def __init__(self, base_url: str, model: str, enabled: bool):
        self.base_url = base_url
        self.model    = model
        self.enabled  = enabled
        self._alive   = False
        if enabled:
            self._alive = self._ping()
            if self._alive:
                log.info(f"LLM connected → {base_url}  model={model}")
            else:
                log.warning("Ollama not reachable — rule-based fallback active")

    def _ping(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def generate(self, prompt: str, max_tokens: int = 300) -> str:
        """Return LLM text or empty string on failure."""
        if not self._alive:
            return ""
        try:
            r = requests.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt,
                      "stream": False, "options": {"num_predict": max_tokens}},
                timeout=30,
            )
            if r.status_code == 200:
                return r.json().get("response", "")
        except Exception as e:
            log.debug(f"LLM error: {e}")
        return ""

    def get_variation_pattern(self, context: str) -> List[float]:
        """Ask LLM for a JSON list of 10 multipliers [0.8..1.2]."""
        if not self._alive:
            return [1.0] * 10
        prompt = (
            f"You are an industrial IoT expert. Given this context: {context}\n"
            "Return ONLY a JSON array of exactly 10 floats between 0.80 and 1.20 "
            "that represent realistic multiplicative variation factors for sensor "
            "readings over 10 consecutive time steps. No explanation, only JSON."
        )
        raw = self.generate(prompt, max_tokens=80)
        try:
            # Extract first JSON array found
            start = raw.index("[")
            end   = raw.rindex("]") + 1
            factors = json.loads(raw[start:end])
            if isinstance(factors, list) and len(factors) >= 10:
                return [max(0.75, min(1.25, float(f))) for f in factors[:10]]
        except Exception:
            pass
        return [1.0] * 10

    def get_anomaly_sequence(self, fault_type: str) -> List[float]:
        """Ask LLM for a 20-step vibration anomaly build-up sequence."""
        if not self._alive:
            return list(np.linspace(0.1, 1.5, 20))
        prompt = (
            f"Industrial loom fault type: {fault_type}. "
            "Generate ONLY a JSON array of 20 floats showing vibration (g) "
            "rising from ~0.1 to ~1.5 in a realistic, non-linear pattern "
            "(plateaus, sudden jumps allowed). Values between 0.0 and 3.0. "
            "No explanation, only JSON array."
        )
        raw = self.generate(prompt, max_tokens=120)
        try:
            start = raw.index("[")
            end   = raw.rindex("]") + 1
            seq = json.loads(raw[start:end])
            if isinstance(seq, list) and len(seq) >= 10:
                return [max(0.0, min(3.0, float(v))) for v in seq[:20]]
        except Exception:
            pass
        # Fallback: non-linear ramp
        t = np.linspace(0, 1, 20)
        return list(0.1 + 1.4 * t**1.8 + np.random.normal(0, 0.05, 20))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — ENVIRONMENT MODEL (shared across machines)
# ─────────────────────────────────────────────────────────────────────────────
class EnvironmentModel:
    """Computes ambient temperature and humidity for a given timestamp."""

    def __init__(self, cfg: Config):
        self.cfg = cfg

    def ambient_temp(self, dt: datetime, day_num: int) -> float:
        """Day/night cycle + seasonal drift + monsoon cooling."""
        hour = dt.hour + dt.minute / 60.0
        # Day/night: peak ~14:00, trough ~04:00
        diurnal = 5.0 * math.sin(math.pi * (hour - 4) / 12.0)
        # Weekly: slightly hotter Mon–Wed (heavier workload)
        weekly  = 1.5 * math.sin(2 * math.pi * dt.weekday() / 7.0)
        # Gradual warming over sim window (simulated summer approach)
        trend   = 0.05 * day_num
        # Monsoon cooling
        monsoon = -3.0 if self.cfg.MONSOON_START_DAY <= day_num <= self.cfg.MONSOON_END_DAY else 0.0
        base    = (self.cfg.TEMP_MIN + self.cfg.TEMP_MAX) / 2.0
        return round(base + diurnal + weekly + trend + monsoon + random.gauss(0, 0.3), 2)

    def ambient_humidity(self, dt: datetime, day_num: int) -> float:
        """Night humidity peaks, monsoon spikes."""
        hour    = dt.hour + dt.minute / 60.0
        # Night humidity higher
        diurnal = -10.0 * math.sin(math.pi * (hour - 6) / 12.0)
        # Monsoon: very high humidity
        monsoon = 15.0 if self.cfg.MONSOON_START_DAY <= day_num <= self.cfg.MONSOON_END_DAY else 0.0
        # Mid-week workload raises humidity slightly
        weekly  = 3.0 * math.sin(2 * math.pi * (dt.weekday() + 1) / 7.0)
        base    = (self.cfg.HUM_MIN + self.cfg.HUM_MAX) / 2.0
        value   = base + diurnal + monsoon + weekly + random.gauss(0, 1.0)
        # Extremely high humidity during monsoon (edge case)
        if self.cfg.MONSOON_START_DAY <= day_num <= self.cfg.MONSOON_END_DAY:
            if random.random() < 0.005:
                value = random.uniform(90, 98)     # extreme spike
        return round(max(20.0, min(98.0, value)), 2)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — FAILURE SCHEDULER
# ─────────────────────────────────────────────────────────────────────────────
class FailureScheduler:
    """Pre-schedules failure windows for each machine across the sim."""

    FAULT_TYPES = ["thread_break", "overheat", "motor_slowdown", "high_vibration"]

    def __init__(self, cfg: Config, llm: LLMClient, rng: np.random.Generator):
        self.cfg  = cfg
        self.llm  = llm
        self.rng  = rng
        # Map: device_id -> list of (start_tick, end_tick, fault_type, anomaly_seq)
        self.schedule: Dict[str, List[Tuple]] = {m: [] for m in cfg.MACHINE_IDS}
        self._build()

    def _build(self):
        total_failures = 0
        for machine_id in self.cfg.MACHINE_IDS:
            tick = 0
            while tick < self.cfg.TOTAL_TICKS:
                # Weekly fault budget
                weekly_budget = random.randint(
                    self.cfg.FAULT_RATE_MIN, self.cfg.FAULT_RATE_MAX
                )
                ticks_in_week = self.cfg.SAMPLES_PER_DAY * 7
                # Distribute faults within this week
                fault_ticks = sorted(
                    self.rng.choice(
                        min(ticks_in_week, self.cfg.TOTAL_TICKS - tick),
                        size=min(weekly_budget, self.cfg.TOTAL_TICKS - tick),
                        replace=False,
                    )
                )
                for ft in fault_ticks:
                    abs_tick  = tick + int(ft)
                    fault_type = random.choice(self.FAULT_TYPES)
                    # Fault duration: 20–200 ticks (3.3 min – 33 min)
                    duration  = random.randint(20, 200)
                    # Ask LLM for anomaly sequence
                    anomaly_seq = self.llm.get_anomaly_sequence(fault_type)
                    self.schedule[machine_id].append(
                        (abs_tick, abs_tick + duration, fault_type, anomaly_seq)
                    )
                    total_failures += 1
                tick += ticks_in_week

        log.info(f"Scheduled {total_failures} failure events across {self.cfg.NUM_MACHINES} machines")

    def get_active_fault(self, machine_id: str, tick: int) -> Optional[Tuple]:
        """Return the first active fault at this tick, or None."""
        for entry in self.schedule[machine_id]:
            start, end, ftype, seq = entry
            if start <= tick < end:
                return entry
        return None


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — MACHINE STATE MACHINE
# ─────────────────────────────────────────────────────────────────────────────
class MachineState:
    """Tracks per-machine state across ticks."""

    def __init__(self, machine_id: str, cfg: Config, llm: LLMClient):
        self.machine_id   = machine_id
        self.cfg          = cfg
        self.llm          = llm

        # Running state
        self.status       = "ON"
        self.speed        = float(random.randint(cfg.SPEED_MIN, cfg.SPEED_MAX))
        self.saree_count  = 0
        self.cycles       = 0
        self.day_sarees   = 0         # sarees produced today
        self.last_saree_day = -1

        # Flatline state
        self.flatline_active  = False
        self.flatline_remaining = 0
        self.flatline_sensor  = None
        self.flatline_value   = None

        # LLM variation cache
        self._llm_factors: List[float] = [1.0] * 10
        self._llm_idx = 10            # force refresh on first use

        # Wear accumulator
        self.wear_vib = 0.0

        # Scheduled OFF windows (maintenance, shift end)
        # OFF for 2 hours each night (22:00–00:00) roughly
        self._off_hour_start = random.randint(21, 23)
        self._off_duration_h = random.uniform(1.5, 3.0)

    def is_shift_off(self, dt: datetime) -> bool:
        h = dt.hour + dt.minute / 60.0
        off_end = (self._off_hour_start + self._off_duration_h) % 24
        if self._off_hour_start < off_end:
            return self._off_hour_start <= h < off_end
        else:  # wraps midnight
            return h >= self._off_hour_start or h < off_end

    def get_llm_factor(self) -> float:
        if self._llm_idx >= len(self._llm_factors):
            ctx = (f"loom machine {self.machine_id}, speed {self.speed:.0f} RPM, "
                   f"wear {self.wear_vib:.3f}g added vibration")
            self._llm_factors = self.llm.get_variation_pattern(ctx)
            self._llm_idx = 0
        factor = self._llm_factors[self._llm_idx]
        self._llm_idx += 1
        return factor

    def update_sarees(self, dt: datetime):
        today = dt.toordinal()
        if today != self.last_saree_day:
            self.day_sarees = 0
            self.last_saree_day = today
        target = random.randint(self.cfg.SAREES_PER_DAY_MIN,
                                self.cfg.SAREES_PER_DAY_MAX)
        # Produce a saree roughly every (SAMPLES_PER_DAY // target) ticks
        interval = self.cfg.SAMPLES_PER_DAY // target
        if self.cycles % max(1, interval) == 0:
            self.saree_count += 1
            self.day_sarees  += 1


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — SIMULATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class SimulationEngine:
    """Core tick loop that generates one record per machine per timestamp."""

    def __init__(self, cfg: Config, llm: LLMClient, rng: np.random.Generator):
        self.cfg  = cfg
        self.llm  = llm
        self.rng  = rng
        self.env  = EnvironmentModel(cfg)
        self.scheduler = FailureScheduler(cfg, llm, rng)
        self.machines  = {
            mid: MachineState(mid, cfg, llm) for mid in cfg.MACHINE_IDS
        }

        # Stats
        self.stats = {
            "total_records"   : 0,
            "fault_records"   : {ft: 0 for ft in FailureScheduler.FAULT_TYPES},
            "sensor_nulls"    : 0,
            "spikes"          : 0,
            "flatlines"       : 0,
            "machine_off"     : 0,
            "missing_ts"      : 0,
            "monsoon_extremes": 0,
        }

    # ─── helpers ────────────────────────────────────────────────────────────

    def _clamp(self, v, lo, hi):
        return max(lo, min(hi, v))

    def _anomaly_score(self, vib: float, temp: float, speed_dev: float) -> float:
        """Composite anomaly score [0..1]."""
        vib_score   = self._clamp((vib - 0.1) / 1.4, 0, 1)
        temp_score  = self._clamp((temp - 45) / 15.0, 0, 1)
        speed_score = self._clamp(abs(speed_dev) / 50.0, 0, 1)
        return round(0.5 * vib_score + 0.3 * temp_score + 0.2 * speed_score, 4)

    # ─── per-tick record builder ─────────────────────────────────────────────

    def _build_record(self, tick: int, dt: datetime, day_num: int,
                      ms: MachineState) -> Dict[str, Any]:

        cfg = self.cfg
        rec: Dict[str, Any] = {
            "device_id" : ms.machine_id,
            "timestamp" : dt.isoformat(),
            "machine"   : {},
            "environment": {},
            "fault"     : {},
        }

        # ── timestamp jitter (data delay edge case) ──
        if random.random() < cfg.P_DATA_DELAY:
            delay = timedelta(seconds=random.randint(10, 300))
            rec["timestamp"] = (dt + delay).isoformat()
            self.stats["missing_ts"] += 1

        # ── shift ON/OFF ──
        is_off = ms.is_shift_off(dt)
        if is_off:
            ms.status = "OFF"
            self.stats["machine_off"] += 1
        else:
            ms.status = "ON"
            ms.cycles += 1

        # ── ambient environment ──
        amb_temp = self.env.ambient_temp(dt, day_num)
        amb_hum  = self.env.ambient_humidity(dt, day_num)

        # ── active fault lookup ──
        fault_entry = self.scheduler.get_active_fault(ms.machine_id, tick)
        fault_type  = fault_entry[2] if fault_entry else None
        fault_seq   = fault_entry[3] if fault_entry else None
        fault_prog  = 0.0  # progress 0→1 within fault window

        if fault_entry:
            start, end = fault_entry[0], fault_entry[1]
            fault_prog = (tick - start) / max(1, end - start)
            self.stats["fault_records"][fault_type] = \
                self.stats["fault_records"].get(fault_type, 0) + 1

        # ── wear (vibration baseline increases over time) ──
        ms.wear_vib = (day_num / cfg.SIM_DAYS) * 0.08  # up to +0.08 g over 30 days

        # ── base values with LLM variation factor ──
        llm_f = ms.get_llm_factor()

        if ms.status == "OFF":
            speed       = 0
            temperature = round(self._clamp(amb_temp + 1.0, 20, 55), 2)
            humidity    = round(self._clamp(amb_hum + random.gauss(0, 0.5), 20, 98), 2)
            vibration   = round(random.uniform(0.0, 0.02), 4)
        else:
            # Speed fluctuates ±10%
            target_speed = (cfg.SPEED_MIN + cfg.SPEED_MAX) / 2.0
            ms.speed     = self._clamp(
                ms.speed + random.gauss(0, 2) * llm_f, cfg.SPEED_MIN, cfg.SPEED_MAX
            )
            speed        = int(ms.speed)

            # Temperature: ambient + runtime heat + fault contribution
            heat_gen     = 0.006 * speed   # friction
            fault_heat   = 12.0 * fault_prog if fault_type == "overheat" else 0.0
            temperature  = round(
                self._clamp(amb_temp + heat_gen + fault_heat + random.gauss(0, 0.4), 18, 85),
                2,
            )

            # Humidity
            humidity = round(self._clamp(amb_hum + random.gauss(0, 0.8) * llm_f, 20, 98), 2)

            # Vibration: baseline + wear + fault build-up
            vib_base = random.uniform(cfg.VIB_NORMAL_MIN, cfg.VIB_NORMAL_MAX)
            if fault_type == "high_vibration" and fault_seq:
                seq_idx  = int(fault_prog * (len(fault_seq) - 1))
                vib_fault = fault_seq[seq_idx]
            elif fault_type in ("motor_slowdown", "overheat") and fault_seq:
                seq_idx  = int(fault_prog * (len(fault_seq) - 1))
                vib_fault = fault_seq[seq_idx] * 0.6
            else:
                vib_fault = 0.0
            vibration = round(
                self._clamp(vib_base + ms.wear_vib + vib_fault + random.gauss(0, 0.005), 0.0, 3.5),
                4,
            )

            # Motor slowdown
            if fault_type == "motor_slowdown":
                drop = int(fault_prog * 40)
                speed = max(30, speed - drop)
                ms.speed = float(speed)

        # ── saree production ──
        if ms.status == "ON":
            ms.update_sarees(dt)

        # ── fault flags ──
        thread_break  = fault_type == "thread_break" and fault_prog > 0.1
        overheat      = fault_type == "overheat" and temperature > 55
        motor_fault   = fault_type == "motor_slowdown" and fault_prog > 0.3
        anomaly_score = self._anomaly_score(
            vibration, temperature,
            speed - (cfg.SPEED_MIN + cfg.SPEED_MAX) / 2.0,
        )

        # ── flatline edge case ──
        if ms.flatline_active:
            ms.flatline_remaining -= 1
            if ms.flatline_remaining <= 0:
                ms.flatline_active = False
            else:
                if ms.flatline_sensor == "temperature":
                    temperature = ms.flatline_value
                elif ms.flatline_sensor == "vibration":
                    vibration   = ms.flatline_value
                elif ms.flatline_sensor == "humidity":
                    humidity    = ms.flatline_value
                self.stats["flatlines"] += 1
        else:
            if random.random() < cfg.P_FLATLINE and ms.status == "ON":
                ms.flatline_active    = True
                ms.flatline_remaining = random.randint(30, cfg.FLATLINE_MAXLEN)
                ms.flatline_sensor    = random.choice(["temperature", "vibration", "humidity"])
                ms.flatline_value     = {"temperature": temperature,
                                          "vibration"  : vibration,
                                          "humidity"   : humidity}[ms.flatline_sensor]

        # ── sensor failure (null) ──
        if random.random() < cfg.P_SENSOR_NULL and ms.status == "ON":
            null_field = random.choice(["temperature", "vibration", "humidity", "speed"])
            if   null_field == "temperature": temperature = None
            elif null_field == "vibration"  : vibration   = None
            elif null_field == "humidity"   : humidity    = None
            elif null_field == "speed"      : speed       = None
            self.stats["sensor_nulls"] += 1

        # ── spike edge case ──
        if random.random() < cfg.P_SPIKE and ms.status == "ON":
            spike_field = random.choice(["temperature", "speed", "vibration"])
            if   spike_field == "temperature" and temperature is not None:
                temperature = round(temperature + random.uniform(20, 35), 2)
            elif spike_field == "speed"        and speed       is not None:
                speed       = int(speed + random.randint(50, 120))
            elif spike_field == "vibration"    and vibration   is not None:
                vibration   = round(vibration + random.uniform(1.0, 2.5), 4)
            self.stats["spikes"] += 1

        # ── monsoon extreme tracker ──
        if humidity is not None and humidity > 89:
            self.stats["monsoon_extremes"] += 1

        # ── assemble record ──
        rec["machine"] = {
            "status"     : ms.status,
            "speed"      : speed,
            "cycles"     : ms.cycles,
            "saree_count": ms.saree_count,
        }
        rec["environment"] = {
            "temperature": temperature,
            "humidity"   : humidity,
            "vibration"  : vibration,
        }
        rec["fault"] = {
            "thread_break"  : bool(thread_break),
            "overheat"      : bool(overheat),
            "motor_fault"   : bool(motor_fault),
            "anomaly_score" : float(anomaly_score) if anomaly_score is not None else 0.0,
        }

        self.stats["total_records"] += 1
        return rec

    # ─── main generator ──────────────────────────────────────────────────────

    def generate(self):
        """Yield records one by one."""
        log.info(f"Starting simulation: {self.cfg.TOTAL_RECORDS:,} records "
                 f"({self.cfg.TOTAL_TICKS:,} ticks × {self.cfg.NUM_MACHINES} machines)")
        start = self.cfg.SIM_START
        interval = timedelta(seconds=self.cfg.SAMPLE_INTERVAL)

        for tick in range(self.cfg.TOTAL_TICKS):
            dt      = start + interval * tick
            day_num = tick // self.cfg.SAMPLES_PER_DAY

            for mid in self.cfg.MACHINE_IDS:
                ms = self.machines[mid]
                yield self._build_record(tick, dt, day_num, ms)

            # Progress log every 5 simulated days
            if tick % (self.cfg.SAMPLES_PER_DAY * 5) == 0 and tick > 0:
                days_done = tick // self.cfg.SAMPLES_PER_DAY
                log.info(f"  Progress: day {days_done}/{self.cfg.SIM_DAYS} "
                         f"({self.stats['total_records']:,} records)")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — EXPORT MODULE
# ─────────────────────────────────────────────────────────────────────────────
class Exporter:
    """Writes JSON and CSV outputs with progress reporting."""

    JSON_BATCH = 10_000   # records per flush

    def __init__(self, cfg: Config):
        self.cfg = cfg
        os.makedirs(cfg.OUT_PLOTS_DIR, exist_ok=True)

    def export(self, engine: SimulationEngine):
        log.info(f"Output → {self.cfg.OUT_JSON}")
        log.info(f"Output → {self.cfg.OUT_CSV}")

        # CSV field order
        csv_fields = [
            "device_id", "timestamp",
            "machine.status", "machine.speed", "machine.cycles", "machine.saree_count",
            "environment.temperature", "environment.humidity", "environment.vibration",
            "fault.thread_break", "fault.overheat", "fault.motor_fault", "fault.anomaly_score",
        ]

        def flatten(rec: Dict) -> Dict:
            return {
                "device_id"               : rec["device_id"],
                "timestamp"               : rec["timestamp"],
                "machine.status"          : rec["machine"]["status"],
                "machine.speed"           : rec["machine"]["speed"],
                "machine.cycles"          : rec["machine"]["cycles"],
                "machine.saree_count"     : rec["machine"]["saree_count"],
                "environment.temperature" : rec["environment"]["temperature"],
                "environment.humidity"    : rec["environment"]["humidity"],
                "environment.vibration"   : rec["environment"]["vibration"],
                "fault.thread_break"      : rec["fault"]["thread_break"],
                "fault.overheat"          : rec["fault"]["overheat"],
                "fault.motor_fault"       : rec["fault"]["motor_fault"],
                "fault.anomaly_score"     : rec["fault"]["anomaly_score"],
            }

        json_batch: List[Dict] = []
        written = 0

        with open(self.cfg.OUT_JSON, "w", encoding="utf-8") as jf, \
             open(self.cfg.OUT_CSV,  "w", newline="", encoding="utf-8") as cf:

            jf.write("[\n")
            writer = csv.DictWriter(cf, fieldnames=csv_fields)
            writer.writeheader()

            first = True
            for rec in engine.generate():
                # JSON
                json_batch.append(rec)
                if len(json_batch) >= self.JSON_BATCH:
                    for r in json_batch:
                        if not first:
                            jf.write(",\n")
                        jf.write(json.dumps(r))
                        first = False
                    json_batch.clear()

                # CSV
                writer.writerow(flatten(rec))
                written += 1

            # Flush remaining JSON batch
            for r in json_batch:
                if not first:
                    jf.write(",\n")
                jf.write(json.dumps(r))
                first = False

            jf.write("\n]\n")

        log.info(f"Export complete: {written:,} records written")
        return written


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — PLOTTING MODULE
# ─────────────────────────────────────────────────────────────────────────────
def generate_plots(cfg: Config):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
    except ImportError:
        log.warning("matplotlib not available — skipping plots")
        return

    log.info("Loading CSV for plots …")
    try:
        df = pd.read_csv(cfg.OUT_CSV, parse_dates=["timestamp"])
    except Exception as e:
        log.warning(f"Could not load CSV for plots: {e}")
        return

    df = df[df["machine.status"] == "ON"].copy()
    df.sort_values("timestamp", inplace=True)

    # ── Plot 1: Temperature vs Time (loom_01) ──────────────────────────────
    fig, axes = plt.subplots(3, 1, figsize=(16, 12), sharex=True)
    fig.suptitle("Loom Digital Twin — Sensor Trends (30 Days)", fontsize=14, fontweight="bold")

    for i, mid in enumerate(cfg.MACHINE_IDS):
        sub = df[df["device_id"] == mid].resample("1h", on="timestamp").mean(numeric_only=True)
        ax  = axes[i]
        ax.plot(sub.index, sub["environment.temperature"], color="#E74C3C",
                linewidth=0.8, label="Temperature °C", alpha=0.85)
        ax.set_ylabel(f"{mid}\nTemp (°C)", fontsize=9)
        ax.grid(True, alpha=0.3)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=5))

    fig.autofmt_xdate(rotation=30)
    plt.tight_layout()
    p1 = os.path.join(cfg.OUT_PLOTS_DIR, "plot_temperature_vs_time.png")
    plt.savefig(p1, dpi=120, bbox_inches="tight")
    plt.close()
    log.info(f"Plot saved: {p1}")

    # ── Plot 2: Vibration vs Anomaly Score with fault markers ──────────────
    fig, axes = plt.subplots(3, 1, figsize=(16, 12), sharex=True)
    fig.suptitle("Vibration & Anomaly Score — Fault Injection Visible", fontsize=14, fontweight="bold")

    for i, mid in enumerate(cfg.MACHINE_IDS):
        sub = df[df["device_id"] == mid].copy()
        # Downsample for plot clarity
        sub_h = sub.resample("30min", on="timestamp").agg({
            "environment.vibration" : "mean",
            "fault.anomaly_score"   : "mean",
            "fault.overheat"        : "max",
            "fault.motor_fault"     : "max",
            "fault.thread_break"    : "max",
        })
        ax   = axes[i]
        ax.plot(sub_h.index, sub_h["environment.vibration"],
                color="#3498DB", linewidth=0.8, label="Vibration (g)", alpha=0.85)
        ax.fill_between(sub_h.index, sub_h["fault.anomaly_score"] * 0.5,
                        alpha=0.25, color="#F39C12", label="Anomaly score")

        # Mark anomaly points
        anomalies = sub_h[sub_h["fault.anomaly_score"] > 0.3]
        ax.scatter(anomalies.index, anomalies["environment.vibration"],
                   color="#E74C3C", s=12, zorder=5, label="Anomaly (score>0.3)")

        ax.set_ylabel(f"{mid}\nVib (g)", fontsize=9)
        ax.legend(fontsize=7, loc="upper left")
        ax.grid(True, alpha=0.3)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=5))

    fig.autofmt_xdate(rotation=30)
    plt.tight_layout()
    p2 = os.path.join(cfg.OUT_PLOTS_DIR, "plot_vibration_vs_anomalies.png")
    plt.savefig(p2, dpi=120, bbox_inches="tight")
    plt.close()
    log.info(f"Plot saved: {p2}")

    # ── Plot 3: Humidity (day/night + monsoon visible) ─────────────────────
    fig, ax = plt.subplots(figsize=(16, 5))
    loom1 = df[df["device_id"] == "loom_01"].resample("1h", on="timestamp").mean(numeric_only=True)
    ax.plot(loom1.index, loom1["environment.humidity"],
            color="#27AE60", linewidth=0.8, label="Humidity % (loom_01)")
    # Shade monsoon
    mon_start = cfg.SIM_START + timedelta(days=cfg.MONSOON_START_DAY)
    mon_end   = cfg.SIM_START + timedelta(days=cfg.MONSOON_END_DAY)
    ax.axvspan(mon_start, mon_end, alpha=0.15, color="#2980B9", label="Monsoon window")
    ax.set_ylabel("Humidity (%)")
    ax.set_title("Humidity Over Time — Monsoon Period Highlighted")
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    fig.autofmt_xdate(rotation=30)
    plt.tight_layout()
    p3 = os.path.join(cfg.OUT_PLOTS_DIR, "plot_humidity_monsoon.png")
    plt.savefig(p3, dpi=120, bbox_inches="tight")
    plt.close()
    log.info(f"Plot saved: {p3}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — SUMMARY LOGGER
# ─────────────────────────────────────────────────────────────────────────────
def print_summary(engine: SimulationEngine, cfg: Config, t0: float):
    s = engine.stats
    elapsed = time.time() - t0
    total   = s["total_records"]

    log.info("=" * 62)
    log.info("  SIMULATION SUMMARY")
    log.info("=" * 62)
    log.info(f"  Total records generated   : {total:>12,}")
    log.info(f"  Machines                  : {cfg.NUM_MACHINES}")
    log.info(f"  Simulation days           : {cfg.SIM_DAYS}")
    log.info(f"  Sample interval           : {cfg.SAMPLE_INTERVAL}s")
    log.info(f"  Elapsed time              : {elapsed:.1f}s")
    log.info("")
    log.info("  FAULT DISTRIBUTION")
    for ft, cnt in s["fault_records"].items():
        pct = 100 * cnt / max(1, total)
        log.info(f"    {ft:<22}: {cnt:>8,}  ({pct:.2f}%)")
    log.info("")
    log.info("  EDGE CASES")
    log.info(f"    Sensor nulls             : {s['sensor_nulls']:>8,}")
    log.info(f"    Spike outliers           : {s['spikes']:>8,}")
    log.info(f"    Flatline ticks           : {s['flatlines']:>8,}")
    log.info(f"    Machine OFF ticks        : {s['machine_off']:>8,}")
    log.info(f"    Delayed timestamps       : {s['missing_ts']:>8,}")
    log.info(f"    Monsoon humidity extremes: {s['monsoon_extremes']:>8,}")
    log.info("=" * 62)

    # Pandas summary from CSV (sample)
    try:
        df = pd.read_csv(cfg.OUT_CSV)
        log.info("\n  NUMERIC COLUMN STATS (sample):")
        for col in ["environment.temperature", "environment.humidity",
                    "environment.vibration", "machine.speed", "fault.anomaly_score"]:
            if col in df.columns:
                vals = df[col].dropna()
                log.info(
                    f"    {col:<30} mean={vals.mean():.3f}  "
                    f"std={vals.std():.3f}  "
                    f"min={vals.min():.3f}  max={vals.max():.3f}"
                )
    except Exception as e:
        log.warning(f"Could not compute stats: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
def main():
    t0  = time.time()
    rng = np.random.default_rng(seed=42)

    cfg = Config()

    log.info("=" * 62)
    log.info("  TEXTILE LOOM DIGITAL TWIN — IoT DATA SIMULATOR")
    log.info("=" * 62)
    log.info(f"  Machines    : {cfg.MACHINE_IDS}")
    log.info(f"  Days        : {cfg.SIM_DAYS}")
    log.info(f"  Interval    : {cfg.SAMPLE_INTERVAL}s")
    log.info(f"  Total ticks : {cfg.TOTAL_TICKS:,}")
    log.info(f"  Total records: {cfg.TOTAL_RECORDS:,}")
    log.info(f"  LLM enabled : {cfg.LLM_ENABLED}")
    log.info("")

    llm    = LLMClient(cfg.OLLAMA_URL, cfg.OLLAMA_MODEL, cfg.LLM_ENABLED)
    engine = SimulationEngine(cfg, llm, rng)
    exp    = Exporter(cfg)

    written = exp.export(engine)

    print_summary(engine, cfg, t0)

    log.info("Generating plots …")
    generate_plots(cfg)

    log.info(f"\nAll done! Files written to {cfg.OUT_PLOTS_DIR}")
    log.info(f"  dataset.json  — {cfg.OUT_JSON}")
    log.info(f"  dataset.csv   — {cfg.OUT_CSV}")


if __name__ == "__main__":
    main()
