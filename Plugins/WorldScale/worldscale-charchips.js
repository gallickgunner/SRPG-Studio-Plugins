/* This file patches all the code and functionality related to rendering units
 * on the map. It covers all of their idle, moving animations as well.
 */

var GGWorldScale = GGWorldScale || {}

GGWorldScale.CharChipRenderer = {
	charChipPatches: {},
	scaledCustomCharChipRenderer: {}
};

GGWorldScale.CharChipRenderer.scaledCustomCharChipRenderer = defineObject(BaseCustomCharChip,
	{
		_waitUnitTintColor: 0x888888,

		_waitUnitTintAlpha: 175,

		_waitStateComp: null,

		setupCustomCharChip: function (unit)
		{
		},

		moveCustomCharChip: function ()
		{
			return MoveResult.CONTINUE;
		},

		// Called for normal map idle units.
		drawCustomCharChip: function (cpData)
		{
			this._drawScaledDecorations(this, cpData, 'before');
			this._drawScaledCharChip(cpData);
			this._drawScaledDecorations(this, cpData, 'after');
		},

		// Called for unit menu, movement on map, and easy battles.
		drawMenuCharChip: function (cpData)
		{
			// Official example differentiates menu from movement by direction.
			// DirectionType.NULL means menu/easy static display.
			// Non-NULL means the unit is moving on the map.
			if (cpData.direction === DirectionType.NULL)
			{
				// Leave menu/easy battle unit drawing native for now.
				return;
			}

			// Moving map unit.
			var gm = root.getGraphicsManager();
			gm.enableMapClipping(false);
			this._drawScaledCharChip(cpData, true);
			gm.enableMapClipping(true);
		},

		// Official global example uses true when it wants normal menu charchips.
		// So keep this true to avoid breaking unit menus.
		isDefaultMenuUnit: function ()
		{
			return true;
		},

		getKeyword: function ()
		{
			return '';
		},

		// Custom functions added
		_drawScaledDecorations: function (renderer, cpData, phase)
		{
			var scale = GGWorldScale.Config.scale;
			
			//We need to calculate nativeMap Viewport X,Y because once we disable clipping, root.getViewport X,Y isn't reliable. It'll probably give us 0
			var nativeMapVpX = GGWorldScale.Core.getScaledMapViewportXInNative();
			var nativeMapVpY =  GGWorldScale.Core.getScaledMapViewportYInNative();

			GGWorldScale.Core.withScaledWorldMatrix(function ()
			{
				var x = cpData.xPixel;
				var y = cpData.yPixel;

				if (phase === 'before')
				{
					renderer._drawSymbol(x + nativeMapVpX, y + nativeMapVpY, cpData);
				}
				else
				{
					renderer._drawHpGauge(x + nativeMapVpX, y + nativeMapVpY, cpData);
					renderer._drawStateIcon(x + nativeMapVpX, y + nativeMapVpY, cpData);
				}
			});
		},

		_drawScaledCharChip: function (cpData)
		{			
			var unit = cpData.unit;
			var colorIndex = cpData.unitType;
			if (unit == null)
				return;

			var handle = unit.getCustomCharChipHandle();
			if (handle == null)
				handle = unit.getCharChipResourceHandle();

			if (handle == null)
				return;

			var pic = UnitRenderer._getGraphics(handle, colorIndex);

			if (pic == null)
				return;

			var animIndex = cpData.animationIndex;
			var dirIndex = cpData.direction;
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

			if (animIndex < 0 || typeof animIndex !== 'number')
				dxSrc = 0;

			if (dirRow < 0 || typeof dirRow !== 'number')
				dirRow = 4;

			xSrc = handle.getSrcX() * (width * 3) + (animIndex * width);
			ySrc = handle.getSrcY() * (height * 5) + (dirRow * height);
			
			nativeDestX = cpData.xPixel - dx;
			nativeDestY = cpData.yPixel - dy;
			scaledDestX = Math.floor(GGWorldScale.Core.nativeToScaledPixelX(nativeDestX));
			scaledDestY = Math.floor(GGWorldScale.Core.nativeToScaledPixelY(nativeDestY));
			
			destW = width * GGWorldScale.Config.scale;
			destH = height * GGWorldScale.Config.scale;			

			if (!GGWorldScale.Core.isScreenVisible(scaledDestX, scaledDestY, destW, destH))
				return;

			GGWorldScale.Core.setImageNearest(pic);

			if(cpData.isWait)
				this._drawWaitStateCharChip(pic, nativeDestX, nativeDestY, xSrc, ySrc, width, height);
			else
			{				
				pic.setAlpha(cpData.alpha);
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
				pic.setAlpha(255);
			}
		},

		_drawWaitStateCharChip: function(pic, dx, dy, sx, sy, sw, sh)
		{
			if (this._waitStateComp === null)
				this._waitStateComp = root.getGraphicsManager().createComposition();
			else
				this._waitStateComp.reset();

			this._waitStateComp.setImage(pic);
			this._waitStateComp.setSaturation(0.0);
			this._waitStateComp.composite(CompositeMode.SOURCE_OVER);
			pic.setComposition(this._waitStateComp);

			//We need to calculate nativeMap Viewport X,Y because once we disable clipping, root.getViewport X,Y isn't reliable. It'll probably give us 0
			var nativeMapVpX = GGWorldScale.Core.getScaledMapViewportXInNative();
			var nativeMapVpY =  GGWorldScale.Core.getScaledMapViewportYInNative();

			GGWorldScale.Core.withScaledWorldMatrix(function ()
			{
				pic.drawParts(
					dx + nativeMapVpX,
					dy + nativeMapVpY,
					sx,
					sy,
					sw,
					sh
				);
			});
			pic.setComposition(null);

		}

		/*
		_applyCharChipImageEffects: function (pic, unitRenderParam)
		{
			pic.setAlpha(unitRenderParam.alpha);
			pic.setDegree(unitRenderParam.degree);
			pic.setReverse(unitRenderParam.isReverse);							
		},

		_clearCharChipImageEffects: function (pic)
		{			
			pic.setAlpha(255);
			pic.setDegree(0);
			pic.setReverse(false);
		}
		*/
	}
);

GGWorldScale.CharChipRenderer.charChipPatches.patchCustomCharChipGroup = function ()
{
	var aliasGetFlag = CustomCharChipGroup.getFlag;
	CustomCharChipGroup.getFlag = function ()
	{
		return aliasGetFlag.call(this) | CustomCharChipFlag.GLOBAL;
	};
};

GGWorldScale.CharChipRenderer.charChipPatches.MapLayerUnitLayer = function ()
{
	MapLayer.drawUnitLayer = function ()
	{
		var session = root.getCurrentSession();
		var index, index2;

		this._markingPanel.drawMarkingPanel();
		this._unitRangePanel.drawRangePanel();
		this._mapChipLight.drawLight();

		index = this._counter.getAnimationIndex();
		index2 = this._counter.getAnimationIndex2();
		GGWorldScale.Core.withMapClippingDisabled(function ()
		{
			MapLayer._drawColor(EffectRangeType.MAP);
			if (session !== null)
			{
				session.drawUnitSet(true, true, true, index, index2);
			}

			MapLayer._drawColor(EffectRangeType.MAPANDCHAR);

			if (MapLayer._effectRangeType === EffectRangeType.MAPANDCHAR)
			{
				MapLayer._drawScreenColor();
			}

		})
	};
};


