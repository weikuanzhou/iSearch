//@line 39 "/builds/moz2_slave/linux_build/build/browser/components/places/content/sidebarUtils.js"

var SidebarUtils = {
  handleTreeClick: function SU_handleTreeClick(aTree, aEvent, aGutterSelect) {
    // right-clicks are not handled here
    if (aEvent.button == 2)
      return;

    var tbo = aTree.treeBoxObject;
    var row = { }, col = { }, obj = { };
    tbo.getCellAt(aEvent.clientX, aEvent.clientY, row, col, obj);

    if (row.value == -1 || obj.value == "twisty")
      return;

    var mouseInGutter = false;
    if (aGutterSelect) {
      var x = { }, y = { }, w = { }, h = { };
      tbo.getCoordsForCellItem(row.value, col.value, "image",
                               x, y, w, h);
      mouseInGutter = aEvent.clientX < x.value;
    }

//@line 64 "/builds/moz2_slave/linux_build/build/browser/components/places/content/sidebarUtils.js"
    var modifKey = aEvent.ctrlKey || aEvent.shiftKey;
//@line 66 "/builds/moz2_slave/linux_build/build/browser/components/places/content/sidebarUtils.js"

    var isContainer = tbo.view.isContainer(row.value);
    var openInTabs = isContainer &&
                     (aEvent.button == 1 ||
                      (aEvent.button == 0 && modifKey)) &&
                     PlacesUtils.hasChildURIs(tbo.view.nodeForTreeIndex(row.value));

    if (aEvent.button == 0 && isContainer && !openInTabs) {
      tbo.view.toggleOpenState(row.value);
      return;
    }
    else if (!mouseInGutter && openInTabs &&
            aEvent.originalTarget.localName == "treechildren") {
      tbo.view.selection.select(row.value);
      PlacesUIUtils.openContainerNodeInTabs(aTree.selectedNode, aEvent);
    }
    else if (!mouseInGutter && !isContainer &&
             aEvent.originalTarget.localName == "treechildren") {
      // Clear all other selection since we're loading a link now. We must
      // do this *before* attempting to load the link since openURL uses
      // selection as an indication of which link to load.
      tbo.view.selection.select(row.value);
      PlacesUIUtils.openNodeWithEvent(aTree.selectedNode, aEvent);
    }
  },

  handleTreeKeyPress: function SU_handleTreeKeyPress(aEvent) {
    if (aEvent.keyCode == KeyEvent.DOM_VK_RETURN)
      PlacesUIUtils.openNodeWithEvent(aEvent.target.selectedNode, aEvent);
  },

  /**
   * The following function displays the URL of a node that is being
   * hovered over.
   */
  handleTreeMouseMove: function SU_handleTreeMouseMove(aEvent) {
    if (aEvent.target.localName != "treechildren")
      return;

    var tree = aEvent.target.parentNode;
    var tbo = tree.treeBoxObject;
    var row = { }, col = { }, obj = { };
    tbo.getCellAt(aEvent.clientX, aEvent.clientY, row, col, obj);

    // row.value is -1 when the mouse is hovering an empty area within the tree.
    // To avoid showing a URL from a previously hovered node,
    // for a currently hovered non-url node, we must clear the URL from the
    // status bar in these cases.
    if (row.value != -1) {
      var cell = tree.view.nodeForTreeIndex(row.value);
      if (PlacesUtils.nodeIsURI(cell))
        window.top.XULBrowserWindow.setOverLink(cell.uri, null);
      else
        this.clearURLFromStatusBar();
    }
    else
      this.clearURLFromStatusBar();
  },

  clearURLFromStatusBar: function SU_clearURLFromStatusBar() {
    window.top.XULBrowserWindow.setOverLink("", null);  
  }
};
