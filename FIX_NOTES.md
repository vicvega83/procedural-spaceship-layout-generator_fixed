# Detached geometry fix

## Root cause

`tileWall`, `panelToGeometry`, `outlineGeometry`, and every opening record use world-space coordinates. The render tree then added another parent translation:

- `RoomVisual` translated already-world-space room geometry by `room.min`.
- `OpeningVisual` translated already-world-space frames, glass, door panels, and airlock rings by `opening.center`.

The duplicate transforms made rooms drift apart and placed openings and frames away from their walls.

## Required changes

In `src/components/MeshSystem.tsx`:

1. Render the `RoomVisual` root group at the scene origin. Keep its animated scale, but remove its `position={[room.min.x, room.min.y, room.min.z]}` because the geometries already contain absolute coordinates.
2. Render the `OpeningVisual` root group at the scene origin. Keep the click handler, but remove its `position={[center.x, center.y, center.z]}` because `FrameMesh`, `WindowPane`, `DoorPanel`, and `AirlockRing` already place themselves at the opening's absolute center.

Those two renderer changes address only the original duplicate-transform defect; the broader placement repair below also changes the generator contract.

## Placement and non-compenetration fix

The second repair makes generation forward-only and validate-before-commit:

- `tileWall()` now partitions one canonical face rectangle. Opening rectangles include the complete frame envelope, so wall panels, edge panels, frames, glass, and doors cannot occupy the same volume.
- Coplanar shared-wall areas have one deterministic owner (the lower room id). The other room removes that overlap from its partition, eliminating duplicate wall skins and z-fighting.
- Interior candidates are checked against room bounds, door/window clearance volumes, primary furniture, and previously accepted props before they are appended.
- Exterior objects now retain their mounting `face`, use kind-specific physical bounds, move outward by half their local height, and are rejected when they overlap an opening or another exterior object.
- `ExteriorVisual` maps the local up axis to the selected face normal, so side, floor, and ceiling mounts use the same coordinate convention.
- `validateLayout()` now checks exterior attachment and pairwise exterior overlap in addition to room and opening invariants.

All mutations remain forward-only: a candidate is calculated, validated against the current committed layout, and appended only when valid. Rejected candidates do not move or invalidate existing geometry.

## Verification

The production build completes successfully with `npm run build`.

The extended invariant sweep also completed successfully across 500 deterministic seeds with zero validation failures.
