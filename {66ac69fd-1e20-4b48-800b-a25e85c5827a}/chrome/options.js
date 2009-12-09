const browser = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");

function saveOptions(){
    var txtOrder = document.getElementById('txtOrder').value;
    if ('' == txtOrder){
        txtOrder = 'HGBHGBHGBHGBHGBHGBHGB';
    }
    browser.Prefs.setCharPref(browser.prefISearchOrderString, txtOrder);
    browser.orderStr = txtOrder;
}

function initOptions(){
    document.getElementById('txtOrder').value = browser.Prefs.getCharPref(browser.prefISearchOrderString);
}

