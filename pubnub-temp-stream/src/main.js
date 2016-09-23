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
const PUBNUB_PUBLISH_KEY = "pub-c-2a6c86ab-d072-45ca-9da7-9f45cea76012";

import Pins from "pins";
import PubNub from "pubnub";

let backgroundSkin = new Skin({ fill: "white" });
let textStyle = new Style({ font:'bold 46px', color:'black' });
let MainContainer = Container.template($ => ({
	top: 0, bottom: 0, left: 0, right: 0,
	skin: backgroundSkin,
	contents: [
		Label($, {
					label.string = temperature + ' ˚F';
				}
	]
}));
					
class AppBehavior extends Behavior {
	onLaunch(application) {
		application.add(new MainContainer);
        Pins.configure({
		success => {
			if (success) {
				Pins.repeat("/tmpSensor/read", 500, temperature => {
					temperature = temperature.toFixed(3);
					application.distribute("onTemperatureChanged", temperature)
					pubnub.publish({
						channel: PUBNUB_CHANNEL,
						message: {
							temperature,
							time: (new Date).toString()
						},
						callback: (error, message) => {
					});	
				});
			} else {
				trace("Failed to configure pins\n");
			}
		});	
	}
	onQuit(application) {
		pubnub.stop();
	}
};
application.behavior = new AppBehavior();