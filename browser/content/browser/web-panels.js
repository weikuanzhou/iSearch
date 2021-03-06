//@line 39 "/builds/moz2_slave/linux_build/build/browser/base/content/web-panels.js"

const NS_ERROR_MODULE_NETWORK = 2152398848;
const NS_NET_STATUS_READ_FROM = NS_ERROR_MODULE_NETWORK + 8;
const NS_NET_STATUS_WROTE_TO  = NS_ERROR_MODULE_NETWORK + 9;

function getPanelBrowser()
{
    return document.getElementById("web-panels-browser");
}

var panelProgressListener = {
    onProgressChange : function (aWebProgress, aRequest,
                                 aCurSelfProgress, aMaxSelfProgress,
                                 aCurTotalProgress, aMaxTotalProgress) {
    },
    
    onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
    {
        if (!aRequest)
          return;

        //ignore local/resource:/chrome: files
        if (aStatus == NS_NET_STATUS_READ_FROM || aStatus == NS_NET_STATUS_WROTE_TO)
           return;

        if (aStateFlags & Ci.nsIWebProgressListener.STATE_START && 
            aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK) {
            window.parent.document.getElementById('sidebar-throbber').setAttribute("loading", "true");
        }
        else if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
                aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK) {
            window.parent.document.getElementById('sidebar-throbber').removeAttribute("loading");
        }
    }
    ,

    onLocationChange : function(aWebProgress, aRequest, aLocation) {
        UpdateBackForwardCommands(getPanelBrowser().webNavigation);
    },

    onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage) {
    },

    onSecurityChange : function(aWebProgress, aRequest, aState) { 
    },

    QueryInterface : function(aIID)
    {
        if (aIID.equals(Ci.nsIWebProgressListener) ||
            aIID.equals(Ci.nsISupportsWeakReference) ||
            aIID.equals(Ci.nsISupports))
            return this;
        throw Cr.NS_NOINTERFACE;
    }
};

var gLoadFired = false;
function loadWebPanel(aURI) {
    var panelBrowser = getPanelBrowser();
    if (gLoadFired) {
        panelBrowser.webNavigation
                    .loadURI(aURI, nsIWebNavigation.LOAD_FLAGS_NONE,
                             null, null, null);
    }
    panelBrowser.setAttribute("cachedurl", aURI);
}

function load()
{
    var panelBrowser = getPanelBrowser();
    panelBrowser.webProgress.addProgressListener(panelProgressListener,
                                                 Ci.nsIWebProgress.NOTIFY_ALL);
    if (panelBrowser.getAttribute("cachedurl")) {
        panelBrowser.webNavigation
                    .loadURI(panelBrowser.getAttribute("cachedurl"),
                             nsIWebNavigation.LOAD_FLAGS_NONE, null,
                             null, null);
    }

    gLoadFired = true;
}

function unload()
{
    getPanelBrowser().webProgress.removeProgressListener(panelProgressListener);
}

function PanelBrowserStop()
{
    getPanelBrowser().webNavigation.stop(nsIWebNavigation.STOP_ALL)
}

function PanelBrowserReload()
{
    getPanelBrowser().webNavigation
                     .sessionHistory
                     .QueryInterface(nsIWebNavigation)
                     .reload(nsIWebNavigation.LOAD_FLAGS_NONE);
}
