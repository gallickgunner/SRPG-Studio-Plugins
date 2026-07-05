/* This file patches all the code and functionality related to navigation
 * via mouse/keyboard scrolling and also affects cursor placement.
 */

var GGWorldScale = GGWorldScale || {}

GGWorldScale.NavigationPatches = {};


GGWorldScale.NavigationPatches.patchMouseControl = function ()
{
    MouseControl.prepareMouseControl = function ()
    {
        var dx = GGWorldScale.Core.getScaledTileWidth() * 2;
        var dy = GGWorldScale.Core.getScaledTileHeight() * 2;

        this._edgeCursor.setEdgeRange(
            GGWorldScale.Core.getScaledMapViewportWidth() - dx,
            GGWorldScale.Core.getScaledMapViewportHeight() - dy
        );
    };

    MouseControl.changeCursorFromMap = function (x, y)
    {
        var wPixelX = GGWorldScale.Core.nativeMapTileToScaledPixelX(x);
        var wPixelY = GGWorldScale.Core.nativeMapTileToScaledPixelY(y);
        var dx = Math.floor(GGWorldScale.Core.getScaledTileWidth() / 2);
        var dy = Math.floor(GGWorldScale.Core.getScaledTileHeight() / 2);

        // Move actual mouse cursor to the visual center of the scaled tile.
        this._startMouseTracking(wPixelX + dx, wPixelY + dy);
    };

    // Scroll icons on the edge of map
    MouseControl.drawMapEdge = function ()
    {
        var self = this;
        var scrollableData = MapView.getScrollableData();
        var xStart = GGWorldScale.Core.getScaledMapViewportX() + GGWorldScale.Core.getScaledTileWidth();
        var yStart = GGWorldScale.Core.getScaledMapViewportY() + GGWorldScale.Core.getScaledTileHeight();

        if (!EnvironmentControl.isMouseOperation())
        {
            return;
        }

        GGWorldScale.Core.withMapClippingDisabled(function ()
        {
            self._edgeCursor.drawHorzCursor(
                xStart,
                yStart,
                scrollableData.isLeft,
                scrollableData.isRight
            );

            self._edgeCursor.drawVertCursor(
                xStart,
                yStart,
                scrollableData.isTop,
                scrollableData.isBottom
            );
        });
    };

    MouseControl._checkSideScroll = function ()
    {
        var n = -1;
        var session = root.getCurrentSession();
        var mx, my, sx, sy;
        var edgeW, edgeH;

        if (session === null)
        {
            return;
        }

        if (!GGWorldScale.Core.isMouseInsideScaledMapViewport())
        {
            this._isSideScrollX = false;
            this._isSideScrollY = false;
            return;
        }

        mx = GGWorldScale.Core.getMouseXInScaledMap();
        my = GGWorldScale.Core.getMouseYInScaledMap();

        sx = session.getScrollPixelX();
        sy = session.getScrollPixelY();

        // Use scaled world tile size for screen-edge mouse zones.
        edgeW = GGWorldScale.Core.getScaledTileWidth();
        edgeH = GGWorldScale.Core.getScaledTileHeight();

        vpWidth = GGWorldScale.Core.getScaledMapViewportWidth();
	    vpHeight = GGWorldScale.Core.getScaledMapViewportHeight();

        if (mx <= edgeW)
        {
            if (sx > 0)
            {
                n = sx - Math.floor(GGWorldScale.Core.getNativeTileWidth() / 2);
                session.setScrollPixelX(GGWorldScale.Core.clampScrollX(n));
            }
            else
            {
                this._isSideScrollX = false;
            }
        }
        else if (mx >= vpWidth - edgeW)
        {
            if (sx < GGWorldScale.Core.getNativeMaxScrollX())
            {
                n = sx + Math.floor(GGWorldScale.Core.getNativeTileWidth() / 2);
                session.setScrollPixelX(GGWorldScale.Core.clampScrollX(n));
            }
            else
            {
                this._isSideScrollX = false;
            }
        }
        else
        {
            this._isSideScrollX = false;
        }

        if (my <= edgeH)
        {
            if (sy > 0)
            {
                n = sy - Math.floor(GGWorldScale.Core.getNativeTileHeight() / 2);
                session.setScrollPixelY(GGWorldScale.Core.clampScrollY(n));
            }
            else
            {
                this._isSideScrollY = false;
            }
        }
        else if (my >= vpHeight - edgeH)
        {
            if (sy < GGWorldScale.Core.getNativeMaxScrollY())
            {
                n = sy + Math.floor(GGWorldScale.Core.getNativeTileHeight() / 2);
                session.setScrollPixelY(GGWorldScale.Core.clampScrollY(n));
            }
            else
            {
                this._isSideScrollY = false;
            }
        }
        else
        {
            this._isSideScrollY = false;
        }

        if (this._isSideScrollX || this._isSideScrollY)
        {
            this._adjustMapCursor();
        }
    };

    MouseControl._adjustMapCursor = function ()
    {
        var session = root.getCurrentSession();
        var mouseX, mouseY;
        var xCursor, yCursor;

        if (session === null || !GGWorldScale.Core.isMouseInsideScaledMapViewport())
        {
            return;
        }

        //mouseX = GGWorldScale.Core.getMouseXInScaledMap();
        //mouseY = GGWorldScale.Core.getMouseYInScaledMap();
        
        
        //root.log('mouseX API: ' + root.getMouseX()); 
        //root.log('mouseX: ' + GGWorldScale.Core.getMouseXInScaledMap());
        //root.log('vpX: ' + GGWorldScale.Core.getScaledMapViewportX());
        xCursor = GGWorldScale.Core.scaledPixelToNativeMapTileX(root.getMouseX());
        yCursor = GGWorldScale.Core.scaledPixelToNativeMapTileY(root.getMouseY());
        //root.log('xCrsr: ' + xCursor);
        // Clamp to valid map bounds.
        if (xCursor < 0)
        {
            xCursor = 0;
        }
        else if (xCursor >= CurrentMap.getWidth())
        {
            xCursor = CurrentMap.getWidth() - 1;
        }

        if (yCursor < 0)
        {
            yCursor = 0;
        }
        else if (yCursor >= CurrentMap.getHeight())
        {
            yCursor = CurrentMap.getHeight() - 1;
        }

        session.setMapCursorX(xCursor);
        session.setMapCursorY(yCursor);
    };
};

GGWorldScale.NavigationPatches.patchCurrentMap = function ()
{
    CurrentMap.getCol = function ()
    {
        return Math.ceil(GGWorldScale.Core.getScaledMapViewportWidth() / GGWorldScale.Core.getScaledTileWidth());
    };

    CurrentMap.getRow = function ()
    {
        return Math.ceil(GGWorldScale.Core.getScaledMapViewportHeight() / GGWorldScale.Core.getScaledTileHeight());
    };
};

// Patch functionality for centering around a pixel/target. Remember that scrolling should happen in native unscaled map space. So everything must be in native space here 
// to work well with session.setScrollPixel which is a native api function expecting pixel offsets in native space i.e. whatever mapchip_width setting is.
GGWorldScale.NavigationPatches.patchMapView = function ()
{
    MapView.getScrollPixelPos = function (xPixel, yPixel)
    {
        var xScroll, yScroll;
        var width = GGWorldScale.Core.getScaledMapViewportWidthInNative();
        var height = GGWorldScale.Core.getScaledMapViewportHeightInNative();
        
        root.log("pixel x :" + xPixel);
        root.log("area w :" + width);

        xScroll = xPixel - Math.floor(width / 2);
        yScroll = yPixel - Math.floor(height / 2);
        
        root.log("scroll w :" + xScroll);
        
        xScroll = GGWorldScale.Core.clampScrollX(xScroll);
        yScroll = GGWorldScale.Core.clampScrollY(yScroll);

        return createPos(Math.floor(xScroll), Math.floor(yScroll));
    };

    MapView.getScrollableData = function ()
    {
        var session = root.getCurrentSession();
        var xScroll, yScroll;

        if (session === null)
        {
            return {
                isLeft: false,
                isTop: false,
                isRight: false,
                isBottom: false
            };
        }

        xScroll = session.getScrollPixelX();
        yScroll = session.getScrollPixelY();

        return {
            isLeft: xScroll > 0,
            isTop: yScroll > 0,
            isRight: xScroll < GGWorldScale.Core.getNativeMaxScrollX(),
            isBottom: yScroll < GGWorldScale.Core.getNativeMaxScrollY()
        };
    };

    MapView.isVisiblePixel = function (xPixel, yPixel)
    {
        var session = root.getCurrentSession();
        var mx, my, width, height;

        if (session === null)
        {
            return false;
        }

        mx = session.getScrollPixelX();
        my = session.getScrollPixelY();

        width = GGWorldScale.Core.getScaledMapViewportWidthInNative();
        height = GGWorldScale.Core.getScaledMapViewportHeightInNative();

        if (mx > xPixel || my > yPixel)
        {
            return false;
        }
        else if ((mx + width) <= xPixel || (my + height) <= yPixel)
        {
            return false;
        }

        return true;
    };
};

GGWorldScale.NavigationPatches.patchMapCursors = function ()
{
	MapCursor.drawCursor = function ()
	{
        var self = this;
		var session = root.getCurrentSession();
		var srcW = UIFormat.MAPCURSOR_WIDTH / 2;
		var srcH = UIFormat.MAPCURSOR_HEIGHT;
		var destW = GGWorldScale.Core.getScaledTileWidth();
		var destH = GGWorldScale.Core.getScaledTileHeight();
		var x, y, pic;

		if (session === null)
		{
			return;
		}

		x = GGWorldScale.Core.nativeMapTileToScaledPixelX(session.getMapCursorX());
		y = GGWorldScale.Core.nativeMapTileToScaledPixelY(session.getMapCursorY());
		pic = this._getCursorUI();
        
        GGWorldScale.Core.withMapClippingDisabled(function(){
            if (pic !== null)
            {
                GGWorldScale.Core.setImageNearest(pic);
                pic.drawStretchParts(
                    x,
                    y,
                    destW,
                    destH,
                    self._mapCursorSrcIndex * srcW,
                    0,
                    srcW,
                    srcH
                );
            }
        });
		
	};

	FocusCursor.drawCursor = function ()
	{
        var self = this;
		var session = root.getCurrentSession();
		var srcW = UIFormat.MAPCURSOR_WIDTH / 2;
		var srcH = UIFormat.MAPCURSOR_HEIGHT;
		var destW = GGWorldScale.Core.getScaledTileWidth();
		var destH = GGWorldScale.Core.getScaledTileHeight();
		var x, y, pic, pic2;

		if (session === null)
		{
			return;
		}

		x = GGWorldScale.Core.nativeMapTileToScaledPixelX(session.getMapCursorX());
		y = GGWorldScale.Core.nativeMapTileToScaledPixelY(session.getMapCursorY());

		pic = root.queryUI('focuscursor');
		pic2 = root.queryUI('lockoncursor');

        GGWorldScale.Core.withMapClippingDisabled(function(){
            if (pic !== null)
            {
                GGWorldScale.Core.setImageNearest(pic);

                pic.drawStretchParts(
                    x,
                    y - Math.floor(40 * GGWorldScale.Config.scale),
                    destW,
                    destH,
                    self._mapCursorSrcIndex * srcW,
                    0,
                    srcW,
                    srcH
                );
            }

            if (pic2 !== null)
            {
                GGWorldScale.Core.setImageNearest(pic2);
                pic2.drawStretchParts(
                    x,
                    y,
                    destW,
                    destH,
                    this._mapCursorSrcIndex * srcW,
                    0,
                    srcW,
                    srcH
                );
            }
        });
		
	};

	LockonCursor._drawMapCursor = function ()
	{
		var srcW = UIFormat.MAPCURSOR_WIDTH / 2;
		var srcH = UIFormat.MAPCURSOR_HEIGHT;
		var destW = GGWorldScale.Core.getScaledTileWidth();
		var destH = GGWorldScale.Core.getScaledTileHeight();
		var x = GGWorldScale.Core.nativeMapTileToScaledPixelX(this._x);
		var y = GGWorldScale.Core.nativeMapTileToScaledPixelY(this._y);
		var pic = this._getCursorUI();

        GGWorldScale.Core.withMapClippingDisabled(function(){

        });
		if (pic !== null)
		{
			GGWorldScale.Core.setImageNearest(pic);
			pic.drawStretchParts(
				x,
				y,
				destW,
				destH,
				0,
				0,
				srcW,
				srcH
			);
		}
	};

    PosDoubleCursor.drawCursor = function (xSrc, ySrc, xDest, yDest)
	{
        
        var gm = root.getGraphicsManager();        
        gm.enableMapClipping(false);

		var x, y;

		x = GGWorldScale.Core.nativeMapTileToScaledPixelX(xSrc);
		y = GGWorldScale.Core.nativeMapTileToScaledPixelY(ySrc);
		this.drawSrcCursor(x, y);

		x = GGWorldScale.Core.nativeMapTileToScaledPixelX(xDest);
		y = GGWorldScale.Core.nativeMapTileToScaledPixelY(yDest);
		this.drawDestCursor(x, y);
        gm.enableMapClipping(true);
	};

	PosDoubleCursor.drawSrcCursor = function (x, y)
	{
		var srcW = UIFormat.SELECTCURSOR_WIDTH / 2;
		var srcH = UIFormat.SELECTCURSOR_HEIGHT / 2;
		var destW = Math.floor(srcW * GGWorldScale.Config.scale);
		var destH = Math.floor(srcH * GGWorldScale.Config.scale);
		var xSrc = 0;
		var ySrc = srcH;
		var pic = root.queryUI('command_poschangecursor');

		if (pic === null)
		{
			return;
		}

		GGWorldScale.Core.setImageNearest(pic);

		pic.drawStretchParts(
			x - Math.floor(10 * GGWorldScale.Config.scale),
			y,
			destW,
			destH,
			xSrc,
			ySrc,
			srcW,
			srcH
		);
	};

	PosDoubleCursor.drawDestCursor = function (x, y)
	{
		var srcW = UIFormat.SELECTCURSOR_WIDTH / 2;
		var srcH = UIFormat.SELECTCURSOR_HEIGHT / 2;
		var destW = Math.floor(srcW * GGWorldScale.Config.scale);
		var destH = Math.floor(srcH * GGWorldScale.Config.scale);
		var xSrc = this._cursorIndex * srcW;
		var ySrc = 0;
		var pic = root.queryUI('command_poschangecursor');

		if (pic === null)
		{
			return;
		}

		GGWorldScale.Core.setImageNearest(pic);

		pic.drawStretchParts(
			x - Math.floor(10 * GGWorldScale.Config.scale),
			y,
			destW,
			destH,
			xSrc,
			ySrc,
			srcW,
			srcH
		);
	};
};
