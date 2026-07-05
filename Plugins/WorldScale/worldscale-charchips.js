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
			var gm = root.getGraphicsManager();
			gm.enableMapClipping(false);
			this._drawScaledDecorations(this, cpData, 'before');
			this._drawScaledCharChip(cpData);
			this._drawScaledDecorations(this, cpData, 'after');
			gm.enableMapClipping(true);
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
			GGWorldScale.Core.withScaledWorldMatrix(function ()
			{
				var x = cpData.xPixel;
				var y = cpData.yPixel;

				if (phase === 'before')
				{
					renderer._drawSymbol(x, y, cpData);
				}
				else
				{
					renderer._drawHpGauge(x, y, cpData);
					renderer._drawStateIcon(x, y, cpData);
				}
			});
		},

		_drawScaledCharChip: function (cpData)
		{
			var param;
			param = StructureBuilder.buildUnitRenderParam();

			UnitRenderer._setDefaultParam(cpData.unit, param);

			param.isScroll = true;
			param.animationIndex = cpData.animationIndex;
			param.direction = cpData.direction;
			param.alpha = cpData.alpha;

			// Set custom parameter from Native custom charchip data that gives wait state directly.
			param.isWaitState = cpData.isWait;

			var dx, dy, dxSrc, dySrc;
			var directionArray = [4, 1, 2, 3, 0];
			var handle = param.handle;
			var width = GraphicsFormat.CHARCHIP_WIDTH;
			var height = GraphicsFormat.CHARCHIP_HEIGHT;
			var tileSize = UnitRenderer._getTileSize(param);
			var xSrc, ySrc, pic;
			var nativeDestX, nativeDestY, scaledDestX, scaledDestY, destW, destH;

			if (handle === null)
			{
				return;
			}

			pic = UnitRenderer._getGraphics(handle, param.colorIndex);

			if (pic === null)
			{
				return;
			}

			xSrc = handle.getSrcX() * (width * 3);
			ySrc = handle.getSrcY() * (height * 5);

			dx = Math.floor((width - tileSize.width) / 2);
			dy = Math.floor((height - tileSize.height) / 2);

			dxSrc = param.animationIndex;
			dySrc = directionArray[param.direction];

			if (dxSrc < 0 || typeof dxSrc !== 'number')
			{
				dxSrc = 0;
			}

			if (dySrc < 0 || typeof dySrc !== 'number')
			{
				dySrc = 4;
			}

			nativeDestX = cpData.xPixel - dx;
			nativeDestY = cpData.yPixel - dy;
			scaledDestX = Math.floor(GGWorldScale.Core.nativeToScaledPixelX(nativeDestX));
			scaledDestY = Math.floor(GGWorldScale.Core.nativeToScaledPixelY(nativeDestY));
			destW = width * GGWorldScale.Config.scale;
			destH = height * GGWorldScale.Config.scale;
			xSrc = xSrc + (dxSrc * width);
			ySrc = ySrc + (dySrc * height)

			if (!GGWorldScale.Core.isScreenVisible(scaledDestX, scaledDestY, destW, destH))
			{
				return;
			}

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
			}
		},

		_drawWaitStateCharChip: function(pic, dx, dy, sx, sy, sw, sh)
		{
			if (this._waitStateComp === null)
				this._waitStateComp = root.getGraphicsManager().createComposition();
			else
				this._waitStateComp.reset();

			this._waitStateComp.setImage(pic);
			this._waitStateComp.setSaturation(0.1);

			// Optional: darken/lighten the grayscale result.
			// 1.0 = unchanged brightness.
			// comp.setBrightness(0.85);
			this._waitStateComp.composite(CompositeMode.SOURCE_OVER);
			pic.setComposition(this._waitStateComp);

			GGWorldScale.Core.withScaledWorldMatrix(function ()
			{
				pic.drawParts(
					dx,
					dy,
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


