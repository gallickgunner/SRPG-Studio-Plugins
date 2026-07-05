/* This file patches all the code and functionality related to rendering map chips
 * It also covers animated map chips (sea/fire/etc) and map chip changes due to event commands
 */

var GGWorldScale = GGWorldScale || {}

GGWorldScale.MapChipRenderer = {
    mapChipAnimInterval: 12,
    _upperLayerCacheMapInfo: null,
    _upperLayerRows: null,
    _mapChipAnimTick: 0,
    mapChipPatches: {}
}

GGWorldScale.MapChipRenderer.drawScaledMap = function ()
{
    var session = root.getCurrentSession();
    var mapInfo, startX, startY, endX, endY, x, y;

    if (session === null)
    {
        return;
    }

    mapInfo = session.getCurrentMapInfo();

    startX = Math.floor(session.getScrollPixelX() / GGWorldScale.Core.getNativeTileWidth());
    startY = Math.floor(session.getScrollPixelY() / GGWorldScale.Core.getNativeTileHeight());


    endX = startX + Math.ceil(GGWorldScale.Core.getScaledMapViewportWidth() / GGWorldScale.Core.getScaledTileWidth()) + 2;
    endY = startY + Math.ceil(GGWorldScale.Core.getScaledMapViewportHeight() / GGWorldScale.Core.getScaledTileHeight()) + 2;

    for (y = startY; y < endY; y++)
    {
        for (x = startX; x < endX; x++)
        {
            if (x < 0 || y < 0 || x >= mapInfo.getMapWidth() || y >= mapInfo.getMapHeight())
            {
                continue;
            }

            this.drawMapChip(x, y, false);
        }
    }

    // Sparse/cached upper layer.
    // This avoids checking/drawing upper layer for every visible tile every frame.
    this.drawCachedUpperLayer(startX, startY, endX, endY);
}

GGWorldScale.MapChipRenderer.drawMapChip = function (mapX, mapY, isUpper)
{
    var session = root.getCurrentSession();
    var handle, pic, animInfo, frameIndex;
    var srcW = GGWorldScale.Core.getNativeTileWidth();
    var srcH = GGWorldScale.Core.getNativeTileHeight();
    var destW = GGWorldScale.Core.getScaledTileWidth();
    var destH = GGWorldScale.Core.getScaledTileHeight();
    var srcX, srcY;
    var xDest, yDest;

    if (session === null)
    {
        return;
    }

    handle = session.getMapChipGraphicsHandle(mapX, mapY, isUpper);

    if (handle === null)
    {
        return;
    }

    if (isUpper && handle === null)
    {
        return;
    }

    pic = GraphicsRenderer.getGraphics(handle, GraphicsType.MAPCHIP);

    if (pic === null)
    {
        return;
    }

    GGWorldScale.Core.setImageNearest(pic);

    //handle.getSrcX returns in Tile coordinates
    srcX = handle.getSrcX() * srcW;
    srcY = handle.getSrcY() * srcH;

    animInfo = this.getMapChipAnimationInfoFromPic(pic);

    if (animInfo !== null)
    {
        frameIndex = this.getMapChipAnimationFrameIndex(animInfo.frameCount);
        srcY += frameIndex * animInfo.frameHeight;
    }

    xDest = GGWorldScale.Core.nativeMapTileToScaledPixelX(mapX);
    yDest = GGWorldScale.Core.nativeMapTileToScaledPixelY(mapY);

    pic.drawStretchParts(
        xDest,
        yDest,
        destW,
        destH,
        srcX,
        srcY,
        srcW,
        srcH
    );
};

GGWorldScale.MapChipRenderer.parseAnimatedMapChipFrameCount = function (name)
{
    var i, ch, text;

    if (name === null || typeof name === 'undefined')
    {
        return 0;
    }

    if (name.length < 2 || name.charAt(0) !== '!')
    {
        return 0;
    }

    text = '';

    for (i = 1; i < name.length; i++)
    {
        ch = name.charAt(i);

        if (ch < '0' || ch > '9')
        {
            break;
        }

        text += ch;
    }

    if (text.length === 0)
    {
        return 0;
    }

    return parseInt(text, 10);
};

GGWorldScale.MapChipRenderer.getMapChipAnimationFrameIndex = function (frameCount)
{
    if (frameCount <= 1)
    {
        return 0;
    }

    return Math.floor(this._mapChipAnimTick / this.mapChipAnimInterval) % frameCount;
};

GGWorldScale.MapChipRenderer.advanceMapChipAnimation = function ()
{
    this._mapChipAnimTick++;
};

GGWorldScale.MapChipRenderer.getMapChipAnimationInfoFromPic = function (pic)
{
    var name, frameCount, imageHeight, frameHeight;

    name = pic.getName();
    frameCount = this.parseAnimatedMapChipFrameCount(name);

    if (frameCount <= 1)
    {
        return null;
    }

    imageHeight = pic.getHeight();

    if (imageHeight <= 0)
    {
        return null;
    }

    frameHeight = Math.floor(imageHeight / frameCount);

    return {
        name: name,
        frameCount: frameCount,
        frameHeight: frameHeight
    };
};

GGWorldScale.MapChipRenderer.updateUpperLayerCacheTile = function (mapX, mapY)
{
    var session = root.getCurrentSession();
    var handle, pic, row, i, entry;
    var srcW = GGWorldScale.Core.getNativeTileWidth();
    var srcH = GGWorldScale.Core.getNativeTileHeight();

    if (session === null)
    {
        return;
    }

    if (this._upperLayerRows === null)
    {
        return;
    }

    row = this._upperLayerRows[mapY];

    if (row === null || typeof row === 'undefined')
    {
        row = [];
        this._upperLayerRows[mapY] = row;
    }

    // Remove old cached upper tile at this position.
    for (i = row.length - 1; i >= 0; i--)
    {
        if (row[i].x === mapX)
        {
            row.splice(i, 1);
        }
    }

    // Re-read current upper-layer state after the native mapchip change.
    handle = session.getMapChipGraphicsHandle(mapX, mapY, true);

    if (handle === null)
    {
        return;
    }

    pic = GraphicsRenderer.getGraphics(handle, GraphicsType.MAPCHIP);

    if (pic === null)
    {
        return;
    }

    GGWorldScale.Core.setImageNearest(pic);

    var animInfo = this.getMapChipAnimationInfoFromPic(pic);

    entry = {
        x: mapX,
        y: mapY,
        pic: pic,

        baseSrcX: handle.getSrcX() * srcW,
        baseSrcY: handle.getSrcY() * srcH,

        isAnimated: animInfo !== null,
        frameCount: animInfo !== null ? animInfo.frameCount : 0,
        frameHeight: animInfo !== null ? animInfo.frameHeight : 0
    };

    row.push(entry);
};

GGWorldScale.MapChipRenderer.drawCachedUpperLayer = function (startX, startY, endX, endY)
{
    var y, i, row, entry;
    var srcW = GGWorldScale.Core.getNativeTileWidth();
    var srcH = GGWorldScale.Core.getNativeTileHeight();
    var destW = GGWorldScale.Core.getScaledTileWidth();
    var destH = GGWorldScale.Core.getScaledTileHeight();
    var xDest, yDest;
    var srcX, srcY, frameIndex;

    if (!GGWorldScale.Config.drawUpperLayer)
    {
        return;
    }

    this.ensureUpperLayerCache();

    if (this._upperLayerRows === null)
    {
        return;
    }

    for (y = startY; y < endY; y++)
    {
        row = this._upperLayerRows[y];

        if (row === null || typeof row === 'undefined')
        {
            continue;
        }

        for (i = 0; i < row.length; i++)
        {
            entry = row[i];

            if (entry.x < startX || entry.x >= endX)
            {
                continue;
            }

            xDest = GGWorldScale.Core.nativeMapTileToScaledPixelX(entry.x);
            yDest = GGWorldScale.Core.nativeMapTileToScaledPixelY(entry.y);

            if (!GGWorldScale.Core.isScreenVisible(xDest, yDest, destW, destH))
            {
                continue;
            }

            srcX = entry.baseSrcX;
            srcY = entry.baseSrcY;

            if (entry.isAnimated)
            {
                frameIndex = this.getMapChipAnimationFrameIndex(entry.frameCount);
                srcY += frameIndex * entry.frameHeight;
            }

            entry.pic.drawStretchParts(
                xDest,
                yDest,
                destW,
                destH,
                srcX,
                srcY,
                srcW,
                srcH
            );
        }
    }
};

GGWorldScale.MapChipRenderer.ensureUpperLayerCache = function ()
{
    var session = root.getCurrentSession();
    var mapInfo, mapW, mapH;
    var x, y, handle, pic, row, entry, animInfo;
    var srcW = GGWorldScale.Core.getNativeTileWidth();
    var srcH = GGWorldScale.Core.getNativeTileHeight();

    if (session === null)
    {
        return;
    }

    mapInfo = session.getCurrentMapInfo();

    if (this._upperLayerCacheMapInfo === mapInfo && this._upperLayerRows !== null)
    {
        return;
    }

    this._upperLayerCacheMapInfo = mapInfo;
    this._upperLayerRows = [];

    mapW = mapInfo.getMapWidth();
    mapH = mapInfo.getMapHeight();

    for (y = 0; y < mapH; y++)
    {
        row = [];

        for (x = 0; x < mapW; x++)
        {
            handle = session.getMapChipGraphicsHandle(x, y, true);

            if (handle === null)
            {
                continue;
            }

            pic = GraphicsRenderer.getGraphics(handle, GraphicsType.MAPCHIP);

            if (pic === null)
            {
                continue;
            }

            GGWorldScale.Core.setImageNearest(pic);

            animInfo = this.getMapChipAnimationInfoFromPic(pic);

            entry = {
                x: x,
                y: y,
                pic: pic,

                baseSrcX: handle.getSrcX() * srcW,
                baseSrcY: handle.getSrcY() * srcH,

                isAnimated: animInfo !== null,
                frameCount: animInfo !== null ? animInfo.frameCount : 0,
                frameHeight: animInfo !== null ? animInfo.frameHeight : 0
            };

            row.push(entry);
        }

        this._upperLayerRows[y] = row;
    }
};


GGWorldScale.MapChipRenderer.drawIndexArrayFade = function (indexArray, color, alpha)
{
    var i, index, mapX, mapY;

    if (indexArray === null || typeof indexArray === 'undefined')
    {
        return;
    }

    for (i = 0; i < indexArray.length; i++)
    {
        index = indexArray[i];
        mapX = CurrentMap.getX(index);
        mapY = CurrentMap.getY(index);

        var x = GGWorldScale.Core.nativeMapTileToScaledPixelX(mapX);
        var y = GGWorldScale.Core.nativeMapTileToScaledPixelY(mapY);
        var w = GGWorldScale.Core.getScaledTileWidth();
        var h = GGWorldScale.Core.getScaledTileHeight();

        if (GGWorldScale.Core.isScreenVisible(x, y, w, h))
        {
            root.getGraphicsManager().fillRange(x, y, w, h, color, alpha);
        }
    }
};

GGWorldScale.MapChipRenderer.drawScaledWavePanelTile = function (mapX, mapY, pic, scrollCount)
{
    var x, y, destW, destH;
    var imageW, imageH, displayW, displayH, space;
    var endW, startW, destEndW, destStartW;

    if (pic === null)
    {
        return;
    }

    x = GGWorldScale.Core.nativeMapTileToScaledPixelX(mapX);
    y = GGWorldScale.Core.nativeMapTileToScaledPixelY(mapY);
    destW = GGWorldScale.Core.getScaledTileWidth();
    destH = GGWorldScale.Core.getScaledTileHeight();

    if (!GGWorldScale.Core.isScreenVisible(x, y, destW, destH))
    {
        return;
    }

    GGWorldScale.Core.setImageNearest(pic);

    imageW = UIFormat.PANEL_WIDTH;
    imageH = UIFormat.PANEL_HEIGHT;
    displayW = Math.floor(UIFormat.PANEL_WIDTH / 2);
    displayH = UIFormat.PANEL_HEIGHT;
    space = 1;

    scrollCount = scrollCount % (imageW - space);

    if (scrollCount + displayW <= imageW - space)
    {
        pic.drawStretchParts(
            x,
            y,
            destW,
            destH,
            scrollCount,
            space,
            displayW,
            displayH
        );
    }
    else
    {
        endW = imageW - space - scrollCount;
        startW = displayW - endW;

        destEndW = Math.floor(destW * endW / displayW);
        destStartW = destW - destEndW;

        pic.drawStretchParts(
            x,
            y,
            destEndW,
            destH,
            scrollCount,
            space,
            endW,
            displayH
        );

        pic.drawStretchParts(
            x + destEndW,
            y,
            destStartW,
            destH,
            space,
            space,
            startW,
            displayH
        );
    }
};


GGWorldScale.MapChipRenderer.drawIndexArrayWavePanel = function (indexArray, pic, scrollCount)
{
    var i, index, mapX, mapY;

    if (indexArray === null || typeof indexArray === 'undefined')
    {
        return;
    }

    for (i = 0; i < indexArray.length; i++)
    {
        index = indexArray[i];

        mapX = CurrentMap.getX(index);
        mapY = CurrentMap.getY(index);

        this.drawScaledWavePanelTile(mapX, mapY, pic, scrollCount);
    }
};


//////////////////////////////// PATCHES //////////////////////////////////////

GGWorldScale.MapChipRenderer.mapChipPatches.patchMapLayer = function ()
{
    MapLayer.drawMapLayer = function ()
    {
        var session = root.getCurrentSession();
        GGWorldScale.MapChipRenderer.advanceMapChipAnimation();
        if (session === null)
        {
            root.getGraphicsManager().fill(0x0);
            return;
        }
        var x = session.getMapCursorX();
        var y = session.getMapCursorY();

        GGWorldScale.Core.withMapClippingDisabled(function ()
        {
            GGWorldScale.MapChipRenderer.drawScaledMap();

            if (EnvironmentControl.isMapGrid() && root.isSystemSettings(SystemSettingsType.MAPGRID))
            {
                GGWorldScale.Core.withScaledWorldMatrix(function ()
                {
                    session.drawMapGrid(0x0, 64);
                });
            }

            MapLayer._drawColor(EffectRangeType.MAP);
        });
    }
};

// This patches the map animation effects
GGWorldScale.MapChipRenderer.mapChipPatches.patchDynamicAnime = function ()
{
    if (typeof DynamicAnime === 'undefined')
    {
        return;
    }

    if (DynamicAnime._GGWorldScalePatched)
    {
        return;
    }

    DynamicAnime._GGWorldScalePatched = true;

    var aliasStartDynamicAnime = DynamicAnime.startDynamicAnime;
    var aliasDrawDynamicAnime = DynamicAnime.drawDynamicAnime;

    DynamicAnime.startDynamicAnime = function (anime, x, y)
    {
        // Store whether this anime was started during a map session.
        // Most item/warp/state map effects land here.
        this._GGWorldScaleMapAnime = root.getCurrentSession() !== null;

        return aliasStartDynamicAnime.call(this, anime, x, y);
    };

    DynamicAnime.drawDynamicAnime = function ()
    {
        var self = this;

        if (this._GGWorldScaleMapAnime)
        {
            GGWorldScale.Core.withScaledWorldMatrix(function ()
            {
                var gm = root.getGraphicsManager();
        	    gm.enableMapClipping(false);
                aliasDrawDynamicAnime.call(self);
                gm.enableMapClipping(true);
            });
            return;
        }

        aliasDrawDynamicAnime.call(this);
    };
};

// This is for normal/movement/range panels
GGWorldScale.MapChipRenderer.mapChipPatches.patchMapChipLight = function ()
{
    MapChipLight.drawLight = function () 
    {
        var self = this;
        GGWorldScale.Core.withMapClippingDisabled(function ()
        {
            if (self._type === MapLightType.NORMAL)
            {
                GGWorldScale.MapChipRenderer.drawIndexArrayFade(
                    self._indexArray,
                    self._getColor(),
                    self._getAlpha()
                );
            }
            else if (self._type === MapLightType.MOVE)
            {
                GGWorldScale.MapChipRenderer.drawIndexArrayWavePanel(
                    self._indexArray,
                    self._getMoveImage(),
                    self._wavePanel.getScrollCount()
                );
            }
            else if (self._type === MapLightType.RANGE)
            {
                GGWorldScale.MapChipRenderer.drawIndexArrayWavePanel(
                    self._indexArray,
                    self._getRangeImage(),
                    self._wavePanel.getScrollCount()
                );
            }
        })

    };

};

// This is for deploymen panels
GGWorldScale.MapChipRenderer.mapChipPatches.patchBattleSetup = function ()
{
    BattleSetupScene._drawSortieMark = function ()
    {
        var i;
        var session = root.getCurrentSession();
        var arr = this._sortieSetting.getSortieArray();
        var count = arr.length;
        var pic = root.queryUI('sortie_panel');
        var scrollCount;

        if (session === null || pic === null || !session.isMapState(MapStateType.UNITDRAW))
        {
            return;
        }

        GGWorldScale.Core.setImageNearest(pic);

        scrollCount = this._wavePanel.getScrollCount();

        GGWorldScale.Core.withMapClippingDisabled(function ()
        {
            for (i = 0; i < count; i++)
            {
                if (!arr[i].isFixed)
                {
                    GGWorldScale.MapChipRenderer.drawScaledWavePanelTile(
                        arr[i].x,
                        arr[i].y,
                        pic,
                        scrollCount
                    );
                }
            }
        });
    };
}
//Apparently this is where chest map chip changes go through. We use this to update our upper layer cache which isn't drawn every frame
GGWorldScale.MapChipRenderer.mapChipPatches.patchEventTrophy = function ()
{
    var aliasEnterEventTrophyCycle = EventTrophy.enterEventTrophyCycle;

    EventTrophy.enterEventTrophyCycle = function (unit, placeEvent)
    {
        var info, x, y, result;

        info = null;
        x = -1;
        y = -1;

        if (placeEvent !== null)
        {
            info = placeEvent.getPlaceEventInfo();

            if (info !== null)
            {
                x = info.getX();
                y = info.getY();
            }
        }

        result = aliasEnterEventTrophyCycle.call(this, unit, placeEvent);

        if (x >= 0 && y >= 0)
        {
            GGWorldScale.MapChipRenderer.updateUpperLayerCacheTile(x, y);
        }
        root.Log(x + ', ' + y);

        return result;
    };
};
