var GGWorldScale = GGWorldScale || {}

GGWorldScale.LayoutControlPatches = {

    patchLayoutControl: function ()
    {
        LayoutControl.getUnitBaseX = function (unit, width)
        {
            var x = GGWorldScale.Core.nativeMapTileToScaledPixelX(unit.getMapX()) + 32;
            return this._getNormalizeX(x, width, 0);
        }

        LayoutControl.getUnitBaseY = function (unit, height)
        {
            var y = GGWorldScale.Core.nativeMapTileToScaledPixelY(unit.getMapY()) + 40;
            return this._getNormalizeY(y, height, 60);
        }

        LayoutControl.getPixelX = function (x)
        {
            return GGWorldScale.Core.nativeMapTileToScaledPixelX(x);
        };

        LayoutControl.getPixelY = function (y)
        {
            return GGWorldScale.Core.nativeMapTileToScaledPixelY(y);
        };

    }

};