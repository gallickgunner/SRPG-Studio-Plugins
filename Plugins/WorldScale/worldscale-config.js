var GGWorldScale = GGWorldScale || {}

GGWorldScale.Config = {
	enabled: true,
	scale: 1,
	resArray: [
		{
			width: 640,
			height: 480,
			scale: 1
		},
		{
			width: 800,
			height: 600,
			scale: 1
		},
		{
			width: 1280,
			height: 720,
			scale: 2
		},
		{
			width: 1920,
			height: 1080,
			scale: 2
		},
		{
			width: 2560,
			height: 1440,
			scale: 2
		},
		{
			width: 3840,
			height: 2160,
			scale: 3
		}
	]
};

GGWorldScale.Config.setScale = function ()
{
	var width = root.getWindowWidth();
	var height = root.getWindowHeight();
	
	for (var i = 0; i < GGWorldScale.Config.resArray.length; i++)
	{
		var obj = GGWorldScale.Config.resArray[i];
		
		if (obj.width === width)
		{
			GGWorldScale.Config.scale = obj.scale;
			return;
		}
	}
}