import {
RentMaikarPlugin
}
from "../pluginTypes";


export const EVBatteryPlugin:
RentMaikarPlugin={


id:"evBattery",

name:"EV Battery Telemetry",

enabled:false,


async initialize(){

console.log(
"EV battery monitoring enabled"
);

},


async deactivate(){

console.log(
"EV battery monitoring disabled"
);

},


async processEvent(event){

if(
event.type==="battery"
){

console.log(
"Battery telemetry",
event.payload
);

}

}

};
