# World Scale Plugin

This scales the map/world view so map chips, units, cursors, panels, and map interaction can appear larger while keeping SRPG Studio's native tile logic intact.

The plugin's main goal is to let a project use normal SRPG Studio map data while drawing the world at a configurable scale such as `2x`, `3x`, etc. This makes pixel art appear larger but crisp since we use Nearest Neighbor Interpolation and keeps the gameplay grid in native SRPG tile coordinates.

The main benefits are

- Map Size is not tied to screen resolution anymore. You can open a `1920x1080` window. scale a `640x480` native map size `(20 x 15 tiles)` by `3` to get the same almost the result but in `1080p` window
- Since we can now increase resolution freely, this allows us to always use higher resolutions in projects, design UI assets in HD then downscale them while also keeping map size to our personal size. Previously UI assets would
have been upscaled from 480p when going in fullscreen. 

## Current Status

This plugin replaces or wraps major parts of SRPG Studio's map rendering, unit rendering, cursor positioning, mouse scrolling, and map viewport math.

Current rendering strategy:

- Map tiles remain logically native-sized, usually `GraphicsFormat.MAPCHIP_WIDTH` × `GraphicsFormat.MAPCHIP_HEIGHT`.
- Visual tile size is `native tile size * GGWorldScale.Config.scale`.
- Anything related to scrolling is done in native SRPG pixel space.
- The plugin computes its own scaled map viewport instead of relying on `root.getGameAreaWidth()`, `root.getGameAreaHeight()`, `root.getViewportX()`, or `root.getViewportY()`.
- Map clipping is disabled around custom world rendering so scaled maps can draw outside SRPG Studio's native map viewport/dead-space area. This is needed when native map size is smaller than screen size.
- Base map layer is rendered once into a cache image, then cropped and stretched each frame.
- Animated base-layer map chips are excluded from the static cache and drawn separately each frame.
- Upper-layer map chips are cached as sparse row entries and drawn tile-by-tile once.
- Units are drawn through a global custom char chip renderer.
- Wait-state units use `GraphicsComposition` desaturation, with `WorldMatrix` scaling instead of `drawStretchParts`, because composition combined with stretched drawing produces incorrect enlarged blocks.


## Rendering Pipeline

### Map Layer

`MapLayer.drawMapLayer` is fully replaced.

The replacement:

1. Advances the map-chip animation tick.
2. Disables native map clipping.
3. Draws the scaled/cached map with `GGWorldScale.MapChipRenderer.drawScaledMap()`.
4. Draws the native map grid through a scaled world matrix when grid display is enabled.

### Base Map Layer

The base map layer is cached into a full-map native-size cache image. Static base tiles are baked into this cache once. Each frame, only the visible crop is drawn. Animated base-layer tiles are not baked into the static cache. They are stored and drawn separately each frame.

### Upper Map Layer

Upper-layer map chips are currently cached as row entries, not as a full image cache. We update a single upper tile in the sparse cache on changes like chest opening/closing. It is currently called after `EventTrophy.enterEventTrophyCycle` for chest/trophy-style upper-layer changes.

### Unit Layer

`MapLayer.drawUnitLayer` is fully replaced.

The replacement draws native marking/range/light panels first, then disables clipping and calls:

```js
session.drawUnitSet(true, true, true, index, index2);
```

Because `CustomCharChipGroup.getFlag` is patched to include `CustomCharChipFlag.GLOBAL`, SRPG Studio routes map unit drawing into `GGWorldScale.CharChipRenderer.scaledCustomCharChipRenderer`.


## Patched Functions

Legend:

- **Wrapped**: original alias is called.
- **Conditional wrapper**: original alias is called only in some branches or with modified arguments.
- **Bypassed**: original function is fully replaced; original alias is not called.
- **Optional / disabled**: patch exists but is not currently enabled from `worldscale-main.js`.

### Char Chip / Unit Rendering

| Function | Status | Notes |
|---|---:|---|
| `CustomCharChipGroup.getFlag` | Wrapped | Calls original and ORs in `CustomCharChipFlag.GLOBAL`. |
| `MapLayer.drawUnitLayer` | **Bypassed** | Replaces native unit-layer draw ordering to support scaled unit rendering and disabled clipping. |

### Map Chip Rendering

| Function | Status | Notes |
|---|---:|---|
| `MapLayer.drawMapLayer` | **Bypassed** | Replaces native `session.drawMapSet` path with custom cached/scaled map drawing. |
| `MapChipLight.drawLight` | **Bypassed** | Replaces native fade/wave light drawing with scaled panel/fill drawing. |
| `BattleSetupScene._drawSortieMark` | **Bypassed** | Replaces sortie/deployment panel drawing with scaled wave-panel drawing. |
| `EventTrophy.enterEventTrophyCycle` | Wrapped | Calls original, then updates one upper-layer cache tile. |

### Dynamic Anime

| Function | Status | Notes |
|---|---:|---|
| `DynamicAnime.startDynamicAnime` | Wrapped | Calls original with viewport-adjusted native coordinates for map anime. |
| `DynamicAnime.drawDynamicAnime` | Conditional wrapper | For map anime, calls original under scaled world matrix and disabled clipping. For non-map anime, calls original normally. |

### Mouse / Navigation

| Function | Status | Notes |
|---|---:|---|
| `MouseControl.prepareMouseControl` | **Bypassed** | Sets edge cursor range using scaled map viewport size. |
| `MouseControl.changeCursorFromMap` | **Bypassed** | Moves mouse to the visual center of the scaled tile. |
| `MouseControl.drawMapEdge` | **Bypassed** | Draws edge-scroll cursors using plugin viewport and disabled clipping. |
| `MouseControl._checkSideScroll` | **Bypassed** | Reimplements edge scrolling using scaled viewport zones and native scroll changes. |
| `MouseControl._adjustMapCursor` | **Bypassed** | Converts absolute mouse screen pixels to native map tile coordinates through plugin projection. |

### Map Size / Scroll / Visibility

| Function | Status | Notes |
|---|---:|---|
| `CurrentMap.getCol` | **Bypassed** | Returns visible scaled column count. |
| `CurrentMap.getRow` | **Bypassed** | Returns visible scaled row count. |
| `MapView.getScrollPixelPos` | **Bypassed** | Centers scroll using scaled viewport size converted to native pixels. |
| `MapView.getScrollableData` | **Bypassed** | Computes scrollability from plugin native max scroll values. |
| `MapView.isVisiblePixel` | **Bypassed** | Uses scaled viewport size converted to native pixels. |

### Cursors

| Function | Status | Notes |
|---|---:|---|
| `MapCursor.drawCursor` | **Bypassed** | Draws map cursor at scaled tile size. |
| `FocusCursor.drawCursor` | **Bypassed** | Draws focus/lock-on cursor at scaled tile size. |
| `LockonCursor._drawMapCursor` | **Bypassed** | Draws lock-on cursor using scaled map tile projection. |
| `PosDoubleCursor.drawCursor` | **Bypassed** | Draws source/destination position-change cursors in scaled map space. |
| `PosDoubleCursor.drawSrcCursor` | **Bypassed** | Draws source hand/cursor at scaled size. |
| `PosDoubleCursor.drawDestCursor` | **Bypassed** | Draws destination hand/cursor at scaled size. |

### Optional LayoutControl Patches

These exist in `worldscale-UI.js`, but `worldscale-main.js` currently has this patch group commented out:

## Installation
Place the plugin files in SRPG Studio's plugin folder and enjoy

