(function() {
	var aliasScriptCallInitialize = ScriptCall_Initialize;

	ScriptCall_Initialize = function(startupInfo) 
	{
		
		// Set your desired window resolution here
		var windowRes = 
		{
			width: 1920,
			height: 1080
		};

		startupInfo.setGameAreaWidth(windowRes.width);
		startupInfo.setGameAreaHeight(windowRes.height);

		if (aliasScriptCallInitialize !== undefined)
			aliasScriptCallInitialize.call(this, startupInfo);
	};
}) ()


