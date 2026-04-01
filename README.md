# pilot-training

Web-first scaffold for the Flight Cognitive Training System described in `prd.md`.

## Current scope

This version has been migrated from the early Pygame shell to a browser-based architecture:

- `frontend/`: single-page web UI
- `src/web/`: Python backend and session API
- `config/`: app config, level config, marker mapping
- `logs/`: session outputs

The shared workflow is already wired:

`被试信息 -> 模块选择 -> 模式选择 -> 初始难度 -> 准备页 -> 占位 block -> 结果页`

Module A and Module B are still placeholder implementations. The current goal is to keep the system runnable, loggable, and easy to extend.

## Architecture

- Frontend: static HTML/CSS/JavaScript SPA
- Backend: Python standard-library HTTP server
- Logging: local JSON/CSV export
- Marker hook: local placeholder API retained in backend

This keeps the system easy to run in restricted or offline environments without forcing extra web dependencies.

## Run

Start the local web server:

```bash
python3 src/main.py
```

Or choose host and port explicitly:

```bash
python3 src/main.py --host 127.0.0.1 --port 8000
```

Then open:

```text
http://127.0.0.1:8000
```

If you install the package in editable mode, you can also run:

```bash
pip install -e . --no-build-isolation
pilot-training
```

## Output

Each run creates a session folder in `logs/` with:

- `session_meta.json`
- `config_snapshot.json`
- `event_log.csv`
- `block_summary.csv`

## Notes

- No third-party runtime dependency is required for the current web scaffold.
- The previous desktop-style Pygame logic is no longer the default runtime path.
- The next step is to replace placeholder block behavior with real Module A and Module B task logic.
