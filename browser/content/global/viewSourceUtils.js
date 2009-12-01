//@line 38 "/builds/moz2_slave/linux_build/build/toolkit/components/viewsource/content/viewSourceUtils.js"

/*
 * To keep the global namespace safe, don't define global variables and 
 * functions in this file.
 *
 * This file silently depends on contentAreaUtils.js for
 * getDefaultFileName, getNormalizedLeafName and getDefaultExtension
 */

var gViewSourceUtils = {

  mnsIWebBrowserPersist: Components.interfaces.nsIWebBrowserPersist,
  mnsIWebProgress: Components.interfaces.nsIWebProgress,
  mnsIWebPageDescriptor: Components.interfaces.nsIWebPageDescriptor,

  // Opens view source
  viewSource: function(aURL, aPageDescriptor, aDocument, aLineNumber)
  {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
    if (prefs.getBoolPref("view_source.editor.external"))
      this.openInExternalEditor(aURL, aPageDescriptor, aDocument, aLineNumber);
    else
      this.openInInternalViewer(aURL, aPageDescriptor, aDocument, aLineNumber);
  },

  // Opens the interval view source viewer
  openInInternalViewer: function(aURL, aPageDescriptor, aDocument, aLineNumber)
  {
    // try to open a view-source window while inheriting the charset (if any)
    var charset = null;
    var isForcedCharset = false;
    if (aDocument) {
      charset = "charset=" + aDocument.characterSet;
      try { 
        isForcedCharset =
          aDocument.defaultView
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindowUtils)
                   .docCharsetIsForced;
      } catch (ex) {
      }
    }
    openDialog("chrome://global/content/viewSource.xul",
               "_blank",
               "all,dialog=no",
               aURL, charset, aPageDescriptor, aLineNumber, isForcedCharset);
  },

  // aCallBack is a function accepting two arguments - result (true=success) and a data object
  // It defaults to openInInternalViewer if undefined.
  openInExternalEditor: function(aURL, aPageDescriptor, aDocument, aLineNumber, aCallBack)
  {
    var data = {url: aURL, pageDescriptor: aPageDescriptor, doc: aDocument,
                lineNumber: aLineNumber};

    try {
      var editor = this.getExternalViewSourceEditor();    
      if (!editor) {
        this.handleCallBack(aCallBack, false, data);
        return;
      }

      // make a uri
      var ios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
      var charset = aDocument ? aDocument.characterSet : null;
      var uri = ios.newURI(aURL, charset, null);
      data.uri = uri;

      var path;
      var contentType = aDocument ? aDocument.contentType : null;
      if (uri.scheme == "file") {    
        // it's a local file; we can open it directly
        path = uri.QueryInterface(Components.interfaces.nsIFileURL).file.path;
        editor.run(false, [path], 1);
        this.handleCallBack(aCallBack, true, data);
      } else {
        // set up the progress listener with what we know so far
        this.viewSourceProgressListener.editor = editor;
        this.viewSourceProgressListener.callBack = aCallBack;
        this.viewSourceProgressListener.data = data;      
        if (!aPageDescriptor) {
          // without a page descriptor, loadPage has no chance of working. download the file.
          var file = this.getTemporaryFile(uri, aDocument, contentType);
          this.viewSourceProgressListener.file = file;

          var webBrowserPersist = Components
                                  .classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                                  .createInstance(this.mnsIWebBrowserPersist);
          // the default setting is to not decode. we need to decode.
          webBrowserPersist.persistFlags = this.mnsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
          webBrowserPersist.progressListener = this.viewSourceProgressListener;
          webBrowserPersist.saveURI(uri, null, null, null, null, file);

          // register the file to be deleted on app exit
          Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"]
                    .getService(Components.interfaces.nsPIExternalAppLauncher)
                    .deleteTemporaryFileOnExit(file);
        } else {
          // we'll use nsIWebPageDescriptor to get the source because it may not have to refetch
          // the file from the server
          var webShell = Components.classes["@mozilla.org/webshell;1"].createInstance();
          this.viewSourceProgressListener.webShell = webShell;
          var progress = webShell.QueryInterface(this.mnsIWebProgress);
          progress.addProgressListener(this.viewSourceProgressListener,
                                       this.mnsIWebProgress.NOTIFY_STATE_DOCUMENT);
          var pageLoader = webShell.QueryInterface(this.mnsIWebPageDescriptor);    
          pageLoader.loadPage(aPageDescriptor, this.mnsIWebPageDescriptor.DISPLAY_AS_SOURCE);
        }
      }
    } catch (ex) {
      // we failed loading it with the external editor.
      Components.utils.reportError(ex);
      this.handleCallBack(aCallBack, false, data);
      return;
    }
  },

  // Default callback - opens the internal viewer if the external editor failed
  internalViewerFallback: function(result, data)
  {
    if (!result) {
      this.openInInternalViewer(data.url, data.pageDescriptor, data.doc, data.lineNumber);
    }
  },

  // Calls the callback, keeping in mind undefined or null values.
  handleCallBack: function(aCallBack, result, data)
  {
    // ifcallback is undefined, default to the internal viewer
    if (aCallBack === undefined) {
      this.internalViewerFallback(result, data);
    } else if (aCallBack) {
      aCallBack(result, data);
    }
  },

  // Returns nsIProcess of the external view source editor or null
  getExternalViewSourceEditor: function()
  {
    try {
      let prefPath =
          Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch)
                    .getCharPref("view_source.editor.path");
      let viewSourceAppPath =
              Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
      viewSourceAppPath.initWithPath(prefPath);
      let editor = Components.classes['@mozilla.org/process/util;1']
                             .createInstance(Components.interfaces.nsIProcess);
      editor.init(viewSourceAppPath);

      return editor;
    }
    catch (ex) {
      Components.utils.reportError(ex);
    }

    return null;
  },

  viewSourceProgressListener: {

    mnsIWebProgressListener: Components.interfaces.nsIWebProgressListener,

    QueryInterface: function(aIID) {
     if (aIID.equals(this.mnsIWebProgressListener) ||
         aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
         aIID.equals(Components.interfaces.nsISupports))
       return this;
     throw Components.results.NS_NOINTERFACE;
    },

    destroy: function() {
        this.webShell = null;
        this.editor = null;
        this.callBack = null;
        this.data = null;
        this.file = null;
    },

    onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
      // once it's done loading...
      if ((aFlag & this.mnsIWebProgressListener.STATE_STOP) && aStatus == 0) {
        try {
          if (!this.file) {
            // it's not saved to file yet, it's in the webshell

            // get a temporary filename using the attributes from the data object that
            // openInExternalEditor gave us
            this.file = gViewSourceUtils.getTemporaryFile(this.data.uri, this.data.doc, 
                                                          this.data.doc.contentType);

            // we have to convert from the source charset.
            var webNavigation = this.webShell.QueryInterface(Components.interfaces.nsIWebNavigation);
            var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIFileOutputStream);
            foStream.init(this.file, 0x02 | 0x08 | 0x20, 0664, 0); // write | create | truncate
            var coStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIConverterOutputStream);
            coStream.init(foStream, this.data.doc.characterSet, 0, null);

            // write the source to the file
            coStream.writeString(webNavigation.document.body.textContent);
          
            // clean up
            coStream.close();
            foStream.close();

            // register the file to be deleted on app exit
            Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"]
                      .getService(Components.interfaces.nsPIExternalAppLauncher)
                      .deleteTemporaryFileOnExit(this.file);
          }

          // Determine the command line arguments to pass to the editor.
          // We currently support a %LINE% placeholder which is set to the passed
          // line number (or to 0 if there's none)
          var editorArgs = [];
          var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
          var args = prefs.getCharPref("view_source.editor.args");
          if (args) {
            args = args.replace("%LINE%", this.data.lineNumber || "0");
            // add the arguments to the array (keeping quoted strings intact)
            const argumentRE = /"([^"]+)"|(\S+)/g;
            while (argumentRE.test(args))
              editorArgs.push(RegExp.$1 || RegExp.$2);
          }
          editorArgs.push(this.file.path);
          this.editor.run(false, editorArgs, editorArgs.length);

          gViewSourceUtils.handleCallBack(this.callBack, true, this.data);
        } catch (ex) {
          // we failed loading it with the external editor.
          Components.utils.reportError(ex);
          gViewSourceUtils.handleCallBack(this.callBack, false, this.data);
        } finally {
          this.destroy();
        }
      }
      return 0;
    },

    onLocationChange: function() {return 0;},
    onProgressChange: function() {return 0;},
    onStatusChange: function() {return 0;},
    onSecurityChange: function() {return 0;},
    onLinkIconAvailable: function() {return 0;},

    webShell: null,
    editor: null,
    callBack: null,
    data: null,
    file: null
  },

  // returns an nsIFile for the passed document in the system temp directory
  getTemporaryFile: function(aURI, aDocument, aContentType) {
    // include contentAreaUtils.js in our own context when we first need it
    if (!this._caUtils) {
      var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                   .getService(Components.interfaces.mozIJSSubScriptLoader);
      this._caUtils = {};
      scriptLoader.loadSubScript("chrome://global/content/contentAreaUtils.js", this._caUtils);
    }

    var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                                .getService(Components.interfaces.nsIProperties);
    var tempFile = fileLocator.get("TmpD", Components.interfaces.nsIFile);
    var fileName = this._caUtils.getDefaultFileName(null, aURI, aDocument, aContentType);
    var extension = this._caUtils.getDefaultExtension(fileName, aURI, aContentType);
    var leafName = this._caUtils.getNormalizedLeafName(fileName, extension);
    tempFile.append(leafName);
    return tempFile;
  }
}
