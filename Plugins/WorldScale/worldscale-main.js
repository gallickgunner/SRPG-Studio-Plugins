(function ()
{
    var aliasSetup = SetupControl.setup;
    SetupControl.setup = function ()
    {
        aliasSetup.call(this);
        if (!GGWorldScale.Config.enabled || GGWorldScale.Config.scale == 1)
            return;

        GGWorldScale.Config.setScale();
        runAllPatches(GGWorldScale.CharChipRenderer.patches);
        runAllPatches(GGWorldScale.MapChipRenderer.patches);
        runAllPatches(GGWorldScale.Navigation.patches);
        //runAllPatches(GGWorldScale.LayoutControlPatches);

        //root.setGlobalCustomRenderer(GGWorldScale.CharChipRenderer.scaledCustomCharChipRenderer);
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