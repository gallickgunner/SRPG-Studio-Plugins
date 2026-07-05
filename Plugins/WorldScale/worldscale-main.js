(function ()
{
    var aliasSetup = SetupControl.setup;
    SetupControl.setup = function ()
    {
        aliasSetup.call(this);
        if(!GGWorldScale.Config.enabled)
            return;
        runAllPatches(GGWorldScale.CharChipRenderer.charChipPatches);
        runAllPatches(GGWorldScale.MapChipRenderer.mapChipPatches);
        runAllPatches(GGWorldScale.NavigationPatches);
        //runAllPatches(GGWorldScale.LayoutControlPatches);

        root.setGlobalCustomRenderer(GGWorldScale.CharChipRenderer.scaledCustomCharChipRenderer);
    };
})();

function runAllPatches(obj)
{
    for (var key in obj)
    {
        if (Object.prototype.hasOwnProperty.call(obj, key))
        {
            if (typeof obj[key] === "function")
            {
                obj[key]();
            }
        }
    }
}