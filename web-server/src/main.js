/*
 *     Copyright (C) 2010-2016 Marvell International Ltd.
 *     Copyright (C) 2002-2010 Kinoma, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */
import SCROLLER from 'mobile/scroller';
import CONTROL from 'mobile/control';

/* Skins, styles, and textures */
var serverLogSkin = new Skin({ fill: '#6cb535' });
var toolsTexture = new Texture('./assets/tools.png', 1);
var toolsSkin = new Skin({ texture: toolsTexture, width: 32, height: 32, states: 32 });
var whiteSkin = new Skin({ fill: 'white' });
var serverLogLineStyle = new Style({ color: 'black', font: '20px', horizontal: 'left' });
var serverInfoStyle = new Style({ color: 'black', font: 'bold 24px', horizontal: 'center', vertical: 'middle', top: 1, bottom: 1 });
var serverLogHeaderStyle = new Style({ color: 'white', font: '20px', horizontal: 'left', vertical: 'middle', left: 10, lines: 1 });

/* UI templates */
var ServerLogHeader = Column.template($ => ({ 
	left: 0, right: 0, top: 0, style: serverInfoStyle, 
	contents: [
		Label($, { left: 0, right: 0, string: 'KPR HTTP Server:' }),
		Label($, { 
			left: 0, right: 0, string: '(IP address unknown)',
			Behavior: class extends Behavior {
				onDisplaying(container) {
					new Message("xkpr://wifi/status").invoke(Message.JSON).then(json => {
						if (json && ("ip_address" in json)) {
							container.string = model.server = 'http://' + json.ip_address + ':' + application.serverPort + '/';
							log("Server started");
						}
					})
				}
			} 
		}),
		Content($, { height: 2 }),
		Label($, { left: 0, right: 0, height: 24, skin: serverLogSkin, style: serverLogHeaderStyle, string: 'Log' }),
		Content($, { height: 2 }),
	], 
}));

var ServerLogLine = Label.template($ => ({ left: 0, height: 20, string: $ }));

var ExitButton = Container.template($ => ({ 
	left: 0, top: 0, active: true, 
	Behavior: class extends CONTROL.ButtonBehavior {
		onTap(container) {
			new Message("xkpr://shell/close?id=" + application.id).invoke();
		}
	}, 
	contents: [
		Content($, { skin: toolsSkin }),
	]
}));

var MainContainer = Container.template($ => ({ 
	left: 0, right: 0, top: 0, bottom: 0, skin: whiteSkin, 
	contents: [
		ServerLogHeader($, { height: 80 }),
		SCROLLER.VerticalScroller($, { 
			left: 4, right: 4, top: 80, bottom: 0, clip: true, 
			contents: [
				SCROLLER.HorizontalScroller($, { 
					left: 0, right: 0, top: 0, bottom: undefined, 
					contents: [
						Column($, { 
							left: 0, top: 0, style: serverLogLineStyle, 
							Behavior: class extends Behavior {
								onLogText(column, string) {
									var line = new ServerLogLine(string);
									column.add(line);
									column.container.container.scrollTo(0, 0x7FFFF);
								}
								onLogTextColorChange(column, color) {
									column.style = new Style({font: column.style.font, align: column.style.horizontalAlignment, color: color});
								}
							}
						}),
						SCROLLER.HorizontalScrollbar($, { 
							Behavior: class extends SCROLLER.HorizontalScrollbarBehavior {
								onScrolled(scrollbar) {
									super.onScrolled(scrollbar);
									var container = scrollbar.container.container;
									scrollbar.y = container.y + container.height - scrollbar.height;
								}
							} 
						}),
					]
			}),
			SCROLLER.VerticalScrollbar($, { }),
		], }),
		ExitButton($, { }),
	] 
}));

/* Application set-up */
class ApplicationBehavior extends Behavior {
	onInvoke(application, message) {
		var path = message.path;
		var scheme = message.scheme.toLowerCase();
		var method = message.method.toLowerCase();
		
		var action;
		if (scheme in this.sitemap) {
			var schemeHandlers = this.sitemap[scheme];
			if (method in schemeHandlers) {
				var methodHandlers = schemeHandlers[method];
				if (path in methodHandlers.item) {
					action = methodHandlers.item[path].action;
				}
			}
		}
		if (!action)
			action = "doDefaultAction";
		application.delegate(action, message);
		log(message.method.toUpperCase() + " " + path + " " + message.status);
	}
	doIndexAction(application, message) {
		message.status = 200;
        message.responseText = Files.readText(mergeURI(application.url, this.root + "/index.html")).replace(/\[SERVER\]/g, this.server);
        message.setResponseHeader("Content-Type", "text/html");
	}
	doConfigureAction(application, message) {
		message.status = 200;
        message.responseText = Files.readText(mergeURI(application.url, this.root + "/configure.html")).replace(/\[URL\]/g, this.server + "log");
        message.setResponseHeader("Content-Type", "text/html");
	}
	doCustomAction(application, message) {
		message.status = 200;
        message.responseText = Files.readText(mergeURI(application.url, this.root + "/custom.html")).replace(/\[URL\]/g, this.server + "create");
        message.setResponseHeader("Content-Type", "text/html");
	}
	doCreateAction(application, message) {
		message.status = 200;
		var query = parseQuery(message.query);
        var html = Files.readText(mergeURI(application.url, this.root + "/create.html")).replace(/\[NAME\]/g, query.name);
        message.responseText = html;
        message.setResponseHeader("Content-Type", "text/html");
	}
	doLogAction(application, message) {
		message.status = 200;
        var query = parseQuery(message.requestText);
        application.distribute("onLogTextColorChange", query.color);
	}
	doDefaultAction(application, message) {
		var path = message.path;
			var uri = mergeURI(application.url, this.root + path);
			if (Files.exists(uri)) {
                message.status = 200;
                var mime = this.pathToMIME(path);
				message.setResponseHeader("Content-Type", mime);
                if (0 == mime.indexOf("text/"))
					message.responseText = Files.readText(uri);
				else {
					message.responseBuffer = Files.readBuffer(uri);
            		message.setResponseHeader("Content-Length", message.responseBuffer.length);
				}
			}
			else {
                message.status = 404;
                var html = Files.readText(mergeURI(application.url, this.root + "/error.html")).replace(/\[SERVER\]/g, this.server);
                message.responseText = html;
                message.setResponseHeader("Content-Type", "text/html");
			}
	}
	getExtension(path) {
		var extension = "";
			try {
				var dot = path.lastIndexOf(".");
				if (dot > 0)
					extension = path.slice(dot + 1).toLowerCase();
			}
			catch(e) {
			}
			return extension;
	}
	pathToMIME(path) {
		var extension = this.getExtension(path);
			switch(extension) {
				case 'htm':
				case 'html':
					return "text/html";
				case 'png':
					return "image/png";
				case 'jpg':
				case 'jpeg':
					return "image/jpeg";
				default:
					return "application/octet-stream";
			}
	}
	onLaunch(application) {
		model.root = "httpdocs";
		model.server = "";

		application.shared = true;	// enable server

		var data = {};
		application.add(new MainContainer(data));

		model.sitemap = {
			http: {
				get: {
					item: {
						"/": { action: "doIndexAction" },
						"/configure": { action: "doConfigureAction" },
						"/custom": { action: "doCustomAction" },
						"/create": { action: "doCreateAction" },
					},
				},
				post: {
					item: {
						"/log": { action: "doLogAction" },
					},
				}
			}
		};
	}
}
var model = application.behavior = new ApplicationBehavior();

	 	
var log = function(string) {
    var d = new Date();
    var line = '[' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString() + '] ' + string;
	application.distribute("onLogText", line);
}