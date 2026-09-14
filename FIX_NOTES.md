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

No generator or layout-data changes are required.

## Verification

The production build completes successfully with `npm run build`.
