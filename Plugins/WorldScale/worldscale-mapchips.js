/* This file patches all the code and functionality related to rendering map chips
 * including movement panels and deployment panels
 */

var GGWorldScale = GGWorldScale || {}

GGWorldScale.MapChipRenderer = {
    _cachedMapInfo: null,
    _mapLayerCache: null,
    _cacheW: 0,
    _cacheH: 0,
    isExternalMapCacheDraw: false,
    patches: {}
}

GGWorldScale.MapChipRenderer.createCache = function ()
{
    var gm = root.getGraphicsManager();
    var w = GGWorldScale.Core.getScaledMapViewportWidthInNative();
    var h = GGWorldScale.Core.getScaledMapViewportHeightInNative();

    // If map layer cache not null, don't build it again
    if (this._mapLayerCache != null && this._cacheW === w && this._cacheH === h)
        return;

    this._cacheW = w;
    this._cacheH = h;
    this._mapLayerCache = gm.createCacheGraphics(w, h);

    if (this._mapLayerCache == null)
    {
        throw new Error('Map layer cache generation failed.');
    }

    GGWorldScale.Core.setImageNearest(this._mapLayerCache);
};


GGWorldScale.MapChipRenderer.drawScaledMapLayerFromCache = function ()
{
    //Draw map via native call into rendertarget then scale it onto window

    var session = root.getCurrentSession();
    var gm = root.getGraphicsManager();

    if (!session)
        return;
    ;
    var destX, destY, destW, destH;

    this.createCache();

    gm.setRenderCache(this._mapLayerCache);
    gm.fillRange(0, 0, this._cacheW, this._cacheH, 0x000000, 0);
    session.drawMapSet(0, 0);
    gm.resetRenderCache();

    destX = GGWorldScale.Core.getScaledMapViewportX();
    destY = GGWorldScale.Core.getScaledMapViewportY();
    destW = GGWorldScale.Core.getScaledMapViewportWidth();
    destH = GGWorldScale.Core.getScaledMapViewportHeight();

    this._mapLayerCache.drawStretchParts(
        destX,
        destY,
        destW,
        destH,
        0,
        0,
        this._cacheW,
        this._cacheH
    );
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

GGWorldScale.MapChipRenderer.patches.patchMapLayer = function ()
{
    MapLayer.drawMapLayer = function ()
    {
        var session = root.getCurrentSession();
        if (session === null)
        {
            root.getGraphicsManager().fill(0x0);
            return;
        }
        var x = session.getMapCursorX();
        var y = session.getMapCursorY();

        // Real battle/background uses this function to capture draws into its own cache.
        // Don't set our map cache inside that.
        if (GGWorldScale.MapChipRenderer.isExternalMapCacheDraw)
        {
            session.drawMapSet(0, 0);
            MapLayer._drawColor(EffectRangeType.MAP);
            return;
        }

        GGWorldScale.Core.withMapClippingDisabled(function ()
        {
            GGWorldScale.MapChipRenderer.drawScaledMapLayerFromCache();

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

GGWorldScale.MapChipRenderer.patches.patchRealBattleMapBg = function ()
{
    var aliasCreateMapCache = ClipingBattleContainer._createMapCache;

    ClipingBattleContainer._createMapCache = function ()
    {
        var result;

        GGWorldScale.MapChipRenderer.isExternalMapCacheDraw = true;
        result = aliasCreateMapCache.call(this);
        GGWorldScale.MapChipRenderer.isExternalMapCacheDraw = false;

        return result;
    };
}
// This patches the map animation effects
GGWorldScale.MapChipRenderer.patches.patchDynamicAnime = function ()
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

        return aliasStartDynamicAnime.call(this, anime, x + GGWorldScale.Core.getScaledMapViewportXInNative(), y + GGWorldScale.Core.getScaledMapViewportYInNative());
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
GGWorldScale.MapChipRenderer.patches.patchMapChipLight = function ()
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
GGWorldScale.MapChipRenderer.patches.patchBattleSetup = function ()
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
