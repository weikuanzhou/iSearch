//@line 37 "/builds/moz2_slave/linux_build/build/toolkit/mozapps/extensions/content/blocklist.js"

var gArgs;

function init() {
  var hasHardBlocks = false;
  var hasSoftBlocks = false;
  gArgs = window.arguments[0].wrappedJSObject;

  var richlist = document.getElementById("addonList");
  var list = gArgs.list;
  list.sort(function(a, b) { return String.localeCompare(a.name, b.name); });
  for (let i = 0; i < list.length; i++) {
    let item = document.createElement("richlistitem");
    item.setAttribute("name", list[i].name);
    item.setAttribute("version", list[i].version);
    item.setAttribute("icon", list[i].icon);
    if (list[i].blocked) {
      item.setAttribute("class", "hardBlockedAddon");
      hasHardBlocks = true;
    }
    else {
      item.setAttribute("class", "softBlockedAddon");
      hasSoftBlocks = true;
    }
    richlist.appendChild(item);
  }

  if (hasHardBlocks && hasSoftBlocks)
    document.getElementById("bothMessage").hidden = false;
  else if (hasHardBlocks)
    document.getElementById("hardBlockMessage").hidden = false;
  else
    document.getElementById("softBlockMessage").hidden = false;

  var formatter = Components.classes["@mozilla.org/toolkit/URLFormatterService;1"]
                            .getService(Components.interfaces.nsIURLFormatter);
  var url = formatter.formatURLPref("extensions.blocklist.detailsURL");
  var link = document.getElementById("moreInfo");
  link.setAttribute("href", url);
}

function accept() {
  gArgs.restart = true;
  var list = gArgs.list;
  var items = document.getElementById("addonList").childNodes;
  for (let i = 0; i < list.length; i++) {
    if (!list[i].blocked)
      list[i].disable = items[i].checked;
  }
  return true;
}
