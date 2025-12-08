# Vector Practice (Simplified)

A simple, self-contained website for practicing 2D vector graph transformations:

- Find terminal point from initial point + vector (Q = P + v)
- Find initial point from terminal point + vector (P = Q − v)

## Run locally

Use any static file server. With Python preinstalled, run from the project root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Notes

- Graph axes are fixed: x ∈ [−10, 10], y ∈ [−10, 10].
- Difficulty is fixed to medium (integers −10..10).
- Decimal answers accept a small tolerance (~1e-2).
- Click the graph to fill coordinate answers (snaps to 0.5).