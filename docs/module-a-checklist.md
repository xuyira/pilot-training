# Module A Development Checklist

## Scope

Build Module A as an immersive single-block web task for sustained monitoring and response control.

Confirmed constraints:

- Single response key: `Space`
- Single active event window at any moment
- Eight fixed instruments visible at all times
- Dynamic changes only occur in the lamp area at the top-left of each instrument
- One block runs continuously for `N` minutes
- Adaptive difficulty runs inside the block using fixed windows

## Decisions

- Visual style: realistic cockpit layout with simplified drawing
- Event types:
  - `target_alarm`: double red lamps, requires response
  - `pseudo_alarm`: single red lamp, no response
  - `noncritical_change`: yellow short lamp, no response
- Post-window response: counts as false alarm
- Marker strategy:
  - On event onset: `A_target_alarm`, `A_pseudo_alarm`, `A_noncritical`
  - On response outcome: `A_correct`, `A_miss`, `A_false_alarm`
  - On level updates: `difficulty_level`, `adapt_up/down/hold`
- Adaptive window:
  - fixed window
  - shorter than 60 seconds
  - applied at next window boundary

## Implementation Steps

### 1. Configuration

- Expand `config/module_a_levels.json`
- Add event mix and timing parameters for L1-L5
- Add adaptive window length and thresholds

### 2. Backend

- Track current in-block difficulty separately from start level
- Accept rich event payloads from frontend
- Send markers for module A event onsets and outcomes
- Record adapt actions and difficulty changes
- Produce a more meaningful block summary for module A

### 3. Frontend scene

- Replace placeholder monitor tiles with an eight-instrument cockpit panel
- Render all instruments in a full-screen immersive scene
- Add lamp widgets to each instrument
- Keep only participant-facing HUD elements

### 4. Frontend runtime

- Implement single-active-event scheduler
- Restrict candidate instruments by current level active zone count
- Drive lamp state changes from event state
- Handle `Space` response logic and timeout logic
- Log each onset and outcome to backend

### 5. Adaptive runtime

- Collect per-window metrics
- Upgrade after two consecutive good windows
- Downgrade after one poor window
- Apply new level at the next window boundary

### 6. Verification

- Check marker calls and event log rows match
- Check timer and duration minutes match
- Check level changes appear during long blocks
- Check Module B still runs without regression

## Open Follow-Ups

- Final adaptive window duration
- Exact thresholds for good and poor windows
- Whether to surface current level in the HUD or keep it very subtle
