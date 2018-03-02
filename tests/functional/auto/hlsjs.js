const assert = require('assert');
const webdriver = require('selenium-webdriver');
// requiring this automatically adds the chromedriver binary to the PATH
const chromedriver = require('chromedriver');
const HttpServer = require('http-server');
const streams = require('../../test-streams');

const Hls = window.Hls;
const onTravis = !!process.env.TRAVIS;
const browserConfig = {version : 'latest'};

HttpServer.createServer({
  showDir: false,
  autoIndex: false,
  root: './',
}).listen(8000, '127.0.0.1');

if (onTravis) {
  var UA_VERSION = process.env.UA_VERSION;
  if (UA_VERSION) {
    browserConfig.version = UA_VERSION;
  }
  var UA = process.env.UA;
  if (!UA) {
    throw new Error('No test browser name.');
  }
  var OS = process.env.OS;
  if (!OS) {
    throw new Error('No test browser platform.');
  }
  browserConfig.name = UA;
  browserConfig.platform = OS;
} else {
  browserConfig.name = 'chrome';
}
var browserDescription = browserConfig.name;
if (browserConfig.version) {
  browserDescription += ' ('+browserConfig.version+')';
}
if (browserConfig.platform) {
  browserDescription += ', '+browserConfig.platform;
}

let stream;
let video;
let logString;
let hls;

/**
 * @module
 * declares `logString` on global window
 */
(function() {
  var methods = ['log', 'debug', 'info', 'warn', 'error'];
  methods.forEach(function(methodName) {
    var original = console[methodName];
    if (!original) {
      return;
    }
    console[methodName] = function() {
      append(methodName, Array.prototype.slice.call(arguments).map(JSON.stringify).join(' '));
      return original.apply(this, arguments);
    };
  });

  var log = document.getElementById('log');
  var inner = log.getElementsByClassName('inner')[0];

  function append(methodName, msg) {
    var a = (new Date()).toISOString().replace('T', ' ').replace('Z', '')+': '+msg;
    var text = document.createTextNode(a);
    var line = document.createElement('pre');
    line.className = 'line line-'+methodName;
    line.appendChild(text);
    window.logString = logString += a + '\n';
    inner.appendChild(line);
  }
})();

function retry(cb, numAttempts, interval) {
  numAttempts = numAttempts || 20;
  interval = interval || 3000;
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    attempt();

    function attempt() {
      cb().then(function(res) {
        resolve(res);
      }).catch(function(e) {
        if (++attempts >= numAttempts) {
          // reject with the last error
          reject(e);
        } else {
          setTimeout(attempt, interval);
        }
      });
    }
  });
}

function switchToLowestLevel(mode) {
  switch(mode) {
  case 'current':
    hls.currentLevel = 0;
    break;
  case 'next':
    hls.nextLevel = 0;
    break;
  case 'load':
  default:
    hls.loadLevel = 0;
    break;
  }
}

function switchToHighestLevel(mode) {
  var highestLevel = hls.levels.length-1;
  switch(mode) {
  case 'current':
    hls.currentLevel = highestLevel;
    break;
  case 'next':
    hls.nextLevel = highestLevel;
    break;
  case 'load':
  default:
    hls.loadLevel = highestLevel;
    break;
  }
}

function startStream(streamUrl, config, callback) {
  if (Hls.isSupported()) {
    if (hls) {
      callback({code : 'hlsjsAlreadyInitialised', logs : logString});
      return;
    }
    window.video = video = document.getElementById('video');
    try {
      window.hls = hls = new Hls(Object.assign({}, config, {debug: true}));
      console.log(navigator.userAgent);
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play();
      });
      hls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          console.log('hlsjs fatal error :' + data.details);
          if (data.details === Hls.ErrorDetails.INTERNAL_EXCEPTION) {
            console.log('exception in :' + data.event);
            console.log(data.err.stack ? JSON.stringify(data.err.stack) : data.err.message);
          }
          callback({code : data.details, logs : logString});
        }
      });
      video.onerror = function(event) {
        console.log('video error, code :' + video.error.code);
        callback({code : 'video_error_' + video.error.code, logs : logString});
      };
    } catch(err) {
      callback({code : 'exception', logs : logString});
    }
  } else {
    callback({code : 'notSupported', logs : logString});
  }
}

describe('testing hls.js playback in the browser on "'+browserDescription+'"', function() {
  beforeEach(function() {
    video = window.video;
    logString = window.logString;
    hls = window.hls;

    var capabilities = {
      name: '"'+stream.description+'" on "'+browserDescription+'"',
      browserName: browserConfig.name,
      platform: browserConfig.platform,
      version: browserConfig.version,
      commandTimeout: 90,
    };
    if (onTravis) {
      capabilities['tunnel-identifier'] = process.env.TRAVIS_JOB_NUMBER;
      capabilities.build = 'HLSJS-'+process.env.TRAVIS_BUILD_NUMBER;
      capabilities.username = process.env.SAUCE_USERNAME;
      capabilities.accessKey = process.env.SAUCE_ACCESS_KEY;
      capabilities.avoidProxy = true;
      this.browser = new webdriver.Builder().usingServer('http://'+process.env.SAUCE_USERNAME+':'+process.env.SAUCE_ACCESS_KEY+'@ondemand.saucelabs.com:80/wd/hub');
    } else {
      this.browser = new webdriver.Builder();
    }
    this.browser = this.browser.withCapabilities(capabilities).build();
    this.browser.manage().timeouts().setScriptTimeout(75000);
    console.log('Retrieving web driver session...');
    return this.browser.getSession().then(function(session) {
      console.log('Web driver session id: '+session.getId());
      if (onTravis) {
        console.log('Job URL: https://saucelabs.com/jobs/'+session.getId());
      }
      return retry(function() {
        console.log('Loading test page...');
        return this.browser.get('http://127.0.0.1:8000/tests/functional/auto/hlsjs.html').then(function() {
          // ensure that the page has loaded and we haven't got an error page
          return this.browser.findElement(webdriver.By.css('body#hlsjs-functional-tests')).catch(function(e) {
            console.log('CSS not found');
            this.browser.getPageSource().then(function(source){
              console.log(source);
              return Promise.reject(e);
            });
          }.bind(this));
        }.bind(this));
      }.bind(this)).then(function() {
        console.log('Test page loaded.');
      });
    }.bind(this), function(err) {
      console.log('error while Retrieving browser session:' + err);
    });
  });

  afterEach(function() {
    var browser = this.browser;
    return browser.executeScript('return logString').then(function(return_value){
      console.log('travis_fold:start:debug_logs');
      console.log('logs');
      console.log(return_value);
      console.log('travis_fold:end:debug_logs');
      console.log('Quitting browser...');
      return browser.quit().then(function() {
        console.log('Browser quit.');
      });
    });
  });

  const testLoadedData = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          callback({code : 'loadeddata', logs : logString});
        };
      }, url ,config).then(function(result) {
        assert.strictEqual(result.code, 'loadeddata');
      });
    };
  };

  const testSmoothSwitch = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          switchToHighestLevel('next');
        };
        window.setTimeout(function() {
          callback({code : video.readyState, logs : logString});
        }, 12000);
      }, url ,config).then(function(result) {
        assert.strictEqual(result.code, 4);
      });
    };
  };

  const testSeekOnLive = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          window.setTimeout(function() {
            video.currentTime = video.duration - 5;
          }, 5000);
        };
        video.onseeked = function() {
          callback({code : 'seeked', logs : logString});
        };
      }, url ,config).then(function(result) {
        assert.strictEqual(result.code, 'seeked');
      });
    };
  };

  const testSeekOnVOD = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          window.setTimeout(function() {
            video.currentTime = video.duration - 5;
          }, 5000);
        };
        video.onended = function() {
          callback({code : 'ended', logs : logString});
        };
      }, url ,config).then(function(result) {
        assert.strictEqual(result.code, 'ended');
      });
    };
  };

  const testSeekEndVOD = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          window.setTimeout(function() {
            video.currentTime = video.duration;
          }, 5000);
        };
        video.onended = function() {
          callback({code : 'ended', logs : logString});
        };
      }, url ,config).then(function(result) {
        assert.strictEqual(result.code, 'ended');
      });
    };
  };

  const testIsPlayingVOD = function(url, config) {
    return function() {
      return this.browser.executeAsyncScript(function(url, config) {
        var callback = arguments[arguments.length - 1];
        startStream(url, config, callback);
        video.onloadeddata = function() {
          let expectedPlaying = !(video.paused || // not playing when video is paused
            video.ended  || // not playing when video is ended
            video.buffered.length === 0); // not playing if nothing buffered
          let currentTime = video.currentTime;
          if(expectedPlaying) {
            window.setTimeout(function() {
              console.log('video expected playing. [last currentTime/new currentTime]=[' + currentTime + '/' + video.currentTime + ']');
              callback({playing : currentTime !== video.currentTime});
            }, 5000);
          } else {
            console.log('video not playing. [paused/ended/buffered.length]=[' + video.paused + '/' + video.ended + '/' + video.buffered.length + ']');
            callback({playing : false});
          }
        };
      }, url ,config).then(function(result) {
        assert.strictEqual(result.playing, true);
      });
    };
  };

  for (var name in streams) {
    stream = streams[name];
    var url = stream.url;
    var config = stream.config || {};
    if (!stream.blacklist_ua || stream.blacklist_ua.indexOf(browserConfig.name) === -1) {
      it('should receive video loadeddata event for ' + stream.description, testLoadedData(url, config));
      if (stream.abr) {
        it('should "smooth switch" to highest level and still play(readyState === 4) after 12s for ' + stream.description, testSmoothSwitch(url, config));
      }

      if (stream.live) {
        it('should seek near the end and receive video seeked event for ' + stream.description, testSeekOnLive(url, config));
      } else {
        it('should play ' + stream.description, testIsPlayingVOD(url, config));
        it('should seek 5s from end and receive video ended event for ' + stream.description, testSeekOnVOD(url, config));
        //it('should seek on end and receive video ended event for ' + stream.description, testSeekEndVOD(url));
      }
    }
  }
});
