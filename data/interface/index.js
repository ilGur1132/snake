var background = {
  "port": null,
  "message": {},
  "receive": function (id, callback) {
    if (id) {
      background.message[id] = callback;
    }
  },
  "connect": function (port) {
    chrome.runtime.onMessage.addListener(background.listener); 
    /*  */
    if (port) {
      background.port = port;
      background.port.onMessage.addListener(background.listener);
      background.port.onDisconnect.addListener(function () {
        background.port = null;
      });
    }
  },
  "send": function (id, data) {
    if (id) {
      if (context !== "webapp") {
        chrome.runtime.sendMessage({
          "method": id,
          "data": data,
          "path": "interface-to-background"
        }, function () {
          return chrome.runtime.lastError;
        });
      }
    }
  },
  "post": function (id, data) {
    if (id) {
      if (background.port) {
        background.port.postMessage({
          "method": id,
          "data": data,
          "port": background.port.name,
          "path": "interface-to-background"
        });
      }
    }
  },
  "listener": function (e) {
    if (e) {
      for (let id in background.message) {
        if (background.message[id]) {
          if ((typeof background.message[id]) === "function") {
            if (e.path === "background-to-interface") {
              if (e.method === id) {
                background.message[id](e.data);
              }
            }
          }
        }
      }
    }
  }
};

var config = {
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        config.game.methods.start(true);
        /*  */
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 500);
      }
    }
  },
  "load": function () {
    const theme = document.querySelector("#theme");
    const reset = document.querySelector("#reset");
    const reload = document.querySelector("#reload");
    const support = document.querySelector("#support");
    const donation = document.querySelector("#donation");
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    theme.addEventListener("click", function () {
      let attribute = document.documentElement.getAttribute("theme");
      attribute = attribute === "dark" ? "light" : "dark";
      /*  */
      document.documentElement.setAttribute("theme", attribute);
      config.storage.write("theme", attribute);
      config.game.methods.render(false, false, false);
    }, false);
    /*  */
    reset.addEventListener("click", function () {
      const action = window.confirm("Reset the app to factory settings?");
      if (action) {
        config.storage.clear(function () {
          document.location.reload();
        });
      }
    });
    /*  */
    config.storage.load(config.game.load);
    window.removeEventListener("load", config.load, false);
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "700px";
              document.documentElement.style.height = "500px";
            }
            /*  */
            background.connect(chrome.runtime.connect({"name": config.port.name}));
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "clear": function (callback) {
      chrome.storage.local.clear(function () {
        config.storage.local = {};
        if (callback) {
          callback();
        }
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "game": {
    "metrics": {
      "dx": 0,
      "dy": 0,
      "size": 0,
      "root": '',
      "tile": {},
      "speed": {},
      "score": 0,
      "theme": {},
      "snake": [],
      "action": {},
      "button": {},
      "details": {},
      "highest": {},
      "summary": {},
      "canvas": null,
      "content": null,
      "timeout": null,
      "context": null,
      "container": null,
      "food": {
        'x': 0,
        'y': 0
      },
      "is": {
        "changing": {
          "direction": false
        }
      }
    },
    "store": function (name, value, unit) {
      const key = name.split('-')[0];
      /*  */
      config.storage.write(name, value);
      config.game.metrics[key].value = value;
      config.game.metrics.root.style.setProperty("--" + name, value + unit);
      /*  */
      config.game.methods.start(true);
    },
    "load": function () {
      config.game.metrics.root = document.querySelector(":root");
      /*  */
      config.game.metrics.button.up = document.getElementById("button-up");
      config.game.metrics.button.left = document.getElementById("button-left");
      config.game.metrics.button.down = document.getElementById("button-down");
      config.game.metrics.button.right = document.getElementById("button-right");
      /*  */
      config.game.metrics.tile.element = document.getElementById("tile-size");
      config.game.metrics.speed.element = document.getElementById("speed-snake");
      config.game.metrics.theme.element = document.getElementById("theme-color");
      config.game.metrics.action.element = document.querySelector(".action span");
      config.game.metrics.highest.element = document.getElementById("highest-score");
      config.game.metrics.details.element = document.querySelector(".footer details");
      config.game.metrics.summary.element = document.querySelector(".footer details summary");
      /*  */
      config.game.metrics.tile.value = config.storage.read("tile-size") !== undefined ? config.storage.read("tile-size") : 20;
      config.game.metrics.speed.value = config.storage.read("speed-snake") !== undefined ? config.storage.read("speed-snake") : 10;
      config.game.metrics.highest.value = config.storage.read("highest-score") !== undefined ? config.storage.read("highest-score") : 0;
      config.game.metrics.theme.value = config.storage.read("theme-color") !== undefined ? config.storage.read("theme-color") : "#f17914";
      config.game.metrics.details.value = config.storage.read("details-state") !== undefined ? config.storage.read("details-state") : "close";
      /*  */
      config.game.metrics.tile.element.value = config.game.metrics.tile.value;
      config.game.metrics.speed.element.value = config.game.metrics.speed.value;
      config.game.metrics.theme.element.value = config.game.metrics.theme.value;
      config.game.metrics.highest.element.value = config.game.metrics.highest.value;
      config.game.metrics.root.style.setProperty("--theme-color", config.game.metrics.theme.value);
      config.game.metrics.root.style.setProperty("--tile-size", config.game.metrics.tile.value + "px");
      /*  */
      config.game.metrics.speed.element.addEventListener("input", function (e) {config.game.store("speed-snake", e.target.value)});
      config.game.metrics.tile.element.addEventListener("input", function (e) {config.game.store("tile-size", e.target.value, "px")});
      config.game.metrics.theme.element.addEventListener("input", function (e) {config.game.store("theme-color", e.target.value, '')});
      /*  */
      config.game.metrics.button.up.addEventListener("click", function (e) {config.game.methods.change.direction(e.target.dataset)});
      config.game.metrics.button.left.addEventListener("click", function (e) {config.game.methods.change.direction(e.target.dataset)});
      config.game.metrics.button.down.addEventListener("click", function (e) {config.game.methods.change.direction(e.target.dataset)});
      config.game.metrics.button.right.addEventListener("click", function (e) {config.game.methods.change.direction(e.target.dataset)});
      /*  */
      config.game.metrics.summary.element.addEventListener("click", function (e) {
        const state = e.target.closest("details").open ? "close" : "open";
        config.storage.write("details-state", state);
        /*  */
        config.game.methods.start(true);
      });
      /*  */
      config.game.metrics.action.element.addEventListener("click", function (e) {
        const play = e.target.textContent.toLowerCase() === "play";
        const pause = e.target.textContent.toLowerCase() === "pause";
        const reload = e.target.textContent.toLowerCase() === "reload";
        /*  */
        if (play) {
          e.target.textContent = "Pause";
          config.game.methods.render(false, true, true);
        } else if (pause) {
          e.target.textContent = "Play";
          window.clearTimeout(config.game.metrics.timeout);
        } else if (reload) {
          document.location.reload();
        } else {
          /*  */
        }
      });
      /*  */
      if (config.game.metrics.details.value === "open") {
        config.game.metrics.details.element.setAttribute("open", '');
      } else {
        config.game.metrics.details.element.removeAttribute("open");
      }
      /*  */
      const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
      document.documentElement.setAttribute("theme", theme !== undefined ? theme : "light");
      document.addEventListener("keydown", config.game.methods.change.direction);
      /*  */
      config.game.methods.start(true);
    },
    "methods": {
      "clear": {
        "board": function () {
          config.game.metrics.html.removeAttribute("ended");
          /*  */
          config.game.metrics.context.beginPath();
          config.game.metrics.context.clearRect(0, 0, config.game.metrics.canvas.width, config.game.metrics.canvas.height);
        }
      },
      "generate": {
        "random": {
          "food": function (min, max) {
            let rand = Math.round((Math.random() * (max - min) + min) / config.game.metrics.size) * config.game.metrics.size;
            rand = rand - (rand % config.game.metrics.size);
            /*  */
            return rand;
          }
        }
      },
      "render": function (food, snake, action) {
        config.game.methods.clear.board();
        config.game.methods.draw.board();
        /*  */
        if (food) config.game.methods.move.food();
        if (snake) config.game.methods.move.snake();
        /*  */
        config.game.methods.draw.food();
        config.game.methods.draw.snake();
        /*  */ 
        if (action) config.game.methods.action();
      },
      "action": function () {
        config.game.metrics.is.changing.direction = false;
        const ended = config.game.methods.has.game.ended();
        /*  */
        if (ended) {
          config.game.methods.draw.board();
          config.game.methods.draw.food();
          config.game.methods.draw.snake();
          config.game.metrics.html.setAttribute("ended", '');
          config.game.metrics.action.element.textContent = "Reload";
        } else {
          const millisecond = 1000 / parseInt(config.game.metrics.speed.value);
          /*  */
          if (config.game.metrics.timeout) window.clearTimeout(config.game.metrics.timeout);
          config.game.metrics.timeout = window.setTimeout(function () {
            config.game.methods.render(false, true, true);
          }, millisecond);
        }
      },
      "has": {
        "eaten": {
          "food": false,
        },
        "game": {
          "ended": function () {
            for (let i = 4; i < config.game.metrics.snake.length; i++) {
              const cond_1 = config.game.metrics.snake[i].x === config.game.metrics.snake[0].x;
              const cond_2 = config.game.metrics.snake[i].y === config.game.metrics.snake[0].y;
              /*  */
              if (cond_1 && cond_2) {
                return true;
              }
            }
            /*  */
            let hit = {
              "wall": {
                "top": false,
                "left": false,
                "right": false,
                "bottom": false
              }
            };
            /*  */
            hit.wall.top = config.game.metrics.snake[0].y < 0;
            hit.wall.left = config.game.metrics.snake[0].x < 0;
            hit.wall.right = config.game.metrics.snake[0].x > (config.game.metrics.canvas.width - config.game.metrics.size);
            hit.wall.bottom = config.game.metrics.snake[0].y > (config.game.metrics.canvas.height - config.game.metrics.size);
            /*  */
            return hit.wall.left || hit.wall.right || hit.wall.top || hit.wall.bottom;
          }
        }
      },
      "draw": {
        "snake": function () {
          config.game.metrics.snake.forEach(config.game.methods.draw.part);
        },
        "food": function (color) {
          const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
          /*  */
          config.game.metrics.context.fillStyle = color ? color : (theme === "light" ? "#555555" : "#cdcdcd");
          config.game.metrics.context.strokeStyle = color ? color : (theme === "light" ? "#555555" : "#454545");
          config.game.metrics.context.fillRect(config.game.metrics.food.x, config.game.metrics.food.y, config.game.metrics.size, config.game.metrics.size);
          config.game.metrics.context.strokeRect(config.game.metrics.food.x, config.game.metrics.food.y, config.game.metrics.size, config.game.metrics.size);
        },
        "part": function (e) {
          config.game.metrics.context.fillStyle = config.game.metrics.theme.value;
          config.game.metrics.context.strokeStyle = config.game.metrics.theme.value;
          config.game.metrics.context.fillRect(e.x, e.y, config.game.metrics.size, config.game.metrics.size);
          config.game.metrics.context.strokeRect(e.x, e.y, config.game.metrics.size, config.game.metrics.size);
        },
        "board": function (color) {
          const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
          /*  */
          config.game.metrics.context.fillStyle = theme === "light" ? "#ffffff" : "#000000";
          config.game.metrics.context.fillRect(0, 0, config.game.metrics.canvas.width, config.game.metrics.canvas.height);
          /*  */
          for (let x = 0; x <= config.game.metrics.canvas.width; x += config.game.metrics.size) {
            config.game.metrics.context.moveTo(x, 0);
            config.game.metrics.context.lineTo(x, config.game.metrics.canvas.height + 0);
          }
          /*  */
          for (let y = 0; y <= config.game.metrics.canvas.height; y += config.game.metrics.size) {
            config.game.metrics.context.moveTo(0, y);
            config.game.metrics.context.lineTo(config.game.metrics.canvas.width + 0, y);
          }
          /*  */
          config.game.metrics.context.strokeStyle = color ? color : (theme === "light" ? "whitesmoke" : "#454545");
          config.game.metrics.context.stroke();
        }
      },
      "start": async function (food) {
        let width = {};
        let height = {};
        let loading = document.documentElement.getAttribute("loading");
        /*  */
        if (loading !== null) return;
        /*  */
        document.documentElement.setAttribute("loading", '');
        await new Promise(resolve => window.setTimeout(resolve, 300));
        document.documentElement.removeAttribute("loading");
        /*  */
        config.game.metrics.html = document.documentElement;
        config.game.metrics.container = document.querySelector(".container");
        config.game.metrics.content = config.game.metrics.container.querySelector(".content");
        const computed = window.getComputedStyle(config.game.metrics.content);
        /*  */
        config.game.metrics.canvas = config.game.metrics.content.querySelector("canvas");
        config.game.metrics.size = parseInt(config.game.metrics.tile.value);
        /*  */
        height.full = parseInt(computed.height);
        width.full = parseInt(computed.width);
        height.half = height.full / 2;
        width.half = width.full / 2;
        /*  */
        width.full = width.full - (width.full % config.game.metrics.size);
        width.half = width.half - (width.half % config.game.metrics.size);
        height.full = height.full - (height.full % config.game.metrics.size);
        height.half = height.half - (height.half % config.game.metrics.size);
        /*  */
        config.game.metrics.is.changing.direction = false;
        config.game.metrics.dx = config.game.metrics.size;
        config.game.metrics.canvas.height = height.full;
        config.game.metrics.canvas.width = width.full;
        config.game.metrics.score = 0;
        config.game.metrics.dy = 0;
        /*  */
        config.game.metrics.context = config.game.metrics.canvas.getContext("2d");
        config.game.metrics.context.scale(devicePixelRatio, devicePixelRatio);
        config.game.metrics.snake = [
          {'x': width.half + 2 * config.game.metrics.size, 'y': height.half},
          {'x': width.half + 1 * config.game.metrics.size, 'y': height.half},
          {'x': width.half + 0 * config.game.metrics.size, 'y': height.half},
          {'x': width.half - 1 * config.game.metrics.size, 'y': height.half},
          {'x': width.half - 2 * config.game.metrics.size, 'y': height.half}
        ];
        /*  */
        config.game.methods.render(food, false, false);
      },
      "move": {
        "food": function () {
          config.game.metrics.food.x = config.game.methods.generate.random.food(config.game.metrics.size, config.game.metrics.canvas.width - 2 * config.game.metrics.size);
          config.game.metrics.food.y = config.game.methods.generate.random.food(config.game.metrics.size, config.game.metrics.canvas.height - 2 * config.game.metrics.size);
          /*  */
          config.game.metrics.snake.forEach(function (e) {
            const cond_1 = e.x === config.game.metrics.food.x;
            const cond_2 = e.y === config.game.metrics.food.y;
            /*  */
            if (cond_1 && cond_2) {
              config.game.methods.move.food();
            }
          });
        },
        "snake": function () { 
          let target = {};
          /*  */
          target.current = document.getElementById("current-score");
          target.highest = document.getElementById("highest-score");
          target.head = {
            'x': config.game.metrics.snake[0].x + config.game.metrics.dx,
            'y': config.game.metrics.snake[0].y + config.game.metrics.dy
          };
          /*  */
          config.game.metrics.snake.unshift(target.head);
          /*  */
          const cond_1 = config.game.metrics.snake[0].x === config.game.metrics.food.x;
          const cond_2 = config.game.metrics.snake[0].y === config.game.metrics.food.y;
          /*  */
          config.game.methods.has.eaten.food = cond_1 && cond_2;
          /*  */
          if (config.game.methods.has.eaten.food) {
            const bonus = Math.ceil(parseInt(config.game.metrics.speed.value) / 10);
            config.game.metrics.score = config.game.metrics.score + 1 * bonus;
            /*  */
            target.current.value = config.game.metrics.score;
            target.highest.value = parseInt(target.highest.value) < parseInt(target.current.value) ? target.current.value : target.highest.value;
            config.game.metrics.summary.element.textContent = "Controls (" + target.current.value + ':' + target.highest.value + ')';
            config.storage.write("highest-score", target.highest.value);
            /*  */
            config.game.methods.move.food();
          } else {
            config.game.metrics.snake.pop();
          }
        }
      },
      "change": {
        "direction": function (e) {
          const UPKEY = 38;
          const LEFTKEY = 37;
          const DOWNKEY = 40;
          const RIGHTKEY = 39;
          const SPACEKEY = 32;
          const KEYCODE = Number(e.keyCode);
          /*  */
          if (KEYCODE === SPACEKEY) {
            if (e.preventDefault) e.preventDefault();
            config.game.metrics.action.element.click();
          }
          /*  */
          if (config.game.metrics.is.changing.direction) return;
          config.game.metrics.is.changing.direction = true;
          /*  */
          const DOWN = config.game.metrics.dy === config.game.metrics.size;
          const RIGHT = config.game.metrics.dx === config.game.metrics.size;
          const UP = config.game.metrics.dy === -1 * config.game.metrics.size;
          const LEFT = config.game.metrics.dx === -1 * config.game.metrics.size;
          /*  */
          if (KEYCODE === LEFTKEY && !RIGHT) {
            config.game.metrics.dy = 0;
            config.game.metrics.dx = -1 * config.game.metrics.size;
            if (e.preventDefault) e.preventDefault();
          }
          /*  */
          if (KEYCODE === UPKEY && !DOWN) {
            config.game.metrics.dx = 0;
            config.game.metrics.dy = -1 * config.game.metrics.size;
            if (e.preventDefault) e.preventDefault();
          }
          /*  */
          if (KEYCODE === RIGHTKEY && !LEFT) {
            config.game.metrics.dy = 0;
            config.game.metrics.dx = config.game.metrics.size;
            if (e.preventDefault) e.preventDefault();
          }
          /*  */
          if (KEYCODE === DOWNKEY && !UP) {
            config.game.metrics.dx = 0;
            config.game.metrics.dy = config.game.metrics.size;
            if (e.preventDefault) e.preventDefault();
          }
        }
      }
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
