/* This file patches all the code and functionality related to rendering units
 * on the map. 
 */

var GGWorldScale = GGWorldScale || {}

GGWorldScale.CharChipRenderer = {
	_cachedUnitLayer: null,
	_cacheW: 0,
	_cacheH: 0,
	patches: {},
	scaledCustomCharChipRenderer: {}
};


GGWorldScale.CharChipRenderer.createCache = function ()
{
	var gm = root.getGraphicsManager();
	var w = GGWorldScale.Core.getScaledMapViewportWidthInNative();
	var h = GGWorldScale.Core.getScaledMapViewportHeightInNative();

	if (this._cachedUnitLayer != null && this._cacheW === w && this._cacheH === h)
	{
		return;
	}

	this._cacheW = w;
	this._cacheH = h;
	this._cachedUnitLayer = gm.createCacheGraphics(w, h);

	if (this._cachedUnitLayer == null)
	{
		throw new Error('Unit layer cache generation failed.');
	}

	GGWorldScale.Core.setImageNearest(this._cachedUnitLayer);
};

GGWorldScale.CharChipRenderer.drawScaledUnitLayerFromCache = function (index, index2)
{
	var session = root.getCurrentSession();
	var gm = root.getGraphicsManager();
	var destX, destY, destW, destH;

	GGWorldScale.CharChipRenderer.createCache();

	gm.setRenderCache(this._cachedUnitLayer);
	gm.fillRange(0, 0, this._cacheW, this._cacheH, 0x000000, 0);
	session.drawUnitSet(true, true, true, index, index2);
	gm.resetRenderCache();

	destX = GGWorldScale.Core.getScaledMapViewportX();
	destY = GGWorldScale.Core.getScaledMapViewportY();
	destW = GGWorldScale.Core.getScaledMapViewportWidth();
	destH = GGWorldScale.Core.getScaledMapViewportHeight();

	GGWorldScale.Core.setImageNearest(this._cachedUnitLayer);

	this._cachedUnitLayer.drawStretchParts(
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



///////////////////// PATCHES //////////////////////
GGWorldScale.CharChipRenderer.patches.patchUnitRenderer = function ()
{
	var aliasDrawCharChip = UnitRenderer.drawCharChip;

	UnitRenderer.drawCharChip = function (x, y, unitRenderParam)
	{
		if (unitRenderParam.direction === DirectionType.NULL)
		{
			aliasDrawCharChip.call(this, x, y, unitRenderParam);
			return;
		}
		var gm = root.getGraphicsManager();
		gm.enableMapClipping(false);

		var handle = unitRenderParam.handle;
		if (handle == null)
			return;

		var pic = UnitRenderer._getGraphics(handle, unitRenderParam.colorIndex);

		if (pic == null)
			return;

		var animIndex = unitRenderParam.animationIndex;
		var dirIndex = unitRenderParam.direction;
		var directionArray = [4, 1, 2, 3, 0];

		var width = GraphicsFormat.CHARCHIP_WIDTH;
		var height = GraphicsFormat.CHARCHIP_HEIGHT;
		var tileW = GraphicsFormat.MAPCHIP_WIDTH;
		var tileH = GraphicsFormat.MAPCHIP_HEIGHT;

		var dx = Math.floor((width - tileW) / 2);
		var dy = Math.floor((height - tileH) / 2);

		var xSrc, ySrc;
		var nativeDestX, nativeDestY, scaledDestX, scaledDestY, destW, destH;

		var dirRow = directionArray[dirIndex];

		xSrc = handle.getSrcX() * (width * 3) + (animIndex * width);
		ySrc = handle.getSrcY() * (height * 5) + (dirRow * height);

		nativeDestX = x - dx;
		nativeDestY = y - dy;
		scaledDestX = Math.floor(GGWorldScale.Core.nativeToScaledPixelX(nativeDestX));
		scaledDestY = Math.floor(GGWorldScale.Core.nativeToScaledPixelY(nativeDestY));

		destW = width * GGWorldScale.Config.scale;
		destH = height * GGWorldScale.Config.scale;

		if (!GGWorldScale.Core.isScreenVisible(scaledDestX, scaledDestY, destW, destH))
			return;

		GGWorldScale.Core.setImageNearest(pic);
		pic.setAlpha(unitRenderParam.alpha);
		pic.setDegree(unitRenderParam.degree);
		pic.setReverse(unitRenderParam.isReverse);
		pic.drawStretchParts(
			scaledDestX,
			scaledDestY,
			destW,
			destH,
			xSrc,
			ySrc,
			width,
			height
		);
		gm.enableMapClipping(true);
	};
};

GGWorldScale.CharChipRenderer.patches.MapLayerUnitLayer = function ()
{
	MapLayer.drawUnitLayer = function ()
	{
		var self = this;
		var session = root.getCurrentSession();
		var index, index2;

		this._markingPanel.drawMarkingPanel();
		this._unitRangePanel.drawRangePanel();
		this._mapChipLight.drawLight();

		index = this._counter.getAnimationIndex();
		index2 = this._counter.getAnimationIndex2();

		GGWorldScale.Core.withMapClippingDisabled(function ()
		{
			self._drawColor(EffectRangeType.MAP);
			if (session !== null)
				GGWorldScale.CharChipRenderer.drawScaledUnitLayerFromCache(index, index2);

			self._drawColor(EffectRangeType.MAPANDCHAR);

			if (self._effectRangeType === EffectRangeType.MAPANDCHAR)
			{
				self._drawScreenColor();
			}

		})
	};
};


