// click the presented history links can directly
// jump to that page in a new tab.
// Event listner for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  var popupDiv = document.getElementById(divName);

  var ul = document.createElement('ul');
  popupDiv.appendChild(ul);

  for (var i = 0, ie = data.length; i < ie; ++i) {
    var a = document.createElement('a');
    a.href = data[i];
    a.appendChild(document.createTextNode(data[i]));
    a.addEventListener('click', onAnchorClick);

    var li = document.createElement('li');
    li.appendChild(a);
    ul.appendChild(li);
  }

}

// Search history according to requirements,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7 * 31 * 12;
  var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;

  //map visitId to url
  var visitIdUrl = {};
  var stringPopArray = [];
  var nodes = [];

  chrome.history.search({
      'text': 'ucsd.edu',              // Return every history item....
      'startTime': oneWeekAgo  // that was accessed less than one week ago.
    },
    function(historyItems) {
      // For each history item, get details on all visits.
      // get the detailed map
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var processVisitsWithUrl = function(url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            processVisits(url, visitItems);
          };
        };
        chrome.history.getVisits({url: url}, processVisitsWithUrl(url));
      }

      //iterate again to get corresponding "from" and "to"
      for(var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var outputReferring = function(url) {
          return function(visitItems) {
            searchReferring(url, visitItems);
          };
        };
        chrome.history.getVisits({url:url}, outputReferring(url));
        numRequestsOutstanding++;
      }

      // output
      // buildPopupDom(divName, stringPopArray.slice(0, 25));

      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    });

  // search referring visit id
  var searchReferring = function(url, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {

      // present from and to
      var o = {'type':visitItems[i].transition,
        "from":visitIdUrl[visitItems[i].referringVisitId],
        "to":url};
      o.toString = function printItem(){
          return "From:"+this.from+"\nTo:"+this.to+"\n\n";
        }
      stringPopArray.push(o);
      
      nodes.push(parseURL(visitIdUrl[visitItems[i].referringVisitId]));
      nodes.push(parseURL(url));
    }
    // make sure all is processed (else would be undefined, parallal operations)
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };


  // Maps URLs to a count of the number of times the user typed that URL into
  // the omnibox.
  var urlToCount = {};

  // Callback for chrome.history.getVisits().  Counts the number of
  // times a user visited a URL by typing the address.
  var processVisits = function(url, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {
      // most of them are undefined, should not output here.
      if (!visitIdUrl[visitItems[i].visitId]) {
        visitIdUrl[visitItems[i].visitId] = "";
      }
      visitIdUrl[visitItems[i].visitId] = url;
      if (!urlToCount[url]) {
        urlToCount[url] = 0;
      }
      urlToCount[url]++;
    }
  };

  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    // buildPopupDom(divName, stringPopArray.slice(0, 25));
    
    // output to json file
    var array = nodes;
    window.res = array;
    var filename = "history.json";
    var text;

    // json format output
    append("[");
    for(var i=0; i<array.length;i++) {
      text = JSON.stringify(array[i]);
      if(i !== array.length-1) text = text+',';
      append(text);
    }
    append("]");

    //browser window object download
    window.blob = new Blob([data.innerText],{type: 'application/octet-binary'});
    window.url = URL.createObjectURL(blob);
    var pom = document.createElement('a');
    pom.setAttribute('href', url);
    pom.setAttribute('download', filename);
    pom.click();

    // window.close();
  };
}

var append = function(text) {
  data.appendChild(document.createTextNode(text));
}

var download = function(format) {
  document.getElementById('json').innerText = "preparing file...";
  buildTypedUrlList("typedUrl_div");
  document.getElementById('json').innerText = "Done";
}

var parseURL = function(url) {
    var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, '').split('&');
    for( i = 0; i < queries.length; i++ ) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject: searchObject,
        hash: parser.hash
    };
}

document.addEventListener('DOMContentLoaded', function () {
  window.data = document.getElementById('data');
  document.getElementById('json').onclick = function(){
    download('json');
  };
  console.log(parseURL("http://ucsd.edu/campus-life/index.html"));
});