//@line 37 "/builds/moz2_slave/linux_build/build/browser/components/places/content/bookmarksPanel.js"

function init() {
  document.getElementById("bookmarks-view").place =
    "place:queryType=1&folder=" + window.top.PlacesUIUtils.allBookmarksFolderId;
}

function searchBookmarks(aSearchString) {
  var tree = document.getElementById('bookmarks-view');
  if (!aSearchString)
    tree.place = tree.place;
  else
    tree.applyFilter(aSearchString,
                     [PlacesUtils.bookmarksMenuFolderId,
                      PlacesUtils.unfiledBookmarksFolderId,
                      PlacesUtils.toolbarFolderId]);
}

window.addEventListener("SidebarFocused",
                        function()
                          document.getElementById("search-box").focus(),
                        false);
