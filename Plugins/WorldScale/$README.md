# World Scale Plugin

This scales the map/world view so map chips, units, cursors, panels, and map interaction can appear larger while keeping SRPG Studio's native tile logic intact.

The plugin's main goal is to let a project use normal SRPG Studio map data while drawing the world at a configurable scale such as `2x`, `3x`, etc. This makes pixel art appear larger but crisp since we use Nearest Neighbor Interpolation and keeps the gameplay grid in native SRPG tile coordinates.

The main benefits are

- Map Size is not tied to screen resolution anymore. You can open a `1920x1080` window. scale a `640x480` native map size `(20 x 15 tiles)` by `3` to get the same almost the result but in `1080p` window
- Since we can now increase resolution freely, this allows us to always use higher resolutions in projects, design UI assets in HD then downscale them while also keeping map size to our personal size. Previously UI assets would
have been upscaled from 480p when going in fullscreen OR you deal with huge maps and tiny visuals due to map size being tied to resolution.


## Demo

[Demo video](https://files.catbox.moe/vnwtbm.mp4)


## Current Status

This plugin replaces or wraps major parts of SRPG Studio's map rendering, unit rendering, cursor positioning, mouse scrolling, and map viewport math.

Current rendering strategy:

- Map tiles remain logically native-sized, usually `GraphicsFormat.MAPCHIP_WIDTH` × `GraphicsFormat.MAPCHIP_HEIGHT`.
- Visual tile size is `native tile size * GGWorldScale.Config.scale`.
- Anything related to scrolling is done in native SRPG pixel space.
- The plugin computes its own scaled map viewport instead of relying on `root.getGameAreaWidth()`, `root.getGameAreaHeight()`, `root.getViewportX()`, or `root.getViewportY()`.
- Map clipping is disabled around custom world rendering so scaled maps can draw outside SRPG Studio's native map viewport/dead-space area. This is needed when native map size is smaller than screen size.
- Map layer is drawn into a native viewport sized cache every frame, then scaled by the scale factor and rendered in the actual game window. Since the drawing into the cache is done by the native functions and drawing is done every frame, any map chip changes are automatically handled. We also don't need to worry about layering or animated map tiles.
- Units are drawn via native function calls which are patched. For idle units and animation `session.drawUnitSet()` is used to draw into a transparent cache just like the map. Then the cache image is scaled and overlaid on to the window.

## Rendering Pipeline

### Map Layer

`MapLayer.drawMapLayer` is fully replaced.

The replacement:

1. Disables native map clipping.
2. Draws the native cache image scaled in the window with `GGWorldScale.MapChipRenderer.drawScaledMapFromCache()`.
3. Draws the native map grid through a scaled world matrix when grid display is enabled.

### Unit Layer

`MapLayer.drawUnitLayer` is fully replaced.

The replacement works just like the original function but disables clipping and draws the units into a separate cache which is then scaled to fit the window. 

## Patched Functions

Legend:

- **Wrapped**: original alias is called.
- **Conditional wrapper**: original alias is called only in some branches or with modified arguments.
- **Bypassed**: original function is fully replaced; original alias is not called.
- **Optional / disabled**: patch exists but is not currently enabled from `worldscale-main.js`.

### Char Chip / Unit Rendering

| Function | Status | Notes |
|---|---:|---|
| `UnitRenderer.drawCharChip` | Conditional wrapper | Calls original if char chip is drawn for menu/easy battles etc. Bypasses and draws using custom logic on map for moving animations |
| `MapLayer.drawUnitLayer` | **Bypassed** | Re-routes the native drawing into the cache. Then scales it, disabling clipping drawing into the game window. |

### Map Rendering

| Function | Status | Notes |
|---|---:|---|
| `MapLayer.drawMapLayer` | **Bypassed** | Re-routes the native drawing into the cache. Then scales it, disabling clipping drawing into the game window.|
| `MapChipLight.drawLight` | **Bypassed** | Replaces native fade/wave light drawing with scaled panel/fill drawing. |
| `BattleSetupScene._drawSortieMark` | **Bypassed** | Replaces sortie/deployment panel drawing with scaled wave-panel drawing. |
| `ClipingBattleContainer._createMapCache`| **Bypassed** | Replaces sortie/deployment panel drawing with scaled wave-panel drawing. |

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

### Optional LayoutControl Patches

These exist in `worldscale-UI.js`, but `worldscale-main.js` currently has this patch group commented out:

## Installation
Place the plugin files in SRPG Studio's plugin folder and enjoy. Change scale and plugin enable/disable from config file. The worldscale-config file has options to set scale for different resolutions. The resolution-config file lets you choose desired window resolution.
