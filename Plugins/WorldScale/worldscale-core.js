/* This file stores all the helper/utility functions used throughout the plugin
 * Most of these are conversion from screen space to map space (in tiles), scaled screen pixel to
 * base un-scaled pixel and vice versa
 * 
 * Some common terms:
 * 
 * Whereever the term "Absolute" is used this means the raw actual coordinates without the map scroll taken into consideration. "Relative" means after the camera/viewport is updated by scrolling.
 * Whereever the term "Native" is used, it means that this is before the world scale is applied in srpg studio's base coordinate sytem. Wherever "Scaled" is used, it means scale after scale is applied.
*/

var GGWorldScale = GGWorldScale || {}

GGWorldScale.Core = {

    getScreenW: function ()
    {
        return root.getWindowWidth();
    },

    getScreenH: function ()
    {
        return root.getWindowHeight();
    },    

    getNativeTileWidth: function ()
    {
        return GraphicsFormat.MAPCHIP_WIDTH;
    },

    getNativeTileHeight: function ()
    {
        return GraphicsFormat.MAPCHIP_HEIGHT;
    },

    getScaledTileWidth: function ()
    {
        return this.getNativeTileWidth() * GGWorldScale.Config.scale;
    },

    getScaledTileHeight: function ()
    {
        return this.getNativeTileHeight() * GGWorldScale.Config.scale;
    },

    getScaledMapWidth: function()
    {
        return (CurrentMap.getWidth() * this.getScaledTileWidth()) ;
    },

    getScaledMapHeight: function()
    {
        return (CurrentMap.getHeight() * this.getScaledTileHeight()) ;
    },

    // this is basically how much of the map in pixels is actually visible in the viewport after the scale is applied. For e.g native map could be 640 in 1920 window but after scaling by 2
    // we should view that 640 map in a 1280 region
    getScaledMapViewportWidth: function ()
    {
        var mapW = this.getScaledMapWidth();
	    var windowW = root.getWindowWidth();
	    return mapW < windowW ? mapW : windowW;
    },

    getScaledMapViewportHeight: function ()
    {
        var mapH = this.getScaledMapHeight();
	    var windowH = root.getWindowHeight();
	    return mapH < windowH ? mapH : windowH;
    },

     // this is basically converting the above value back to native space. And this is different from just root.getGameAreaWidth/Height. Take this example
     // If a 672p (21 tile) map is displayed in 2560 window. root.getGameAreaWidth returns 672. However, once we apply scale such that the map size increases window size
     // e.g scale of 4, 672 * 4 > 2560. then according to above function scaledViewportMapWidth is clamped to window size hence equals 2560
     // 2560/4 = 640. Note that this differs from 672 which was gotten from native api function.
    getScaledMapViewportWidthInNative: function ()
    {   
        return Math.ceil(this.getScaledMapViewportWidth() / GGWorldScale.Config.scale); 
    },

    getScaledMapViewportHeightInNative: function ()
    {
        return Math.ceil(this.getScaledMapViewportHeight() / GGWorldScale.Config.scale);
    },

    getScaledMapViewportX: function ()
    {
        var mapScaledWidth = this.getScaledMapWidth();
        var screenW = root.getWindowWidth();

        if (mapScaledWidth >= screenW)
        {
            return 0;
        }

        return Math.floor((screenW - mapScaledWidth) / 2);
        
    },

    getScaledMapViewportY: function ()
    {
        var mapScaledHeight = this.getScaledMapHeight();
        var screenH = root.getWindowHeight();

        if (mapScaledHeight >= screenH)
        {
            return 0;
        }

        return Math.floor((screenH - mapScaledHeight) / 2);
    },

    getScaledMapViewportXInNative: function()
    {
        return this.getScaledMapViewportX() / GGWorldScale.Config.scale;
    }, 

    getScaledMapViewportYInNative: function()
    {
        return this.getScaledMapViewportY() / GGWorldScale.Config.scale;
    },

    nativeToScaledPixelX: function (xPixel)
    {
        var session = root.getCurrentSession();
        //return Math.floor(xPixel * GGWorldScale.Config.scale);
        return (this.getScaledMapViewportX() + Math.floor((xPixel) * GGWorldScale.Config.scale));
    },

    nativeToScaledPixelY: function (yPixel)
    {
        //return Math.floor(yPixel * GGWorldScale.Config.scale);
        var session = root.getCurrentSession();
        return (this.getScaledMapViewportY() + Math.floor((yPixel) * GGWorldScale.Config.scale));
    },
    
    // Session scroll remains in original SRPG MAPCHIP_WIDTH pixels. The screen sees fewer base pixels once the world is scaled.    
    // This pair of functionx take in the native, unscaled map tile and outputs the pixel x,y after it has been scaled with the world scale factor applied and relative to the current viewport/camera. 
    nativeMapTileToScaledPixelX: function (mapX)
    {
        var session = root.getCurrentSession();
        //
        var nativePixelX = mapX * this.getNativeTileWidth();
        return (this.getScaledMapViewportX() + Math.floor((nativePixelX - session.getScrollPixelX()) * GGWorldScale.Config.scale));
    },

    nativeMapTileToScaledPixelY: function (mapY)
    {
        var session = root.getCurrentSession();
        var nativePixelY = mapY * this.getNativeTileHeight();

        return (this.getScaledMapViewportY() + Math.floor((nativePixelY - session.getScrollPixelY()) * GGWorldScale.Config.scale));
    },

    // This pair of functions do the opposite of the above
    scaledPixelToNativeMapTileX: function (px)
    {
        var session = root.getCurrentSession();
        var nativePixelX = ( (px - this.getScaledMapViewportX()) / GGWorldScale.Config.scale) + session.getScrollPixelX();
        return Math.floor(nativePixelX / this.getNativeTileWidth());
    },

    scaledPixelToNativeMapTileY: function (py)
    {
        var session = root.getCurrentSession();
        var nativePixelY = ( (py - this.getScaledMapViewportY()) / GGWorldScale.Config.scale) + session.getScrollPixelY();
        return Math.floor(nativePixelY / this.getNativeTileHeight());
    },
    
    // Remember everything related to scrollshould happen in native/base space
    getNativeMaxScrollX: function ()
    {
        var mapWidthNative = CurrentMap.getWidth() * this.getNativeTileWidth();
        return Math.max(0, mapWidthNative - this.getScaledMapViewportWidthInNative());        
    },

    getNativeMaxScrollY: function ()
    {
        var mapHeightNative = CurrentMap.getHeight() * this.getNativeTileHeight();
        return Math.max(0, mapHeightNative - this.getScaledMapViewportHeightInNative());
    },

    clampScrollX: function (x)
    {
        if (x < 0)
        {
            return 0;
        }

        if (x > this.getNativeMaxScrollX())
        {
            return this.getNativeMaxScrollX();
        }

        return x;
    },

    clampScrollY: function (y)
    {
        if (y < 0)
        {
            return 0;
        }

        if (y > this.getNativeMaxScrollY())
        {
            return this.getNativeMaxScrollY();
        }

        return y;
    },

    getMouseXInScaledMap: function ()
    {
        return (root.getMouseX() - this.getScaledMapViewportX());
    },

    getMouseYInScaledMap: function ()
    {
        return (root.getMouseY() - this.getScaledMapViewportY());
    },

    isMouseInsideScaledMapViewport: function ()
    {
        var x = this.getMouseXInScaledMap();
        var y = this.getMouseYInScaledMap();

        return (
            x >= 0 &&
            y >= 0 &&
            x < this.getScaledMapViewportWidth() &&
            y < this.getScaledMapViewportHeight()
        );
    },

    isScreenVisible: function (x, y, w, h)
    {
        var screenW = root.getWindowWidth();
	    var screenH = root.getWindowHeight();

	    return (x > -w && y > -h && x < screenW && y < screenH);
    },

    setImageNearest: function (pic)
    {
        if (pic !== null)
        {
            pic.setInterpolationMode(InterpolationMode.NEARESTNEIGHBOR);
        }
    },

    withScaledWorldMatrix: function (callback)
    {
        var gm = root.getGraphicsManager();
        var oldMatrix = gm.getWorldMatrix();
        var matrix = gm.createMatrix();

        matrix.setScale(GGWorldScale.Config.scale, GGWorldScale.Config.scale, 0, 0);

        gm.setWorldMatrix(matrix);

        try
        {
            callback();
        }
        catch (e)
        {
        }

        gm.setWorldMatrix(oldMatrix);
    },

    withMapClippingDisabled: function(callback) {
        var gm = root.getGraphicsManager();

        gm.enableMapClipping(false);

        try {
            callback();
        }
        finally {
            gm.enableMapClipping(true);
        }
    }


}