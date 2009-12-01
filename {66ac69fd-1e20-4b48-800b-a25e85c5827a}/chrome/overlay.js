Components.utils.import("resource://gre/modules/JSON.jsm");

var iSearch = {
    onLoad: function() {
        gURLBar.mController = new ISearchController(gURLBar);
        //gURLBar.setAttribute("autocompletesearch", "isearch");
        //alert(gURLBar.getAttribute("autocompletesearch"));
        this.initialized = true;
    },

    onMenuItemCommand: function(){
        //var e = document.getElementById("urlbar-throbber")
        //alert(navigator.platform);
    },
};

window.addEventListener("load", function(e) { iSearch.onLoad(e); }, false); 

