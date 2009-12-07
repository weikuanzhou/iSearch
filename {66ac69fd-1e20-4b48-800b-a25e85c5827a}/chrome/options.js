const browser = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");

function saveOptions(){
}

function initOptions(){
    document.getElementById('txtOrder').value = browser.orderStr;
}
