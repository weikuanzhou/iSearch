Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
// Components.utils.import("resource://gre/modules/JSON.jsm");

const CLASS_ID = Components.ID("6124daa1-71a2-4d1a-ad90-01ca1c08e323");
const CLASS_NAME = "ISearch, interactive search for url bar";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=isearch";
const STEP = 3;
const MAXS = 20;

const orderStr = "HGYHGYHGYHGYHGYHGYHGYHGYHGYHGYHGY"

const htmlReplaceThese = new Array('&amp;','&quot;', '&#39;', '&gt;');
const htmlReplaceWith = new Array('&','"', '\'', '>');

const STATUS_NONE = 1;
const STATUS_SEARCHING = 2;
const STATUS_COMPLETE_NO_MATCH = 3;
const STATUS_COMPLETE_MATCH = 4;
const ACResult = Ci.nsIAutoCompleteResult;

function Log(msg){
    var consoleService = Cc["@mozilla.org/consoleservice;1"]
                            .getService(Ci.nsIConsoleService);
    consoleService.logStringMessage(msg);
}

// Implements nsIAutoCompleteResult
function ISearchResult(searchString, searchResult,
                       defaultIndex, errorDescription) {
  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = [];
}

ISearchResult.prototype = {
    _searchString: "",
    _searchResult: 0,
    _defaultIndex: 0,
    _errorDescription: "",
    _results: [],

    get searchString() {
        return this._searchString;
    },

    get searchResult() {
        return this._searchResult;
    },

    get defaultIndex() {
        return this._defaultIndex;
    },

    get errorDescription() {
        return this._errorDescription;
    },

    get matchCount() {
        return this._results.length;
    },

    getValueAt: function(index) {
        return this._results[index].url;
    },

    getCommentAt: function(index) {
        return this._results[index].title;
    },

    getImageAt: function(index) {
        return this._results[index].image;
    },

    getStyleAt: function(index) {
        try {
            return this._results[index].style;
        } catch(e){
            return null;
        }
    },

    QueryInterface: function(aIID) {
        if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
        return this;
    }
};

function parseGoogle(isearch){
    this._iSearch   = isearch;
    this._id = 'G';
}

parseGoogle.prototype = {
    _results: [],
    _pr: null,
    _iSearch: null,

    fakeUrl: function(str){
        return 'http://ajax.googleapis.com/ajax/services/search/'
            + 'web?q=intitle%3A"' + str + '"+OR+inurl%3A"' + str + '"&v=1.0';
    },
    startSearch: function(url){
        this._searchString = url;
        url.replace(" ", "+");
        url = this.fakeUrl(url);
        this._pr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Ci.nsIXMLHttpRequest);
        this._pr.QueryInterface(Ci.nsIDOMEventTarget);
        var s = this;
        this._pr.addEventListener("load", function(e){s.onOK(e);}, false);
        this._pr.addEventListener("error",function(e){s.onError(e);}, false);
        this._pr.open('GET', url, true);
        this._pr.send(null);
    },
    stopSearch: function(){
        this._pr.abort();
    },
    onOK: function(){
        this.parseOut(this._pr.responseText);
        this._iSearch.onSearchResult(this, this._results);
    },
    onError: function(){
    },
    parseOut: function(str){
        var host = new RegExp("(https*://.+?)/");
        var data;
        this._results = new ISearchResult(this._searchString, 
                STATUS_COMPLETE_MATCH, 0, "");
        try {
            var JSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
            data = JSON.decode(str);
        } catch (e) {
            return;
        }
        var results = data.responseData.results;

        for(var i=0; i<results.length; i++){
            var r = results[i];
            var o = {};
            o.title = r.titleNoFormatting;
            for(j=0; j<htmlReplaceThese.length; j++){
                o.title = o.title.replace(htmlReplaceThese[j], 
                            htmlReplaceWith[j], "g");
            }
            o.url = r.unescapedUrl;
            var mat = host.exec(o.url);
            if( null == mat ){
                mat = [];
                mat[1] = o.url;
            }
            o.image = mat[1] + "/favicon.ico";
            o.style = 'suggesthint Google isearch';
            this._results._results.push(o);
        }
    },
};

function parseYahoo(isearch){
    this._iSearch   = isearch;
    this._id = 'Y';
}

parseYahoo.prototype = {
    _results: [],
    _pr: null,
    _iSearch: null,

    fakeUrl: function(str){
        // return 'http://search.yahoo.com/search?p=' + str + '&toggle=1&cop=mss&ei=UTF-8';
        return 'http://www.bing.com/search?q=' + str;
    },
    startSearch: function(url){
        this._searchString = url;
        url.replace(" ", "+");
        url = this.fakeUrl(url);
        this._pr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Ci.nsIXMLHttpRequest);
        this._pr.QueryInterface(Ci.nsIDOMEventTarget);
        var s = this;
        this._pr.addEventListener("load", function(e){s.onOK(e);}, false);
        this._pr.addEventListener("error",function(e){s.onError(e);}, false);

        this._pr.open('GET', url, true);
        this._pr.send(null);
    },
    stopSearch: function(){
        this._pr.abort();
    },
    onOK: function(){
        this.parseOut(this._pr.responseText);
        this._iSearch.onSearchResult(this, this._results);
    },
    onError: function(){
    },
    parseOut: function(str){
        var re = new RegExp('<div class="sb_tlst"><h3>(.+?)</h3>.*?</cite>', "g");
        var url_re = new RegExp('<cite>(.*?)</cite>');
        var host = new RegExp("(https*://)?([^/]+)/?");
        var mat, txt;
        this._results = new ISearchResult(this._searchString, 
                STATUS_COMPLETE_MATCH, 0, "");
        while((mat = re.exec(str)) != null){
            var o = {};
            txt = this.trimBlank(mat[1]);
            o.title = txt;
            for(var j=0; j<htmlReplaceThese.length; j++){
                o.title = o.title.replace(htmlReplaceThese[j], 
                            htmlReplaceWith[j], "g");
            }

            mat = url_re.exec(mat);
            if(mat == null) continue;
            txt = this.trimBlank(mat[1]);
            txt = txt.replace('%3a', ':', "g");
            o.url = txt;

            mat = host.exec(txt);
            if (mat[2] != '') {
                txt = mat[2];
            }
            if (mat[1] == '') {
                txt = "http://" + txt;
            } 
            o.image = "http://" + txt + "/favicon.ico";

            o.style = 'suggesthint Yahoo isearch';
            this._results._results.push(o);
        }
    },
    trimBlank: function(str){
        var re = /<.+?>/g;
        return str.replace(re, "");
    },
};

